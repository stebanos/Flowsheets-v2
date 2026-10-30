import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── localStorage mock ─────────────────────────────────────────────────────────
// We build a fresh in-memory store before each test and restore afterwards.

function makeFakeStorage() {
    const store = {};
    return {
        getItem:    (k)    => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
        setItem:    (k, v) => { store[k] = String(v); },
        removeItem: (k)    => { delete store[k]; },
        clear:      ()     => { for (const k of Object.keys(store)) { delete store[k]; } },
        _store:     store
    };
}

let fakeStorage;

// Real storage (OPFS) reads asynchronously; the localStorage strategy reads synchronously
// at call time. Tests that depend on a save timer firing *before* the read completes
// switch this on so the strategy reads on a later microtask.
const readControl = vi.hoisted(() => ({ defer: false }));
vi.mock('./useLSStrategy', async (importOriginal) => {
    const mod = await importOriginal();
    return {
        useLSStrategy: () => {
            const strategy = mod.useLSStrategy();
            const original = strategy.readSheet;
            async function deferredRead(id) {
                await Promise.resolve();
                return original(id);
            }
            strategy.readSheet = (id) => (readControl.defer ? deferredRead(id) : original(id));
            return strategy;
        }
    };
});

// ── module reset helpers ──────────────────────────────────────────────────────
// Each test needs fresh singleton state.  We use vi.resetModules() + dynamic
// import to get a pristine module on every test.

async function freshImports() {
    vi.resetModules();
    const [{ useSheetStorage }, { useSheetStore }, { useBlockStore }, { useCustomVizStore }] =
        await Promise.all([
            import('./useSheetStorage'),
            import('@/entities/sheet/useSheetStore'),
            import('@/entities/block'),
            import('@/entities/viz')
        ]);
    return { useSheetStorage, useSheetStore, useBlockStore, useCustomVizStore };
}

const KEY_CATALOGUE = 'flowsheets.v2.catalogue';
const KEY_ACTIVE_ID = 'flowsheets.v2.activeSheetId';
const KEY_OPEN_IDS  = 'flowsheets.v2.openSheetIds';
const KEY_SHEET     = (id) => `flowsheets.v2.sheet.${id}`;

beforeEach(() => {
    fakeStorage = makeFakeStorage();
    vi.stubGlobal('localStorage', fakeStorage);
    vi.useFakeTimers();
});

afterEach(() => {
    readControl.defer = false;
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('loadFromStorage', () => {
    it('bootstraps a fresh sheet when storage is empty', async () => {
        const { useSheetStorage, useSheetStore } = await freshImports();

        const { loadFromStorage, openSheetIds } = useSheetStorage();
        await loadFromStorage();

        const catalogue = JSON.parse(fakeStorage.getItem(KEY_CATALOGUE));
        expect(catalogue).toHaveLength(1);
        expect(catalogue[0].name).toBe('Untitled');

        const { activeSheetId, sheets } = useSheetStore();
        expect(activeSheetId.value).toBe(catalogue[0].id);
        expect(sheets).toHaveLength(1);
        expect(openSheetIds).toContain(catalogue[0].id);
    });

    it('loads blocks and vizes into stores for the active sheet', async () => {
        const { useSheetStorage, useBlockStore, useCustomVizStore } = await freshImports();

        const id = 'sheet:local/abc';
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id, name: 'Test', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id]));
        fakeStorage.setItem(KEY_SHEET(id), JSON.stringify({
            blocks: [{ id: 'b1', name: 'x', code: '42', x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null }],
            customVizes: {}
        }));

        const { loadFromStorage } = useSheetStorage();
        await loadFromStorage();

        const { blocks } = useBlockStore();
        expect(blocks).toHaveLength(1);
        expect(blocks[0].id).toBe('b1');

        const { customVizes } = useCustomVizStore();
        expect(Object.keys(customVizes)).toHaveLength(0);
    });

    it('restores openSheetIds from localStorage', async () => {
        const { useSheetStorage } = await freshImports();

        const id1 = 'sheet:local/s1';
        const id2 = 'sheet:local/s2';
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id: id1, name: 'A', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: id2, name: 'B', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id1);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1, id2]));
        fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({ blocks: [], customVizes: {} }));
        fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({ blocks: [], customVizes: {} }));

        const { loadFromStorage, openSheetIds } = useSheetStorage();
        await loadFromStorage();

        expect(openSheetIds).toEqual([id1, id2]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

async function setupTwoSheets() {
    const { useSheetStorage, useSheetStore, useBlockStore } = await freshImports();

    const id1 = 'sheet:local/s1';
    const id2 = 'sheet:local/s2';

    fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
        { id: id1, name: 'Sheet 1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: id2, name: 'Sheet 2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    ]));
    fakeStorage.setItem(KEY_ACTIVE_ID, id1);
    fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1]));
    fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({
        blocks: [{ id: 'b1', name: 'x', code: '1', x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null }],
        customVizes: {}
    }));
    fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({
        blocks: [{ id: 'b2', name: 'y', code: '2', x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null }],
        customVizes: {}
    }));

    const storage = useSheetStorage();
    await storage.loadFromStorage();

    return { storage, useSheetStore, useBlockStore, id1, id2 };
}

describe('switchSheet', () => {
    it('loads the target sheet blocks into blockStore', async () => {
        const { storage, useBlockStore, id2 } = await setupTwoSheets();
        const { blocks } = useBlockStore();

        await storage.switchSheet(id2);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].id).toBe('b2');
    });

    it('updates activeSheetId in the store and in localStorage', async () => {
        const { storage, useSheetStore, id2 } = await setupTwoSheets();

        await storage.switchSheet(id2);

        const { activeSheetId } = useSheetStore();
        expect(activeSheetId.value).toBe(id2);
        expect(fakeStorage.getItem(KEY_ACTIVE_ID)).toBe(id2);
    });

    it('adds the target id to openSheetIds', async () => {
        const { storage, id2 } = await setupTwoSheets();

        await storage.switchSheet(id2);

        expect(storage.openSheetIds).toContain(id2);
        const persisted = JSON.parse(fakeStorage.getItem(KEY_OPEN_IDS));
        expect(persisted).toContain(id2);
    });

    it('is a no-op when switching to the already-active sheet', async () => {
        const { storage, useSheetStore, id1 } = await setupTwoSheets();
        const { activeSheetId } = useSheetStore();
        const idBefore = activeSheetId.value;

        await storage.switchSheet(id1);

        expect(activeSheetId.value).toBe(idBefore);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('switchSheet — pending save flush', () => {
    it('writes the current sheet before switching away', async () => {
        const { storage, useBlockStore, id1, id2 } = await setupTwoSheets();
        const { addBlock } = useBlockStore();

        addBlock({ id: 'extra', name: 'z', code: '99', x: 0, y: 0, inputModes: {},
            visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null });
        await nextTick(); // watcher fires → _scheduleSave → saveTimer set, save not flushed yet

        const setItemSpy = vi.spyOn(fakeStorage, 'setItem');

        await storage.switchSheet(id2);

        const id1Writes = setItemSpy.mock.calls.filter(([k]) => k === KEY_SHEET(id1));
        expect(id1Writes.length).toBeGreaterThanOrEqual(1);
    });

    it('does not write the old sheet a second time 500ms after switching', async () => {
        const { storage, useBlockStore, id1, id2 } = await setupTwoSheets();
        const { addBlock } = useBlockStore();

        addBlock({ id: 'extra', name: 'z', code: '99', x: 0, y: 0, inputModes: {},
            visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null });
        await nextTick(); // saveTimer set

        await storage.switchSheet(id2);
        await nextTick(); // watcher may reset timer

        const setItemSpy = vi.spyOn(fakeStorage, 'setItem');
        vi.advanceTimersByTime(500);
        await nextTick();

        const id1Writes = setItemSpy.mock.calls.filter(([k]) => k === KEY_SHEET(id1));
        expect(id1Writes).toHaveLength(0);
    });

    it('does not corrupt new sheet data when the debounce timer fires mid-switch', async () => {
        const { storage, useBlockStore, id1, id2 } = await setupTwoSheets();
        const { addBlock } = useBlockStore();

        // Edit sheet1 — timer set, not yet fired
        addBlock({ id: 'extra', name: 'z', code: '99', x: 0, y: 0, inputModes: {},
            visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null });
        await nextTick();

        // Start the switch but fire the original timer before the read-and-load microtask runs
        const switchPromise = storage.switchSheet(id2);
        vi.advanceTimersByTime(500); // timer fires here with stale sheet1 blocks still in memory
        await switchPromise;

        // Sheet2's stored data must contain only sheet2's own blocks
        const storedId2 = JSON.parse(fakeStorage.getItem(KEY_SHEET(id2)));
        const storedBlockIds = (storedId2.blocks ?? []).map(b => b.id);
        expect(storedBlockIds).not.toContain('b1');    // sheet1's original block
        expect(storedBlockIds).not.toContain('extra'); // the unsaved edit on sheet1
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('switchSheet — note store', () => {
    it('clears notes from the previous sheet when switching without onNotesLoaded callback', async () => {
        // Reproduces the bug: SheetTabs/SheetSidebar call useSheetStorage() with no
        // onNotesLoaded, so _onNotesLoaded is a no-op and notes never get replaced.
        vi.resetModules();
        const [{ useSheetStorage }, { useNoteStore }] = await Promise.all([
            import('./useSheetStorage'),
            import('@/entities/note')
        ]);

        const id1 = 'sheet:local/s1';
        const id2 = 'sheet:local/s2';

        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id: id1, name: 'S1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: id2, name: 'S2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id1);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1]));
        fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({ blocks: [], customVizes: {}, notes: [] }));
        fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({ blocks: [], customVizes: {}, notes: [] }));

        const { notes, addNote } = useNoteStore();
        const storage = useSheetStorage(); // no callbacks — mirrors SheetTabs.vue
        await storage.loadFromStorage();

        addNote({ id: 'n1', x: 10, y: 20, width: 200, height: 150, title: 'Sheet A note', body: '' });
        expect(notes).toHaveLength(1);

        await storage.switchSheet(id2);

        expect(notes).toHaveLength(0);
    });

    it('loads the target sheet notes into the note store after switchSheet', async () => {
        vi.resetModules();
        const [{ useSheetStorage }, { useNoteStore }] = await Promise.all([
            import('./useSheetStorage'),
            import('@/entities/note')
        ]);

        const id1 = 'sheet:local/s1';
        const id2 = 'sheet:local/s2';
        const noteB = { id: 'n2', x: 0, y: 0, width: 200, height: 150, title: 'Sheet B note', body: '' };

        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id: id1, name: 'S1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: id2, name: 'S2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id1);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1]));
        fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({ blocks: [], customVizes: {}, notes: [] }));
        fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({ blocks: [], customVizes: {}, notes: [noteB] }));

        const { notes } = useNoteStore();
        const storage = useSheetStorage(); // no callbacks — mirrors SheetTabs.vue
        await storage.loadFromStorage();

        await storage.switchSheet(id2);

        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe('n2');
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('closeSheet', () => {
    async function setupTwoOpenSheets() {
        const { useSheetStorage, useSheetStore, useBlockStore } = await freshImports();

        const id1 = 'sheet:local/s1';
        const id2 = 'sheet:local/s2';

        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id: id1, name: 'Sheet 1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: id2, name: 'Sheet 2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id1);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1, id2]));
        fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({ blocks: [], customVizes: {} }));
        fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({ blocks: [], customVizes: {} }));

        const storage = useSheetStorage();
        await storage.loadFromStorage();

        return { storage, useSheetStore, useBlockStore, id1, id2 };
    }

    it('removes id from openSheetIds and persists the change', async () => {
        const { storage, id2 } = await setupTwoOpenSheets();

        storage.closeSheet(id2);

        expect(storage.openSheetIds).not.toContain(id2);
        const persisted = JSON.parse(fakeStorage.getItem(KEY_OPEN_IDS));
        expect(persisted).not.toContain(id2);
    });

    it('does not change active sheet when closing a non-active sheet', async () => {
        const { storage, useSheetStore, id1, id2 } = await setupTwoOpenSheets();

        storage.closeSheet(id2);  // id1 is active

        const { activeSheetId } = useSheetStore();
        expect(activeSheetId.value).toBe(id1);
    });

    it('switches to nearest remaining sheet when closing the active sheet', async () => {
        const { storage, useSheetStore, id1, id2 } = await setupTwoOpenSheets();
        // id1 is currently active; close it → should switch to id2

        storage.closeSheet(id1);
        await nextTick();

        const { activeSheetId } = useSheetStore();
        expect(activeSheetId.value).toBe(id2);
        expect(storage.openSheetIds).not.toContain(id1);
        expect(storage.openSheetIds).toContain(id2);
    });

    it('is a no-op when id is not in openSheetIds', async () => {
        const { storage } = await setupTwoOpenSheets();
        const lenBefore = storage.openSheetIds.length;

        storage.closeSheet('sheet:local/nonexistent');

        expect(storage.openSheetIds.length).toBe(lenBefore);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('constructor args — viz and pan handlers', () => {
    function setupSheet(id = 'sheet:local/abc') {
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id, name: 'T', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id]));
        fakeStorage.setItem(KEY_SHEET(id), JSON.stringify({ blocks: [], customVizes: {}, view: { panX: 5, panY: 10 } }));
    }

    it('calls onVizesLoaded constructor arg when loadFromStorage runs', async () => {
        const { useSheetStorage } = await freshImports();
        setupSheet();

        const onVizesLoaded = vi.fn();
        const { loadFromStorage } = useSheetStorage({ onVizesLoaded });
        await loadFromStorage();

        expect(onVizesLoaded).toHaveBeenCalledOnce();
    });

    it('calls onPanLoaded constructor arg when loadFromStorage runs', async () => {
        const { useSheetStorage } = await freshImports();
        setupSheet();

        const onPanLoaded = vi.fn();
        const { loadFromStorage } = useSheetStorage({ onPanLoaded });
        await loadFromStorage();

        expect(onPanLoaded).toHaveBeenCalledOnce();
    });

    it('calls onVizesLoaded constructor arg when switchSheet runs', async () => {
        const { useSheetStorage } = await freshImports();

        const id1 = 'sheet:local/s1';
        const id2 = 'sheet:local/s2';
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id: id1, name: 'S1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
            { id: id2, name: 'S2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id1);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id1]));
        fakeStorage.setItem(KEY_SHEET(id1), JSON.stringify({ blocks: [], customVizes: {} }));
        fakeStorage.setItem(KEY_SHEET(id2), JSON.stringify({ blocks: [], customVizes: {} }));

        const onVizesLoaded = vi.fn();
        const storage = useSheetStorage({ onVizesLoaded });
        await storage.loadFromStorage();
        onVizesLoaded.mockClear();

        await storage.switchSheet(id2);

        expect(onVizesLoaded).toHaveBeenCalledOnce();
    });

    it('calls getCustomVizes constructor arg when auto-save fires', async () => {
        const { useSheetStorage } = await freshImports();
        setupSheet();

        const getCustomVizes = vi.fn().mockReturnValue({});
        const { loadFromStorage, scheduleSave } = useSheetStorage({ getCustomVizes });
        await loadFromStorage();
        getCustomVizes.mockClear();

        scheduleSave();
        vi.advanceTimersByTime(500);

        expect(getCustomVizes).toHaveBeenCalled();
    });

    it('does not expose registerVizHandlers on the returned object', async () => {
        const { useSheetStorage } = await freshImports();
        const storage = useSheetStorage({});
        expect(storage.registerVizHandlers).toBeUndefined();
    });

    it('does not expose registerPanHandlers on the returned object', async () => {
        const { useSheetStorage } = await freshImports();
        const storage = useSheetStorage({});
        expect(storage.registerPanHandlers).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('auto-save debounce', () => {
    it('schedules a save 500ms after a block change', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();

        const id = 'sheet:local/abc';
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id, name: 'T', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id]));
        fakeStorage.setItem(KEY_SHEET(id), JSON.stringify({ blocks: [], customVizes: {} }));

        const { loadFromStorage, localStatus } = useSheetStorage();
        await loadFromStorage();

        const { addBlock } = useBlockStore();
        addBlock({ id: 'b99', name: 'z', code: '0', x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null });

        await nextTick();
        expect(localStatus.value).toBe('saving');

        vi.advanceTimersByTime(500);
        await nextTick();

        // After debounce the status should no longer be 'saving'
        expect(localStatus.value).not.toBe('saving');
    });

    it('debounces rapid changes into a single save', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();

        const id = 'sheet:local/abc';
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify([
            { id, name: 'T', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
        ]));
        fakeStorage.setItem(KEY_ACTIVE_ID, id);
        fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify([id]));
        fakeStorage.setItem(KEY_SHEET(id), JSON.stringify({ blocks: [], customVizes: {} }));

        const { loadFromStorage } = useSheetStorage();
        await loadFromStorage();

        const { addBlock, updateBlock } = useBlockStore();
        addBlock({ id: 'b1', name: 'a', code: '1', x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {}, userMinWidth: null, userMinEditorHeight: null });
        await nextTick();
        updateBlock('b1', { code: '2' });
        await nextTick();
        updateBlock('b1', { code: '3' });
        await nextTick();

        // Only one write should land after the debounce window
        const setItemSpy = vi.spyOn(fakeStorage, 'setItem');
        vi.advanceTimersByTime(500);
        await nextTick();

        const sheetWrites = setItemSpy.mock.calls.filter(([k]) => k === KEY_SHEET(id));
        expect(sheetWrites.length).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

const BLOCK = (id, name = 'z', code = '0') => ({
    id, name, code, x: 0, y: 0, inputModes: {}, visualizationType: 'default', vizOptions: {},
    userMinWidth: null, userMinEditorHeight: null
});

function seedSheets(ids, { open = [ids[0]], active = ids[0] } = {}) {
    fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify(ids.map((id, i) => (
        { id, name: `Sheet ${i + 1}`, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    ))));
    fakeStorage.setItem(KEY_ACTIVE_ID, active);
    fakeStorage.setItem(KEY_OPEN_IDS, JSON.stringify(open));
    for (const [i, id] of ids.entries()) {
        fakeStorage.setItem(KEY_SHEET(id), JSON.stringify({ blocks: [BLOCK(`b${i + 1}`)], customVizes: {} }));
    }
}

function storedBlockIds(id) {
    return (JSON.parse(fakeStorage.getItem(KEY_SHEET(id))).blocks ?? []).map(b => b.id);
}

describe('shared state across instances', () => {
    const ids = ['sheet:local/s1', 'sheet:local/s2', 'sheet:local/s3'];

    it('auto-save uses getPan from the configured instance even when an argument-less instance came first', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);

        useSheetStorage(); // e.g. useSheetManager — installs the watcher
        const { loadFromStorage } = useSheetStorage({ getPan: () => ({ panX: 40, panY: 50 }) });
        await loadFromStorage();

        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        const stored = JSON.parse(fakeStorage.getItem(KEY_SHEET(ids[0])));
        expect(stored.view).toEqual({ panX: 40, panY: 50, viewMode: 'canvas' });
    });

    it('switchSheet through an argument-less instance still restores pan via the configured handler', async () => {
        const { useSheetStorage } = await freshImports();
        seedSheets(ids);
        fakeStorage.setItem(KEY_SHEET(ids[1]), JSON.stringify({ blocks: [], customVizes: {}, view: { panX: 7, panY: 8 } }));

        const onPanLoaded = vi.fn();
        const { loadFromStorage } = useSheetStorage({ onPanLoaded });
        await loadFromStorage();
        onPanLoaded.mockClear();

        await useSheetStorage().switchSheet(ids[1]); // e.g. SheetTabs

        expect(onPanLoaded).toHaveBeenCalledWith(expect.objectContaining({ panX: 7, panY: 8 }));
    });

    it('a pending save never writes stale blocks under the new id when the switch comes from another instance', async () => {
        readControl.defer = true;
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);

        const page = useSheetStorage({ getPan: () => ({ panX: 0, panY: 0 }) });
        await page.loadFromStorage();
        const tabs = useSheetStorage();

        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick(); // watcher scheduled a save for sheet 1

        const switchPromise = tabs.switchSheet(ids[1]);
        vi.advanceTimersByTime(500);
        await switchPromise;
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(storedBlockIds(ids[0])).toContain('extra');
        expect(storedBlockIds(ids[1])).toEqual(['b2']);
    });

    it('exposes flushSave which writes immediately and cancels the pending timer', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);

        const storage = useSheetStorage();
        await storage.loadFromStorage();

        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();

        storage.flushSave();
        expect(storedBlockIds(ids[0])).toContain('extra');

        const setItemSpy = vi.spyOn(fakeStorage, 'setItem');
        vi.advanceTimersByTime(500);
        await nextTick();
        expect(setItemSpy.mock.calls.filter(([k]) => k === KEY_SHEET(ids[0]))).toHaveLength(0);
    });
});

describe('switchSheet — rapid double switch', () => {
    const ids = ['sheet:local/s1', 'sheet:local/s2', 'sheet:local/s3'];

    it('does not write the first sheet\'s blocks into the intermediate sheet', async () => {
        readControl.defer = true;
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);

        const storage = useSheetStorage();
        await storage.loadFromStorage();

        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();

        const p2 = storage.switchSheet(ids[1]);
        const p3 = storage.switchSheet(ids[2]);
        await Promise.all([p2, p3]);
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(storedBlockIds(ids[0])).toContain('extra');
        expect(storedBlockIds(ids[1])).toEqual(['b2']);
        expect(storedBlockIds(ids[2])).toEqual(['b3']);
        expect(useBlockStore().blocks.map(b => b.id)).toEqual(['b3']);
    });

    it('keeps auto-save working after the superseded switch resolves', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);

        const storage = useSheetStorage();
        await storage.loadFromStorage();

        await Promise.all([storage.switchSheet(ids[1]), storage.switchSheet(ids[2])]);

        useBlockStore().addBlock(BLOCK('late'));
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(storedBlockIds(ids[2])).toContain('late');
    });
});

describe('closeSheet — last open tab', () => {
    it('switches to another catalogue sheet when the closed sheet was active and the only open tab', async () => {
        const { useSheetStorage, useSheetStore, useBlockStore } = await freshImports();
        const ids = ['sheet:local/s1', 'sheet:local/s2'];
        seedSheets(ids);

        const storage = useSheetStorage();
        await storage.loadFromStorage();

        storage.closeSheet(ids[0]);
        await vi.runAllTimersAsync();

        expect(useSheetStore().activeSheetId.value).toBe(ids[1]);
        expect(storage.openSheetIds).toEqual([ids[1]]);
        expect(useBlockStore().blocks.map(b => b.id)).toEqual(['b2']);
        expect(storedBlockIds(ids[1])).toEqual(['b2']);
    });
});

describe('unreadable sheet data', () => {
    const ids = ['sheet:local/s1', 'sheet:local/s2'];

    it('does not overwrite a corrupt sheet file and reports an error', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);
        fakeStorage.setItem(KEY_SHEET(ids[0]), 'not json');

        const { loadFromStorage, localStatus, localError } = useSheetStorage();
        await loadFromStorage();

        expect(localStatus.value).toBe('error');
        expect(localError.value).toBeTruthy();
        expect(useBlockStore().blocks).toHaveLength(0);

        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(fakeStorage.getItem(KEY_SHEET(ids[0]))).toBe('not json');
    });

    it('does not leave auto-save disabled after a migration failure', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);
        const raw = JSON.stringify({ version: '99.0.0', blocks: [] });
        fakeStorage.setItem(KEY_SHEET(ids[0]), raw);

        const storage = useSheetStorage();
        await storage.loadFromStorage();
        expect(storage.localStatus.value).toBe('error');

        await storage.switchSheet(ids[1]);
        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(storedBlockIds(ids[1])).toContain('extra');
        expect(fakeStorage.getItem(KEY_SHEET(ids[0]))).toBe(raw);
    });

    it('does not overwrite a corrupt sheet reached via switchSheet', async () => {
        const { useSheetStorage, useBlockStore } = await freshImports();
        seedSheets(ids);
        fakeStorage.setItem(KEY_SHEET(ids[1]), 'not json');

        const storage = useSheetStorage();
        await storage.loadFromStorage();
        await storage.switchSheet(ids[1]);

        expect(storage.localStatus.value).toBe('error');
        useBlockStore().addBlock(BLOCK('extra'));
        await nextTick();
        vi.advanceTimersByTime(500);
        await nextTick();

        expect(fakeStorage.getItem(KEY_SHEET(ids[1]))).toBe('not json');
    });
});
