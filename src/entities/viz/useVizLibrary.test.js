import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── OPFS mock ─────────────────────────────────────────────────────────────────

function makeOPFSMock() {
    let stored = null;

    const writable = {
        write: vi.fn(async (text) => { stored = text; }),
        close: vi.fn(async () => {})
    };

    const existingHandle = {
        getFile: vi.fn(async () => ({
            text: async () => stored ?? (() => { throw new Error('not found'); })()
        })),
        createWritable: vi.fn(async () => writable)
    };

    const missingHandle = {
        getFile: vi.fn(async () => { throw new Error('not found'); }),
        createWritable: vi.fn(async () => writable)
    };

    const root = {
        _stored: () => stored,
        _writable: writable,
        getFileHandle: vi.fn(async (name, opts) => {
            if (opts?.create) { return existingHandle; }
            if (stored === null) { throw new Error('not found'); }
            return existingHandle;
        })
    };

    return { root, writable };
}

async function freshImports() {
    vi.resetModules();
    const [{ useVizLibrary }, { getHash }] = await Promise.all([
        import('./useVizLibrary'),
        import('@/shared/lib/hash')
    ]);
    return { useVizLibrary, getHash };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('loadLibrary', () => {
    it('loads empty object when OPFS file does not exist', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { library, loadLibrary } = useVizLibrary();

        await loadLibrary();

        expect(Object.keys(library)).toHaveLength(0);
    });

    it('populates library from persisted OPFS file', async () => {
        const { root, writable } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { library, loadLibrary, createLibraryEntry } = useVizLibrary();

        createLibraryEntry('Viz 1');
        await vi.runAllTimersAsync();

        const written = writable.write.mock.calls.at(-1)?.[0];
        expect(written).toBeTruthy();
        const parsed = JSON.parse(written);
        expect(parsed['Viz 1']).toEqual({ hash: null, source: null });
    });
});

describe('createLibraryEntry', () => {
    it('adds entry to library synchronously', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { library, createLibraryEntry } = useVizLibrary();

        createLibraryEntry('My Viz');

        expect(library['My Viz']).toEqual({ hash: null, source: null });
    });

    it('persists the entry via _write', async () => {
        const { root, writable } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { createLibraryEntry } = useVizLibrary();

        createLibraryEntry('Persist Me');
        await vi.runAllTimersAsync();

        expect(writable.write).toHaveBeenCalled();
        const written = writable.write.mock.calls.at(-1)[0];
        const data = JSON.parse(written);
        expect(data['Persist Me']).toEqual({ hash: null, source: null });
    });
});

describe('deleteLibraryEntry', () => {
    it('removes entry from library', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { library, createLibraryEntry, deleteLibraryEntry } = useVizLibrary();

        createLibraryEntry('To Delete');
        expect(library['To Delete']).toBeDefined();

        deleteLibraryEntry('To Delete');
        expect(library['To Delete']).toBeUndefined();
    });

    it('persists removal', async () => {
        const { root, writable } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { createLibraryEntry, deleteLibraryEntry } = useVizLibrary();

        createLibraryEntry('To Delete');
        deleteLibraryEntry('To Delete');
        await vi.runAllTimersAsync();

        const written = writable.write.mock.calls.at(-1)[0];
        const data = JSON.parse(written);
        expect(data['To Delete']).toBeUndefined();
    });
});

describe('renameLibraryEntry', () => {
    it('renames entry in-order', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { library, createLibraryEntry, renameLibraryEntry } = useVizLibrary();

        createLibraryEntry('Alpha');
        createLibraryEntry('Beta');
        createLibraryEntry('Gamma');

        renameLibraryEntry('Beta', 'Delta');

        expect(Object.keys(library)).toEqual(['Alpha', 'Delta', 'Gamma']);
        expect(library['Beta']).toBeUndefined();
        expect(library['Delta']).toEqual({ hash: null, source: null });
    });

    it('returns false for unknown old name', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { renameLibraryEntry } = useVizLibrary();

        expect(renameLibraryEntry('Ghost', 'Other')).toBe(false);
    });

    it('returns false when new name already exists', async () => {
        const { root } = makeOPFSMock();
        vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } });

        const { useVizLibrary } = await freshImports();
        const { createLibraryEntry, renameLibraryEntry } = useVizLibrary();

        createLibraryEntry('Foo');
        createLibraryEntry('Bar');

        expect(renameLibraryEntry('Foo', 'Bar')).toBe(false);
    });
});

describe('getHash', () => {
    it('same source object produces same hash', async () => {
        const { getHash } = await freshImports();
        const source = { template: '<div/>', script: 'return {}', style: '.x{}' };
        const h1 = await getHash(source);
        const h2 = await getHash(source);
        expect(h1).toBe(h2);
    });

    it('different sources produce different hashes', async () => {
        const { getHash } = await freshImports();
        const h1 = await getHash({ template: '<div/>', script: '', style: '' });
        const h2 = await getHash({ template: '<span/>', script: '', style: '' });
        expect(h1).not.toBe(h2);
    });

    it('key order of source object does not affect hash', async () => {
        const { getHash } = await freshImports();
        const h1 = await getHash({ template: 't', script: 's', style: 'st' });
        const h2 = await getHash({ style: 'st', script: 's', template: 't' });
        expect(h1).toBe(h2);
    });
});
