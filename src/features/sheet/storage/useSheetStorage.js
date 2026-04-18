import { ref, reactive, watch } from 'vue';
import { serializeSheet, deserializeSheet, migrate } from '@/shared/lib/persistence';
import { useSheetStore } from '@/entities/sheet';
import { useBlockStore } from '@/entities/block';
import { useOPFSStrategy } from './useOPFSStrategy';
import { useLSStrategy } from './useLSStrategy';

// ── pointer keys (localStorage — small, fast) ────────────────────────────────
const KEY_ACTIVE_ID = 'flowsheets.v2.activeSheetId';
const KEY_OPEN_IDS  = 'flowsheets.v2.openSheetIds';

// ── module-level singletons ──────────────────────────────────────────────────
const localStatus    = ref('idle');  // 'idle' | 'saving' | 'error'
const localError     = ref(null);    // string | null
const openSheetIds   = reactive([]);
const _pendingDelete = new Set();    // ids whose writes must be suppressed until deleted

let initialised  = false;
let bootPromise  = null;
let pendingSwitchId = null;

// ── viz handlers (registered by the page to avoid cross-domain coupling) ─────
let _customVizGetter = () => ({});
let _onVizesLoaded   = (_vizes) => {};

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

export function useSheetStorage() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { activeSheetId, activeSheetName, setActiveSheet } = useSheetStore();

    let loading = false;
    let saveTimer = null;

    // ── save ──────────────────────────────────────────────────────────────────

    async function _saveCurrentSheet() {
        if (!activeSheetId.value) { return; }
        const id   = activeSheetId.value;
        if (_pendingDelete.has(id)) { return; }
        const name = activeSheetName.value;
        try {
            const serialized = serializeSheet(blocks, _customVizGetter(), name);
            if (_pendingDelete.has(id)) { return; }
            await strategy.writeSheet(id, name, { blocks: serialized.blocks, customVizes: serialized.customVizes });
            localStatus.value = 'idle';
        } catch (err) {
            localStatus.value = 'error';
            localError.value  = err.name === 'QuotaExceededError'
                ? 'Auto-save failed — your browser storage is full. Save your work as a file to avoid losing it.'
                : err.message;
        }
    }

    function _scheduleSave() {
        if (loading) { return; }
        if (saveTimer !== null) { clearTimeout(saveTimer); }
        localStatus.value = 'saving';
        saveTimer = setTimeout(() => {
            saveTimer = null;
            _saveCurrentSheet();
        }, 500);
    }

    // ── load sheet data into stores ───────────────────────────────────────────

    async function _loadSheetIntoStores(id) {
        const raw  = await strategy.readSheet(id);
        const envelope = {
            version:     raw.version     ?? 1,
            blocks:      raw.blocks      ?? [],
            customVizes: raw.customVizes ?? {}
        };
        const data = migrate(envelope);
        const { blocks: loadedBlocks, vizes } = deserializeSheet(data);
        replaceBlocks(loadedBlocks);
        _onVizesLoaded(vizes);
    }

    // ── loadFromStorage ───────────────────────────────────────────────────────

    async function _boot() {
        loading = true;

        let catalogue = await strategy.loadCatalogue();

        if (catalogue.length === 0) {
            const now = new Date().toISOString();
            const id  = `sheet:local/${crypto.randomUUID()}`;
            const entry = { id, name: 'Untitled', createdAt: now, updatedAt: now };
            catalogue = [entry];
            await strategy.initSheet(id, 'Untitled');
            localStorage.setItem(KEY_ACTIVE_ID, id);
            _writeJson(KEY_OPEN_IDS, [id]);
        }

        for (const entry of catalogue) {
            setActiveSheet(entry.id, entry.name);
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

        await _loadSheetIntoStores(activeId);

        loading = false;
    }

    function loadFromStorage() {
        if (!bootPromise) {
            bootPromise = _boot();
        }
        return bootPromise;
    }

    // ── switchSheet ───────────────────────────────────────────────────────────

    async function switchSheet(id) {
        if (id === activeSheetId.value) { return; }
        const { sheets: allSheets } = useSheetStore();
        const target = allSheets.find(s => s.id === id);
        if (!target) { return; }

        _saveCurrentSheet();

        loading = true;
        setActiveSheet(id, target.name);
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);

        pendingSwitchId = id;
        const data = await strategy.readSheet(id);
        if (pendingSwitchId !== id) {
            loading = false;
            return;
        }
        pendingSwitchId = null;

        const envelope = {
            version:     data.version     ?? 1,
            blocks:      data.blocks      ?? [],
            customVizes: data.customVizes ?? {}
        };
        const migrated = migrate(envelope);
        const { blocks: loadedBlocks, vizes } = deserializeSheet(migrated);
        replaceBlocks(loadedBlocks);
        _onVizesLoaded(vizes);
        loading = false;
    }

    // ── initNewSheet ──────────────────────────────────────────────────────────

    function initNewSheet(id, name) {
        replaceBlocks([]);
        _onVizesLoaded({});
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

        if (activeSheetId.value !== id) { return; }

        if (openSheetIds.length === 0) { return; }

        const nearestIdx = Math.min(idx, openSheetIds.length - 1);
        switchSheet(openSheetIds[nearestIdx]);
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
            [blocks, activeSheetName],
            () => { _scheduleSave(); },
            { deep: true }
        );
    }

    function markPendingDelete(id) { _pendingDelete.add(id); }
    function unmarkPendingDelete(id) { _pendingDelete.delete(id); }

    function registerVizHandlers(getCustomVizes, onVizesLoaded) {
        _customVizGetter = getCustomVizes;
        _onVizesLoaded   = onVizesLoaded;
    }

    return {
        localStatus,
        localError,
        openSheetIds,
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
        registerVizHandlers
    };
}
