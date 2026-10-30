import { reactive, ref, watch } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useHistory } from '@/entities/history';
import { useNoteStore } from '@/entities/note';
import { serializeSheet, useSheetStore } from '@/entities/sheet';
import { readActiveId, readOpenIds, writeActiveId, writeOpenIds } from './pointerKeys';
import { createSaveScheduler } from './saveScheduler';
import { readSheetData as loadSheet } from './sheetLoader';
import { useLSStrategy } from './useLSStrategy';
import { useOPFSStrategy } from './useOPFSStrategy';

// ── storage strategy contract ───────────────────────────────────────────────
// A strategy (useLSStrategy, useOPFSStrategy) exposes six async methods:
//   loadCatalogue()              → [{ id, name, createdAt, updatedAt }]
//   readSheet(id)                → sheet data
//   writeSheet(id, name, data)   → upserts the sheet data and its catalogue entry
//   renameSheet(id, name)        → updates the catalogue entry only
//   deleteSheet(id)              → removes the sheet data and its catalogue entry
//   initSheet(id, name)          → writes an empty sheet and adds a catalogue entry
// Sheet data shape: { blocks: [], customVizes: {}, view: { panX, panY }, notes: [] }
// (`version` is added by the serializer; `view`/`notes` may be absent in older data).
// Missing data is not an error: loadCatalogue resolves `[]` and readSheet resolves the
// empty sheet (see ./emptySheet). Corrupt data IS an error: both reject so the consumer
// can refuse to overwrite what is stored. Writers must never replace a corrupt catalogue.

// ── module-level singletons ──────────────────────────────────────────────────
// Async I/O pattern: exposes reactive status ('idle'|'saving'|'error') and error (string|null).
// The status ref lives on the save scheduler (created once, below) and is returned as `localStatus`.
const localError     = ref(null);    // string | null
const openSheetIds   = reactive([]);
const isFirstBoot    = ref(false);   // true only when storage was completely empty on this load
const catalogueUnreadable = ref(false);  // the stored catalogue failed to load — never write anything
const _pendingDelete = new Set();    // ids whose writes must be suppressed until deleted
const _unreadable    = new Set();    // ids whose stored data failed to load — never overwrite them

// Handlers supplied by the page. Every useSheetStorage() caller shares them so that
// auto-save, switchSheet and closeSheet behave identically whichever instance runs them.
const _handlers = {
    getCustomVizes: () => ({}),
    getPan:         () => ({ panX: 0, panY: 0 }),
    onPanLoaded:    () => {}
};

let initialised     = false;
let bootPromise     = null;
let pendingSwitchId = null;
let loading         = false;  // true while stores hold data that does not belong to activeSheetId
let scheduler       = null;   // created on the first useSheetStorage() call; shared by every caller

const strategy = _opfsAvailable() ? useOPFSStrategy() : useLSStrategy();

// ── OPFS availability check ──────────────────────────────────────────────────

function _opfsAvailable() {
    return typeof navigator !== 'undefined' &&
        typeof navigator.storage?.getDirectory === 'function';
}

// ── open-ids helpers ──────────────────────────────────────────────────────────

function _addToOpenIds(id) {
    if (!openSheetIds.includes(id)) {
        openSheetIds.push(id);
        writeOpenIds(openSheetIds);
    }
}

function _persistOpenIds() {
    writeOpenIds([...openSheetIds]);
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
        return catalogueUnreadable.value || loading || !id || _pendingDelete.has(id) || _unreadable.has(id);
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
            scheduler.status.value = 'idle';
        } catch (err) {
            scheduler.status.value = 'error';
            localError.value  = err.name === 'QuotaExceededError'
                ? 'Auto-save failed — your browser storage is full. Save your work as a file to avoid losing it.'
                : err.message;
        }
    }

    // ── load sheet data into stores ───────────────────────────────────────────

    // Reads + migrates + deserializes. A failure marks the id unreadable so auto-save
    // can never replace the stored data with the empty sheet shown in its place.
    async function _readSheet(id) {
        try {
            const sheet = await loadSheet(strategy, id);
            _unreadable.delete(id);
            return sheet;
        } catch (err) {
            _unreadable.add(id);
            scheduler.status.value = 'error';
            localError.value  = `This sheet could not be loaded (${err.message}). Auto-save is paused for it so its stored data is not overwritten.`;
            return { blocks: [], vizes: {}, view: { panX: 0, panY: 0 }, notes: [] };
        }
    }

    function _applyToStores({ blocks: loadedBlocks, view, notes: loadedNotes }) {
        const { suppress } = useHistory();
        suppress(() => {
            replaceBlocks(loadedBlocks);
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
        let catalogue;
        try {
            catalogue = await strategy.loadCatalogue();
        } catch (err) {
            // Not a first run — the catalogue exists but cannot be read. Creating a sheet here
            // would overwrite it and orphan every stored sheet, so stop and keep saves blocked.
            catalogueUnreadable.value = true;
            scheduler.status.value = 'error';
            localError.value  = `Your sheets could not be loaded (${err.message}). Auto-save is paused so the stored data is not overwritten.`;
            return;
        }

        if (catalogue.length === 0) {
            isFirstBoot.value = true;
            const now = new Date().toISOString();
            const id  = `sheet:local/${crypto.randomUUID()}`;
            const entry = { id, name: 'Untitled', createdAt: now, updatedAt: now };
            catalogue = [entry];
            await strategy.initSheet(id, 'Untitled');
            writeActiveId(id);
            writeOpenIds([id]);
        }

        for (const entry of catalogue) {
            registerSheet(entry.id, entry.name);
        }

        let activeId = readActiveId();
        if (!activeId || !catalogue.find(s => s.id === activeId)) {
            activeId = catalogue[0].id;
            writeActiveId(activeId);
        }

        const persistedOpen = readOpenIds([activeId]);
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

        scheduler.flush();

        loading = true;
        setActiveSheet(id, target.name);
        writeActiveId(id);
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
        if (catalogueUnreadable.value) {
            scheduler.status.value = 'error';
            localError.value  = 'Your sheets could not be loaded, so a new sheet cannot be created. Reload the page to try again.';
            return;
        }
        _applyToStores({ blocks: [], vizes: {}, view: { panX: 0, panY: 0 }, notes: [] });
        writeActiveId(id);
        _addToOpenIds(id);
        strategy.initSheet(id, name).catch((err) => {
            scheduler.status.value = 'error';
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

    // ── save scheduler + auto-save watcher (initialised once per singleton) ───

    if (!initialised) {
        initialised = true;
        scheduler = createSaveScheduler({ save: _saveCurrentSheet, isBlocked: _saveBlocked });
        watch(
            [blocks, _storeNotes, activeSheetName],
            () => { scheduler.schedule(); },
            { deep: true }
        );
    }

    function markPendingDelete(id) { _pendingDelete.add(id); }
    function unmarkPendingDelete(id) { _pendingDelete.delete(id); }

    return {
        localStatus: scheduler.status,
        localError,
        openSheetIds,
        isFirstBoot,
        catalogueUnreadable,
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
        scheduleSave: scheduler.schedule,
        flushSave: scheduler.flush
    };
}
