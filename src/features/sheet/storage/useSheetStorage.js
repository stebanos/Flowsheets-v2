import { reactive, ref, watch } from 'vue';
import { deserializeSheet, migrate, serializeSheet } from '@/shared/lib/persistence';
import { useBlockStore } from '@/entities/block';
import { useHistory } from '@/entities/history';
import { useNoteStore } from '@/entities/note';
import { useSheetStore } from '@/entities/sheet';
import { useLSStrategy } from './useLSStrategy';
import { useOPFSStrategy } from './useOPFSStrategy';

// ── pointer keys (localStorage — small, fast) ────────────────────────────────
const KEY_ACTIVE_ID = 'flowsheets.v2.activeSheetId';
const KEY_OPEN_IDS  = 'flowsheets.v2.openSheetIds';

// ── module-level singletons ──────────────────────────────────────────────────
// Async I/O pattern: exposes reactive status ('idle'|'saving'|'error') and error (string|null)
const localStatus    = ref('idle');  // 'idle' | 'saving' | 'error'
const localError     = ref(null);    // string | null
const openSheetIds   = reactive([]);
const isFirstBoot    = ref(false);   // true only when storage was completely empty on this load
const _pendingDelete = new Set();    // ids whose writes must be suppressed until deleted
const _unreadable    = new Set();    // ids whose stored data failed to load — never overwrite them

// Handlers supplied by the page. Every useSheetStorage() caller shares them so that
// auto-save, switchSheet and closeSheet behave identically whichever instance runs them.
const _handlers = {
    getCustomVizes: () => ({}),
    onVizesLoaded:  () => {},
    getPan:         () => ({ panX: 0, panY: 0 }),
    onPanLoaded:    () => {}
};

let initialised     = false;
let bootPromise     = null;
let pendingSwitchId = null;
let loading         = false;  // true while stores hold data that does not belong to activeSheetId
let saveTimer       = null;


const strategy = _opfsAvailable() ? useOPFSStrategy() : useLSStrategy();

// ── OPFS availability check ──────────────────────────────────────────────────

function _opfsAvailable() {
    return typeof navigator !== 'undefined' &&
        typeof navigator.storage?.getDirectory === 'function';
}

// ── localStorage helpers (pointer keys only) ─────────────────────────────────

function _readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function _writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ── open-ids helpers ──────────────────────────────────────────────────────────

function _addToOpenIds(id) {
    if (!openSheetIds.includes(id)) {
        openSheetIds.push(id);
        _writeJson(KEY_OPEN_IDS, openSheetIds);
    }
}

function _persistOpenIds() {
    _writeJson(KEY_OPEN_IDS, [...openSheetIds]);
}

// ── composable ───────────────────────────────────────────────────────────────

export function useSheetStorage(handlers = {}) {
    for (const [key, fn] of Object.entries(handlers)) {
        if (fn && key in _handlers) { _handlers[key] = fn; }
    }
    const { notes: _storeNotes, replaceNotes } = useNoteStore();

    const { blocks, replaceBlocks } = useBlockStore();
    const { activeSheetId, activeSheetName, setActiveSheet, registerSheet, sheets } = useSheetStore();

    // ── save ──────────────────────────────────────────────────────────────────

    function _saveBlocked() {
        const id = activeSheetId.value;
        return loading || !id || _pendingDelete.has(id) || _unreadable.has(id);
    }

    async function _saveCurrentSheet() {
        if (_saveBlocked()) { return; }
        const id   = activeSheetId.value;
        const name = activeSheetName.value;
        try {
            const view = _handlers.getPan();
            const serialized = serializeSheet(blocks, _handlers.getCustomVizes(), name, view, _storeNotes);
            if (_pendingDelete.has(id)) { return; }
            await strategy.writeSheet(id, name, { blocks: serialized.blocks, customVizes: serialized.customVizes, view: serialized.view, notes: serialized.notes });
            localStatus.value = 'idle';
        } catch (err) {
            localStatus.value = 'error';
            localError.value  = err.name === 'QuotaExceededError'
                ? 'Auto-save failed — your browser storage is full. Save your work as a file to avoid losing it.'
                : err.message;
        }
    }

    function _scheduleSave() {
        if (_saveBlocked()) { return; }
        if (saveTimer !== null) { clearTimeout(saveTimer); }
        localStatus.value = 'saving';
        saveTimer = setTimeout(() => {
            saveTimer = null;
            _saveCurrentSheet();
        }, 500);
    }

    function flushSave() {
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
            saveTimer = null;
        }
        _saveCurrentSheet();
    }

    // ── load sheet data into stores ───────────────────────────────────────────

    // Reads + migrates + deserializes. A failure marks the id unreadable so auto-save
    // can never replace the stored data with the empty sheet shown in its place.
    async function _readSheet(id) {
        try {
            const raw = await strategy.readSheet(id);
            const envelope = {
                version:     raw.version     ?? 1,
                blocks:      raw.blocks      ?? [],
                customVizes: raw.customVizes ?? {},
                view:        raw.view        ?? {},
                notes:       raw.notes       ?? []
            };
            const data = await migrate(envelope);
            _unreadable.delete(id);
            return deserializeSheet(data);
        } catch (err) {
            _unreadable.add(id);
            localStatus.value = 'error';
            localError.value  = `This sheet could not be loaded (${err.message}). Auto-save is paused for it so its stored data is not overwritten.`;
            return { blocks: [], vizes: {}, view: { panX: 0, panY: 0 }, notes: [] };
        }
    }

    function _applyToStores({ blocks: loadedBlocks, vizes, view, notes: loadedNotes }) {
        const { suppress } = useHistory();
        suppress(() => {
            replaceBlocks(loadedBlocks);
            _handlers.onVizesLoaded(vizes);
            _handlers.onPanLoaded(view);
            replaceNotes(loadedNotes);
        });
    }

    // ── loadFromStorage ───────────────────────────────────────────────────────

    async function _boot() {
        loading = true;
        try {
            await _bootInner();
        } finally {
            loading = false;
        }
    }

    async function _bootInner() {
        let catalogue = await strategy.loadCatalogue();

        if (catalogue.length === 0) {
            isFirstBoot.value = true;
            const now = new Date().toISOString();
            const id  = `sheet:local/${crypto.randomUUID()}`;
            const entry = { id, name: 'Untitled', createdAt: now, updatedAt: now };
            catalogue = [entry];
            await strategy.initSheet(id, 'Untitled');
            localStorage.setItem(KEY_ACTIVE_ID, id);
            _writeJson(KEY_OPEN_IDS, [id]);
        }

        for (const entry of catalogue) {
            registerSheet(entry.id, entry.name);
        }

        let activeId = localStorage.getItem(KEY_ACTIVE_ID);
        if (!activeId || !catalogue.find(s => s.id === activeId)) {
            activeId = catalogue[0].id;
            localStorage.setItem(KEY_ACTIVE_ID, activeId);
        }

        const persistedOpen = _readJson(KEY_OPEN_IDS, [activeId]);
        const validOpen     = persistedOpen.filter(id => catalogue.find(s => s.id === id));
        if (!validOpen.includes(activeId)) { validOpen.unshift(activeId); }
        openSheetIds.splice(0, openSheetIds.length, ...validOpen);

        const activeEntry = catalogue.find(s => s.id === activeId);
        setActiveSheet(activeId, activeEntry?.name ?? 'Untitled');

        _applyToStores(await _readSheet(activeId));
    }

    function loadFromStorage() {
        if (!bootPromise) {
            bootPromise = _boot();
        }
        return bootPromise;
    }

    // ── switchSheet ───────────────────────────────────────────────────────────

    // The only place the active sheet id may change while stores hold data:
    // the outgoing sheet is flushed first, then `loading` blocks every save until
    // the incoming sheet's data has replaced the stores.
    async function switchSheet(id) {
        if (id === activeSheetId.value) { return; }
        const target = sheets.find(s => s.id === id);
        if (!target) { return; }

        flushSave();

        loading = true;
        setActiveSheet(id, target.name);
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);

        pendingSwitchId = id;
        const loaded = await _readSheet(id);
        // superseded by a newer switch, which now owns `loading`
        if (pendingSwitchId !== id) { return; }
        pendingSwitchId = null;

        _applyToStores(loaded);
        loading = false;
    }

    // ── initNewSheet ──────────────────────────────────────────────────────────

    function initNewSheet(id, name) {
        _applyToStores({ blocks: [], vizes: {}, view: { panX: 0, panY: 0 }, notes: [] });
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);
        strategy.initSheet(id, name).catch((err) => {
            localStatus.value = 'error';
            localError.value  = err.message;
        });
    }

    // ── persistDeleteSheet ────────────────────────────────────────────────────

    async function persistDeleteSheet(id) {
        await strategy.deleteSheet(id);
    }

    // ── persistRenameSheet ────────────────────────────────────────────────────

    async function persistRenameSheet(id, name) {
        await strategy.renameSheet(id, name);
    }

    // ── closeSheet ────────────────────────────────────────────────────────────

    function closeSheet(id) {
        const idx = openSheetIds.indexOf(id);
        if (idx === -1) { return; }

        openSheetIds.splice(idx, 1);
        _persistOpenIds();
        useHistory().closeSheet(id);

        if (activeSheetId.value !== id) { return; }

        // Prefer the nearest remaining tab; with no tabs left, fall back to any other
        // catalogue sheet so the active id never moves without its data being loaded.
        const nextId = openSheetIds.length > 0
            ? openSheetIds[Math.min(idx, openSheetIds.length - 1)]
            : sheets.find(s => s.id !== id)?.id;
        if (nextId === undefined) { return; }
        switchSheet(nextId);
    }

    // ── thin delegates for external callers ───────────────────────────────────

    async function readSheetData(id) {
        return strategy.readSheet(id);
    }

    async function writeSheetData(id, name, data) {
        return strategy.writeSheet(id, name, data);
    }

    // ── auto-save watcher (initialised once per singleton) ───────────────────

    if (!initialised) {
        initialised = true;
        watch(
            [blocks, _storeNotes, activeSheetName],
            () => { _scheduleSave(); },
            { deep: true }
        );
    }

    function markPendingDelete(id) { _pendingDelete.add(id); }
    function unmarkPendingDelete(id) { _pendingDelete.delete(id); }

    return {
        localStatus,
        localError,
        openSheetIds,
        isFirstBoot,
        loadFromStorage,
        switchSheet,
        closeSheet,
        initNewSheet,
        persistDeleteSheet,
        persistRenameSheet,
        readSheetData,
        writeSheetData,
        markPendingDelete,
        unmarkPendingDelete,
        scheduleSave: _scheduleSave,
        flushSave
    };
}
