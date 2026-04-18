import { ref, reactive } from 'vue';
import { describe, test, expect, beforeEach, vi } from 'vitest';

const mockBlocks = reactive([]);

// --- Mocks ---

const mockCustomVizes = reactive({});
const mockLoadVizes = vi.fn();
const mockReplaceBlocks = vi.fn();
const mockRenameActiveSheet = vi.fn();

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ blocks: mockBlocks, replaceBlocks: mockReplaceBlocks })
}));

vi.mock('@/features/block/visualize', () => ({
    useCustomViz: () => ({
        customVizes: mockCustomVizes,
        loadVizes: mockLoadVizes
    })
}));

vi.mock('@/entities/sheet', () => ({
    useSheetStore: () => ({
        activeSheetName: ref('Test'),
        renameActiveSheet: mockRenameActiveSheet
    })
}));

const { useFileIO } = await import('./useFileIO');

// --- Helpers ---

function mockFile(text) {
    return { text: async () => text };
}

function validJson(overrides = {}) {
    return JSON.stringify({
        version: 1,
        name: 'Imported Sheet',
        blocks: [],
        customVizes: {},
        ...overrides
    });
}

beforeEach(() => {
    for (const key of Object.keys(mockCustomVizes)) { delete mockCustomVizes[key]; }
    mockReplaceBlocks.mockClear();
    mockLoadVizes.mockClear();
    mockRenameActiveSheet.mockClear();
    // Reset pendingImport between tests
    useFileIO().cancelImport();
});

// --- Tests ---

describe('prepareImport — read/parse failures', () => {
    test('returns error when file.text() rejects', async () => {
        const file = { text: async () => { throw new Error('disk error'); } };
        const { prepareImport } = useFileIO();
        const result = await prepareImport(file);
        expect(result.error).toBeTruthy();
    });

    test('returns error for invalid JSON', async () => {
        const { prepareImport } = useFileIO();
        const result = await prepareImport(mockFile('not json {{{'));
        expect(result.error).toBeTruthy();
    });

    test('returns error when version field is missing', async () => {
        const { prepareImport } = useFileIO();
        const result = await prepareImport(mockFile(JSON.stringify({ blocks: [] })));
        expect(result.error).toBeTruthy();
    });

    test('returns error when file version is newer than current', async () => {
        const { prepareImport } = useFileIO();
        const result = await prepareImport(mockFile(JSON.stringify({ version: 999, blocks: [] })));
        expect(result.error).toBeTruthy();
    });
});

describe('prepareImport — valid file', () => {
    test('returns { pending: true } for a valid file', async () => {
        const { prepareImport } = useFileIO();
        const result = await prepareImport(mockFile(validJson()));
        expect(result).toEqual({ pending: true });
    });

    test('sets pendingImport with the correct block count', async () => {
        const { prepareImport, pendingImport } = useFileIO();
        const json = validJson({
            blocks: [
                { id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2 },
                { id: '2', name: 'b', x: 0, y: 0, width: 2, height: 2 }
            ]
        });
        await prepareImport(mockFile(json));
        expect(pendingImport.value.summary.blockCount).toBe(2);
    });

    test('sets pendingImport.summary.name from the file', async () => {
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(validJson({ name: 'My Project' })));
        expect(pendingImport.value.summary.name).toBe('My Project');
    });
});

describe('prepareImport — viz conflict resolution', () => {
    test('no conflict when the imported viz name is not in the current sheet', async () => {
        // mockCustomVizes is empty — no existing viz with this name
        const json = validJson({
            customVizes: { brandNew: { source: { template: '<div/>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(json));
        expect(pendingImport.value.summary.renamedVizes).toEqual({});
        expect(Object.keys(pendingImport.value.data.vizes)).toContain('brandNew');
    });

    // NOTE: the conflict check uses reference equality (existing.source !== vizData.source).
    // After a JSON round-trip the imported source is always a new object, so any same-named
    // viz in the store is treated as a conflict even if the content is identical.
    // This is a known limitation — "same source, no rename" requires identical object refs.

    test('renames imported viz when name conflicts with different source', async () => {
        mockCustomVizes['myViz'] = { source: { template: '<div>A</div>', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: '<div>B</div>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(json));
        expect(pendingImport.value.summary.renamedVizes).toEqual({ myViz: 'myViz-1' });
        expect(Object.keys(pendingImport.value.data.vizes)).toContain('myViz-1');
        expect(Object.keys(pendingImport.value.data.vizes)).not.toContain('myViz');
    });

    test('increments counter until a free name is found', async () => {
        mockCustomVizes['myViz'] = { source: { template: '<div>A</div>', script: '', style: '' } };
        // 'myViz-1' also exists in the existing vizes
        mockCustomVizes['myViz-1'] = { source: { template: '<div>C</div>', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: '<div>B</div>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(json));
        expect(pendingImport.value.summary.renamedVizes['myViz']).toBe('myViz-2');
    });

    test('updates block vizOptions to point at the renamed viz', async () => {
        mockCustomVizes['myViz'] = { source: { template: '<div>A</div>', script: '', style: '' } };
        const json = validJson({
            blocks: [{
                id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2,
                visualizationType: 'custom',
                vizOptions: { customVizName: 'myViz' }
            }],
            customVizes: { myViz: { source: { template: '<div>B</div>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(json));
        expect(pendingImport.value.data.blocks[0].vizOptions.customVizName).toBe('myViz-1');
    });

    test('does not modify block vizOptions when the viz name had no conflict', async () => {
        // The viz name does not exist in mockCustomVizes, so no rename occurs
        const json = validJson({
            blocks: [{
                id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2,
                visualizationType: 'custom',
                vizOptions: { customVizName: 'freshViz' }
            }],
            customVizes: { freshViz: { source: { template: '<div/>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(json));
        expect(pendingImport.value.data.blocks[0].vizOptions.customVizName).toBe('freshViz');
    });
});

describe('cancelImport', () => {
    test('clears pendingImport', async () => {
        const { prepareImport, cancelImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(validJson()));
        expect(pendingImport.value).not.toBeNull();
        cancelImport();
        expect(pendingImport.value).toBeNull();
    });
});
