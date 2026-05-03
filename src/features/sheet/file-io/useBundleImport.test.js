import { ref } from 'vue';
import { describe, test, expect, beforeEach, vi } from 'vitest';

const { useBundleImport } = await import('./useBundleImport');

// --- Helpers ---

function mockFile(text) {
    return { text: async () => text };
}

const singleSheetBundle = JSON.stringify({
    formatVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    rootSheetId: 'sheet:local/s1',
    sheets: [{ id: 'sheet:local/s1', name: 'Sheet 1', blocks: [], customVizes: {} }]
});

const twoSheetBundle = JSON.stringify({
    formatVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    rootSheetId: 'sheet:local/s1',
    sheets: [
        { id: 'sheet:local/s1', name: 'Sheet 1', blocks: [], customVizes: {} },
        { id: 'sheet:local/s2', name: 'Sheet 2', blocks: [], customVizes: {} }
    ]
});

function makeDeps(overrides = {}) {
    return {
        sheets: ref([]),
        writeSheetData: vi.fn().mockResolvedValue(undefined),
        persistDeleteSheet: vi.fn().mockResolvedValue(undefined),
        setActiveSheet: vi.fn(),
        switchSheet: vi.fn(),
        ...overrides
    };
}

// --- Tests ---

describe('prepareBundleImport — read/parse failures', () => {
    test('returns error when file.text() rejects', async () => {
        const { prepareBundleImport } = useBundleImport(makeDeps());
        const file = { text: async () => { throw new Error('disk error'); } };
        const result = await prepareBundleImport(file);
        expect(result.error).toBeTruthy();
    });

    test('returns error for invalid JSON', async () => {
        const { prepareBundleImport } = useBundleImport(makeDeps());
        const result = await prepareBundleImport(mockFile('not json {{{'));
        expect(result.error).toBeTruthy();
    });

    test('returns error when formatVersion is missing', async () => {
        const { prepareBundleImport } = useBundleImport(makeDeps());
        const result = await prepareBundleImport(mockFile(JSON.stringify({ sheets: [] })));
        expect(result.error).toBeTruthy();
    });
});

describe('prepareBundleImport — valid bundle', () => {
    test('returns { pending: true }', async () => {
        const { prepareBundleImport } = useBundleImport(makeDeps());
        const result = await prepareBundleImport(mockFile(singleSheetBundle));
        expect(result).toEqual({ pending: true });
    });

    test('sets bundleImportState.pending to true and populates entries', async () => {
        const { prepareBundleImport, bundleImportState } = useBundleImport(makeDeps());
        await prepareBundleImport(mockFile(twoSheetBundle));
        expect(bundleImportState.value.pending).toBe(true);
        expect(bundleImportState.value.entries).toHaveLength(2);
    });

    test('marks a sheet as import when its id is not present locally', async () => {
        const { prepareBundleImport, bundleImportState } = useBundleImport(makeDeps({ sheets: ref([]) }));
        await prepareBundleImport(mockFile(singleSheetBundle));
        expect(bundleImportState.value.entries[0].action).toBe('import');
    });

    test('marks a sheet as skip when its id already exists locally', async () => {
        const deps = makeDeps({ sheets: ref([{ id: 'sheet:local/s1', name: 'Sheet 1' }]) });
        const { prepareBundleImport, bundleImportState } = useBundleImport(deps);
        await prepareBundleImport(mockFile(singleSheetBundle));
        expect(bundleImportState.value.entries[0].action).toBe('skip');
    });

    test('stores rootSheetId in bundleImportState', async () => {
        const { prepareBundleImport, bundleImportState } = useBundleImport(makeDeps());
        await prepareBundleImport(mockFile(singleSheetBundle));
        expect(bundleImportState.value.rootSheetId).toBe('sheet:local/s1');
    });
});

describe('cancelBundleImport', () => {
    test('resets bundleImportState to { pending: false, entries: [] }', async () => {
        const { prepareBundleImport, cancelBundleImport, bundleImportState } = useBundleImport(makeDeps());
        await prepareBundleImport(mockFile(singleSheetBundle));
        expect(bundleImportState.value.pending).toBe(true);
        cancelBundleImport();
        expect(bundleImportState.value).toEqual({ pending: false, entries: [] });
    });
});

describe('confirmBundleImport — happy path', () => {
    test('does nothing when bundleImportState.pending is false', async () => {
        const deps = makeDeps();
        const { confirmBundleImport } = useBundleImport(deps);
        await confirmBundleImport();
        expect(deps.writeSheetData).not.toHaveBeenCalled();
    });

    test('calls writeSheetData once per imported sheet', async () => {
        const deps = makeDeps();
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(twoSheetBundle));
        await confirmBundleImport();
        expect(deps.writeSheetData).toHaveBeenCalledTimes(2);
    });

    test('skips writeSheetData for sheets with action = skip', async () => {
        const deps = makeDeps({ sheets: ref([{ id: 'sheet:local/s1', name: 'Sheet 1' }]) });
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(twoSheetBundle)); // s1 → skip, s2 → import
        await confirmBundleImport();
        expect(deps.writeSheetData).toHaveBeenCalledTimes(1);
    });

    test('calls setActiveSheet for each imported sheet', async () => {
        const deps = makeDeps();
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(twoSheetBundle));
        await confirmBundleImport();
        expect(deps.setActiveSheet).toHaveBeenCalledTimes(2);
    });

    test('calls switchSheet with rootSheetId after import', async () => {
        const deps = makeDeps();
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(singleSheetBundle));
        await confirmBundleImport();
        expect(deps.switchSheet).toHaveBeenCalledWith('sheet:local/s1');
    });

    test('resets bundleImportState after successful import', async () => {
        const deps = makeDeps();
        const { prepareBundleImport, confirmBundleImport, bundleImportState } = useBundleImport(deps);
        await prepareBundleImport(mockFile(singleSheetBundle));
        await confirmBundleImport();
        expect(bundleImportState.value.pending).toBe(false);
    });
});

describe('confirmBundleImport — failure handling', () => {
    test('clears bundleImportState when writeSheetData rejects', async () => {
        const deps = makeDeps({
            writeSheetData: vi.fn().mockRejectedValueOnce(new Error('disk full'))
        });
        const { prepareBundleImport, confirmBundleImport, bundleImportState } = useBundleImport(deps);
        await prepareBundleImport(mockFile(singleSheetBundle));
        expect(bundleImportState.value.pending).toBe(true);
        await expect(confirmBundleImport()).rejects.toThrow();
        expect(bundleImportState.value).toBeNull();
    });

    test('calls persistDeleteSheet for each written sheet when a later write fails', async () => {
        const deps = makeDeps({
            writeSheetData: vi.fn()
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('disk full'))
        });
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(twoSheetBundle));
        await expect(confirmBundleImport()).rejects.toThrow();
        expect(deps.persistDeleteSheet).toHaveBeenCalledWith('sheet:local/s1');
    });

    test('re-throws the error after rollback', async () => {
        const deps = makeDeps({
            writeSheetData: vi.fn().mockRejectedValueOnce(new Error('boom'))
        });
        const { prepareBundleImport, confirmBundleImport } = useBundleImport(deps);
        await prepareBundleImport(mockFile(singleSheetBundle));
        await expect(confirmBundleImport()).rejects.toThrow('boom');
    });
});
