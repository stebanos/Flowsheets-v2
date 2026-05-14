import { reactive, ref } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockBlocks = reactive([]);
const mockReadSheetData = vi.fn();

// --- Mocks ---

const mockCustomVizes = reactive({});
const mockLoadVizes = vi.fn();
const mockReplaceBlocks = vi.fn();
const mockRenameActiveSheet = vi.fn();
const mockCreateSheet = vi.fn(() => 'sheet:local/new');
const mockInitNewSheet = vi.fn();

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ blocks: mockBlocks, replaceBlocks: mockReplaceBlocks })
}));

vi.mock('@/features/block/visualize', () => ({
    useCustomViz: () => ({
        customVizes: mockCustomVizes,
        loadVizes: mockLoadVizes
    })
}));

const mockSheets = reactive([]);
const mockActiveSheetId = ref(null);

vi.mock('@/entities/sheet', () => ({
    useSheetStore: () => ({
        activeSheetName: ref('Test'),
        renameActiveSheet: mockRenameActiveSheet,
        sheets: mockSheets,
        activeSheetId: mockActiveSheetId,
        setActiveSheet: vi.fn(),
        createSheet: mockCreateSheet
    })
}));

vi.mock('@/features/sheet/storage', () => ({
    useSheetStorage: () => ({
        readSheetData: mockReadSheetData,
        writeSheetData: vi.fn(),
        switchSheet: vi.fn(),
        initNewSheet: mockInitNewSheet,
        persistDeleteSheet: vi.fn()
    })
}));

vi.mock('./useBundleImport', () => ({
    useBundleImport: () => ({
        bundleImportState: ref({ pending: false, entries: [] }),
        prepareBundleImport: vi.fn(),
        confirmBundleImport: vi.fn(),
        cancelBundleImport: vi.fn()
    })
}));

const mockLibrary = reactive({});
const mockSaveLibraryEntry = vi.fn(async (name, source) => { mockLibrary[name] = { hash: null, source }; });

vi.mock('@/entities/viz', () => ({
    useVizLibrary: () => ({
        library: mockLibrary,
        saveLibraryEntry: mockSaveLibraryEntry
    })
}));

// Mock getHash to return a deterministic hash based on template content
vi.mock('@/shared/lib/hash', () => ({
    getHash: async (source) => `hash:${source?.template ?? ''}`
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
    for (const key of Object.keys(mockLibrary)) { delete mockLibrary[key]; }
    mockSheets.splice(0);
    mockActiveSheetId.value = null;
    mockReplaceBlocks.mockClear();
    mockLoadVizes.mockClear();
    mockSaveLibraryEntry.mockClear();
    mockRenameActiveSheet.mockClear();
    mockCreateSheet.mockClear();
    mockInitNewSheet.mockClear();
    mockReadSheetData.mockClear();
    // Reset pendingImport between tests
    const io = useFileIO();
    io.cancelImport();
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
    test('returns { pending: true } for a valid file with no conflicts', async () => {
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

describe('prepareImport — viz conflict resolution (three-case model)', () => {
    test('case C: viz name unknown — added to silent vizes, no conflict', async () => {
        const json = validJson({
            customVizes: { brandNew: { source: { template: '<div/>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        const result = await prepareImport(mockFile(json));
        expect(result).toEqual({ pending: true });
        expect(pendingImport.value.conflicts).toHaveLength(0);
        expect(Object.keys(pendingImport.value.data.vizes)).toContain('brandNew');
    });

    test('case A: name in library and hash matches — silent, no conflict', async () => {
        // hash computed as hash:<template> per mock
        mockLibrary['myViz'] = { hash: 'hash:<div>A</div>', source: { template: '<div>A</div>', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { hash: 'hash:<div>A</div>', source: { template: '<div>A</div>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        const result = await prepareImport(mockFile(json));
        expect(result).toEqual({ pending: true });
        expect(pendingImport.value.conflicts).toHaveLength(0);
        expect(Object.keys(pendingImport.value.data.vizes)).toContain('myViz');
    });

    test('case B: name in library with different hash — creates conflict entry', async () => {
        mockLibrary['myViz'] = { hash: 'hash:<div>A</div>', source: { template: '<div>A</div>', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: '<div>B</div>', script: '', style: '' } } }
        });
        const { prepareImport, pendingImport } = useFileIO();
        const result = await prepareImport(mockFile(json));
        expect(result).toEqual({ pending: true, conflicts: true });
        expect(pendingImport.value.conflicts).toHaveLength(1);
        expect(pendingImport.value.conflicts[0].importedName).toBe('myViz');
        expect(pendingImport.value.conflicts[0].systemEntry.hash).toBe('hash:<div>A</div>');
        expect(pendingImport.value.conflicts[0].importedEntry.hash).toBe('hash:<div>B</div>');
    });

    test('does not modify block vizOptions when the viz name had no conflict', async () => {
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

    test('clears conflictResolutions', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, cancelImport, resolveConflict, conflictResolutions } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'use-system' });
        expect(Object.keys(conflictResolutions.value)).toHaveLength(1);
        cancelImport();
        expect(Object.keys(conflictResolutions.value)).toHaveLength(0);
    });
});

describe('exportSheet', () => {
    beforeEach(() => {
        global.URL.createObjectURL = vi.fn(() => 'blob:mock');
        global.URL.revokeObjectURL = vi.fn();
    });

    test('calls readSheetData with the provided sheetId', async () => {
        mockReadSheetData.mockResolvedValueOnce({ blocks: [], customVizes: {} });
        const { exportSheet } = useFileIO();
        await exportSheet('sheet:local/abc');
        expect(mockReadSheetData).toHaveBeenCalledWith('sheet:local/abc');
    });

    test('does not call readSheetData when called without sheetId', async () => {
        const { exportSheet } = useFileIO();
        await exportSheet();
        expect(mockReadSheetData).not.toHaveBeenCalled();
    });
});

describe('confirmImport', () => {
    test('is a no-op when there is no pending import', async () => {
        const { confirmImport } = useFileIO();
        await confirmImport();
        expect(mockCreateSheet).not.toHaveBeenCalled();
        expect(mockReplaceBlocks).not.toHaveBeenCalled();
        expect(mockLoadVizes).not.toHaveBeenCalled();
    });

    test('creates a new sheet with the imported name', async () => {
        const { prepareImport, confirmImport } = useFileIO();
        await prepareImport(mockFile(validJson({ name: 'My Project' })));
        await confirmImport();
        expect(mockCreateSheet).toHaveBeenCalledWith('My Project');
    });

    test('initialises the new sheet with the returned id and name', async () => {
        const { prepareImport, confirmImport } = useFileIO();
        await prepareImport(mockFile(validJson({ name: 'My Project' })));
        await confirmImport();
        expect(mockInitNewSheet).toHaveBeenCalledWith('sheet:local/new', 'My Project');
    });

    test('calls replaceBlocks with the imported blocks', async () => {
        const blocks = [
            { id: '1', name: 'a', x: 0, y: 0, width: 150, height: 160 },
            { id: '2', name: 'b', x: 0, y: 1, width: 150, height: 160 }
        ];
        const { prepareImport, confirmImport } = useFileIO();
        await prepareImport(mockFile(validJson({ blocks })));
        await confirmImport();
        expect(mockReplaceBlocks).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ name: 'a' }),
                expect.objectContaining({ name: 'b' })
            ])
        );
    });

    test('calls loadVizes with the library after merging imported vizes', async () => {
        const customVizes = { myViz: { source: { template: '<div/>', script: '', style: '' } } };
        const { prepareImport, confirmImport } = useFileIO();
        await prepareImport(mockFile(validJson({ customVizes })));
        await confirmImport();
        expect(mockSaveLibraryEntry).toHaveBeenCalledWith('myViz', expect.objectContaining({ template: '<div/>' }));
        expect(mockLoadVizes).toHaveBeenCalledWith(mockLibrary);
    });

    test('clears pendingImport after confirmation', async () => {
        const { prepareImport, confirmImport, pendingImport } = useFileIO();
        await prepareImport(mockFile(validJson()));
        expect(pendingImport.value).not.toBeNull();
        await confirmImport();
        expect(pendingImport.value).toBeNull();
    });

    test('remaps block IDs to fresh UUIDs on import', async () => {
        const { prepareImport, confirmImport } = useFileIO();
        await prepareImport(mockFile(validJson({
            blocks: [{ id: 'old-id', name: 'foo', x: 0, y: 0, width: 150 }]
        })));
        await confirmImport();
        const calledBlocks = mockReplaceBlocks.mock.calls[0][0];
        expect(calledBlocks[0].id).not.toBe('old-id');
    });
});

describe('confirmImport — conflict resolution', () => {
    test('use-system: does not import conflicting viz, blocks unchanged', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        const json = validJson({
            blocks: [{ id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2, vizOptions: { customVizName: 'myViz' } }],
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, confirmImport, resolveConflict } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'use-system' });
        await confirmImport();
        expect(mockSaveLibraryEntry).not.toHaveBeenCalledWith('myViz', expect.anything());
        expect(mockReplaceBlocks).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ vizOptions: { customVizName: 'myViz' } })])
        );
    });

    test('add-as-new: saves under suffixed name, rewrites block references', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        const json = validJson({
            blocks: [{ id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2, vizOptions: { customVizName: 'myViz' } }],
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, confirmImport, resolveConflict } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'add-as-new' });
        await confirmImport();
        expect(mockSaveLibraryEntry).toHaveBeenCalledWith('myViz-2', expect.objectContaining({ template: 'B' }));
        expect(mockReplaceBlocks).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ vizOptions: { customVizName: 'myViz-2' } })])
        );
    });

    test('add-as-new: uses -3 when -2 already exists in library', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        mockLibrary['myViz-2'] = { hash: 'hash:X', source: { template: 'X', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, confirmImport, resolveConflict } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'add-as-new' });
        await confirmImport();
        expect(mockSaveLibraryEntry).toHaveBeenCalledWith('myViz-3', expect.anything());
    });

    test('remap: rewrites block references to targetName, does not import viz', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        mockLibrary['otherViz'] = { hash: 'hash:O', source: { template: 'O', script: '', style: '' } };
        const json = validJson({
            blocks: [{ id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2, vizOptions: { customVizName: 'myViz' } }],
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, confirmImport, resolveConflict } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'remap', targetName: 'otherViz' });
        await confirmImport();
        expect(mockSaveLibraryEntry).not.toHaveBeenCalledWith('myViz', expect.anything());
        expect(mockReplaceBlocks).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ vizOptions: { customVizName: 'otherViz' } })])
        );
    });
});

describe('resolveConflict', () => {
    test('stores resolution in conflictResolutions', async () => {
        mockLibrary['myViz'] = { hash: 'hash:A', source: { template: 'A', script: '', style: '' } };
        const json = validJson({
            customVizes: { myViz: { source: { template: 'B', script: '', style: '' } } }
        });
        const { prepareImport, resolveConflict, conflictResolutions } = useFileIO();
        await prepareImport(mockFile(json));
        resolveConflict('myViz', { action: 'use-system' });
        expect(conflictResolutions.value['myViz']).toEqual({ action: 'use-system' });
    });
});

describe('findSheetsReferencingViz', () => {
    test('returns name of a sheet whose block actively uses the viz', async () => {
        mockSheets.push({ id: 'sheet-a', name: 'Charts' });
        mockReadSheetData.mockResolvedValueOnce({
            blocks: [{ visualizationType: 'custom', vizOptions: { customVizName: 'Bar Chart' } }]
        });
        const { findSheetsReferencingViz } = useFileIO();
        const result = await findSheetsReferencingViz('Bar Chart');
        expect(result).toEqual(['Charts']);
    });

    test('excludes the active sheet from results', async () => {
        mockSheets.push({ id: 'sheet-active', name: 'Active Sheet' });
        mockSheets.push({ id: 'sheet-other', name: 'Other Sheet' });
        mockActiveSheetId.value = 'sheet-active';
        mockReadSheetData.mockResolvedValueOnce({
            blocks: [{ visualizationType: 'custom', vizOptions: { customVizName: 'Bar Chart' } }]
        });
        const { findSheetsReferencingViz } = useFileIO();
        const result = await findSheetsReferencingViz('Bar Chart');
        expect(result).toEqual(['Other Sheet']);
        expect(result).not.toContain('Active Sheet');
    });

    test('does not count a block with stale customVizName but non-custom visualizationType', async () => {
        mockSheets.push({ id: 'sheet-a', name: 'Charts' });
        mockReadSheetData.mockResolvedValueOnce({
            blocks: [{ visualizationType: 'table', vizOptions: { customVizName: 'Bar Chart' } }]
        });
        const { findSheetsReferencingViz } = useFileIO();
        const result = await findSheetsReferencingViz('Bar Chart');
        expect(result).toEqual([]);
    });
});
