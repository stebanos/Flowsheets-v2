import { ref, reactive, watch } from 'vue';
import { serializeSheet, deserializeSheet } from '@/shared/lib/persistence';
import { useSheetStore } from '@/entities/sheet';
import { useBlockStore } from '@/entities/block';
import { useCustomViz } from '@/features/block/visualize';

// ── pointer keys (localStorage — small, fast) ────────────────────────────────
const KEY_ACTIVE_ID = 'flowsheets.v2.activeSheetId';
const KEY_OPEN_IDS  = 'flowsheets.v2.openSheetIds';

// ── localStorage fallback keys ────────────────────────────────────────────────
const KEY_CATALOGUE = 'flowsheets.v2.catalogue';
const KEY_SHEET     = (id) => `flowsheets.v2.sheet.${id}`;

// ── module-level singletons ──────────────────────────────────────────────────
const localStatus  = ref('idle');  // 'idle' | 'saving' | 'error'
const localError   = ref(null);    // string | null
const openSheetIds = reactive([]);

let initialised  = false;
let bootPromise  = null;

const useOPFS = _opfsAvailable();

// ── OPFS availability check ──────────────────────────────────────────────────

function _opfsAvailable() {
    return typeof navigator !== 'undefined' &&
        typeof navigator.storage?.getDirectory === 'function';
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────

const DB_NAME    = 'flowsheets';
const DB_VERSION = 1;
const STORE_NAME = 'sheets';

function _openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (evt) => {
            const db = evt.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = (evt) => resolve(evt.target.result);
        req.onerror   = (evt) => reject(evt.target.error);
    });
}

async function _getAllSheets() {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req   = store.getAll();
        req.onsuccess = (evt) => resolve(evt.target.result);
        req.onerror   = (evt) => reject(evt.target.error);
    });
}

async function _putSheet(record) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req   = store.put(record);
        req.onsuccess = (evt) => resolve(evt.target.result);
        req.onerror   = (evt) => reject(evt.target.error);
    });
}

async function _deleteSheet(id) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req   = store.delete(id);
        req.onsuccess = (evt) => resolve(evt.target.result);
        req.onerror   = (evt) => reject(evt.target.error);
    });
}

// ── OPFS helpers ─────────────────────────────────────────────────────────────

// Sheet IDs contain ':' and '/' which are invalid in OPFS filenames on some
// platforms. Encode to a safe hex string that round-trips losslessly.
function _safeFilename(id) {
    return Array.from(id).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '.json';
}

async function _getSheetDir() {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle('sheets', { create: true });
}

async function _readSheetFile(id) {
    try {
        const dir    = await _getSheetDir();
        const handle = await dir.getFileHandle(_safeFilename(id));
        const file   = await handle.getFile();
        const text   = await file.text();
        return JSON.parse(text);
    } catch {
        return { blocks: [], customVizes: [] };
    }
}

async function _writeSheetFile(id, data) {
    const dir      = await _getSheetDir();
    const handle   = await dir.getFileHandle(_safeFilename(id), { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
}

async function _deleteSheetFile(id) {
    try {
        const dir = await _getSheetDir();
        await dir.removeEntry(_safeFilename(id));
    } catch {
        // file may not exist — ignore
    }
}

// ── localStorage helpers (fallback + pointer reads) ──────────────────────────

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
    const { customVizes, activeVizName, loadVizes } = useCustomViz();
    const { activeSheetId, activeSheetName, setActiveSheet } = useSheetStore();

    let loading = false;
    let saveTimer = null;

    // ── save ──────────────────────────────────────────────────────────────────

    async function _saveCurrentSheetOPFS() {
        if (!activeSheetId.value) { return; }
        const id = activeSheetId.value;
        const name = activeSheetName.value;
        try {
            const serialized = serializeSheet(blocks, customVizes, name);
            await _writeSheetFile(id, { blocks: serialized.blocks, customVizes: serialized.customVizes });

            // Refresh metadata in IndexedDB
            const now = new Date().toISOString();
            const existing = (await _getAllSheets()).find(s => s.id === id);
            await _putSheet({
                id,
                name,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now
            });

            localStatus.value = 'idle';
        } catch (err) {
            localStatus.value = 'error';
            localError.value  = err.message;
        }
    }

    function _saveCurrentSheetLS() {
        if (!activeSheetId.value) { return; }
        const id   = activeSheetId.value;
        const name = activeSheetName.value;
        try {
            const serialized = serializeSheet(blocks, customVizes, name);
            _writeJson(KEY_SHEET(id), { blocks: serialized.blocks, customVizes: serialized.customVizes });

            const catalogue = _readJson(KEY_CATALOGUE, []);
            const entry = catalogue.find(s => s.id === id);
            if (entry) {
                entry.name      = name;
                entry.updatedAt = new Date().toISOString();
            }
            _writeJson(KEY_CATALOGUE, catalogue);

            localStatus.value = 'idle';
        } catch (err) {
            localStatus.value = 'error';
            localError.value  = err.name === 'QuotaExceededError'
                ? 'Auto-save failed — your browser storage is full. Save your work as a file to avoid losing it.'
                : err.message;
        }
    }

    function _saveCurrentSheet() {
        if (useOPFS) {
            // Fire-and-forget; errors surface through localStatus/localError
            _saveCurrentSheetOPFS();
        } else {
            _saveCurrentSheetLS();
        }
    }

    function _scheduleSave() {
        if (saveTimer !== null) { clearTimeout(saveTimer); }
        localStatus.value = 'saving';
        saveTimer = setTimeout(() => {
            saveTimer = null;
            _saveCurrentSheet();
        }, 500);
    }

    // ── load sheet data into stores ───────────────────────────────────────────

    async function _loadSheetIntoStoresOPFS(id) {
        const data = await _readSheetFile(id);
        const { blocks: loadedBlocks, vizes } = deserializeSheet({
            version:     1,
            blocks:      data.blocks      ?? [],
            customVizes: data.customVizes ?? {}
        });
        replaceBlocks(loadedBlocks);
        loadVizes(vizes);
    }

    function _loadSheetIntoStoresLS(id) {
        const data = _readJson(KEY_SHEET(id), null);
        if (!data) {
            replaceBlocks([]);
            loadVizes({});
            return;
        }
        const { blocks: loadedBlocks, vizes } = deserializeSheet({
            version:     1,
            blocks:      data.blocks      ?? [],
            customVizes: data.customVizes ?? {}
        });
        replaceBlocks(loadedBlocks);
        loadVizes(vizes);
    }

    // ── loadFromStorage ───────────────────────────────────────────────────────

    async function _loadFromStorageOPFS() {
        loading = true;

        let catalogue;
        try {
            catalogue = await _getAllSheets();
        } catch (err) {
            console.warn('[useSheetStorage] IDB read failed, falling back to localStorage:', err);
            _loadFromStorageLS();
            return;
        }

        // Bootstrap: no data at all → create a fresh sheet
        if (catalogue.length === 0) {
            const now = new Date().toISOString();
            const id  = `sheet:local/${crypto.randomUUID()}`;
            const entry = { id, name: 'Untitled', createdAt: now, updatedAt: now };
            catalogue = [entry];
            await _putSheet(entry);
            await _writeSheetFile(id, { blocks: [], customVizes: [] });
            localStorage.setItem(KEY_ACTIVE_ID, id);
            _writeJson(KEY_OPEN_IDS, [id]);
        }

        // Restore catalogue into sheet store
        for (const entry of catalogue) {
            setActiveSheet(entry.id, entry.name);
        }

        // Determine active sheet
        let activeId = localStorage.getItem(KEY_ACTIVE_ID);
        if (!activeId || !catalogue.find(s => s.id === activeId)) {
            activeId = catalogue[0].id;
            localStorage.setItem(KEY_ACTIVE_ID, activeId);
        }

        // Restore open tab IDs
        const persistedOpen = _readJson(KEY_OPEN_IDS, [activeId]);
        const validOpen     = persistedOpen.filter(id => catalogue.find(s => s.id === id));
        if (!validOpen.includes(activeId)) { validOpen.unshift(activeId); }
        openSheetIds.splice(0, openSheetIds.length, ...validOpen);

        // Activate the sheet in the store
        const activeEntry = catalogue.find(s => s.id === activeId);
        setActiveSheet(activeId, activeEntry?.name ?? 'Untitled');

        // Load block + viz data for the active sheet
        await _loadSheetIntoStoresOPFS(activeId);

        loading = false;
    }

    function _loadFromStorageLS() {
        loading = true;

        let catalogue = _readJson(KEY_CATALOGUE, []);

        if (catalogue.length === 0) {
            const now = new Date().toISOString();
            const id  = `sheet:local/${crypto.randomUUID()}`;
            catalogue = [{ id, name: 'Untitled', createdAt: now, updatedAt: now }];
            _writeJson(KEY_CATALOGUE, catalogue);
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

        _loadSheetIntoStoresLS(activeId);

        loading = false;
    }

    function loadFromStorage() {
        if (!bootPromise) {
            if (useOPFS) {
                bootPromise = _loadFromStorageOPFS();
            } else {
                _loadFromStorageLS();
                bootPromise = Promise.resolve();
            }
        }
        return bootPromise;
    }

    // ── switchSheet ───────────────────────────────────────────────────────────

    async function _switchSheetOPFS(id) {
        if (id === activeSheetId.value) { return; }
        const { sheets: allSheets } = useSheetStore();
        const target = allSheets.find(s => s.id === id);
        if (!target) { return; }

        _saveCurrentSheet();

        loading = true;
        setActiveSheet(id, target.name);
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);
        await _loadSheetIntoStoresOPFS(id);
        loading = false;
    }

    function _switchSheetLS(id) {
        if (id === activeSheetId.value) { return; }
        const { sheets: allSheets } = useSheetStore();
        const target = allSheets.find(s => s.id === id);
        if (!target) { return; }

        _saveCurrentSheet();

        loading = true;
        setActiveSheet(id, target.name);
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);
        _loadSheetIntoStoresLS(id);
        loading = false;
    }

    function switchSheet(id) {
        if (useOPFS) {
            return _switchSheetOPFS(id);
        }
        _switchSheetLS(id);
    }

    // ── initNewSheet ──────────────────────────────────────────────────────────

    function initNewSheet(id, name) {
        replaceBlocks([]);
        loadVizes({});
        localStorage.setItem(KEY_ACTIVE_ID, id);
        _addToOpenIds(id);

        if (useOPFS) {
            _initNewSheetOPFS(id, name);
        } else {
            const now = new Date().toISOString();
            _writeJson(KEY_SHEET(id), { blocks: [], customVizes: [] });
            const catalogue = _readJson(KEY_CATALOGUE, []);
            if (!catalogue.find(s => s.id === id)) {
                catalogue.push({ id, name, createdAt: now, updatedAt: now });
                _writeJson(KEY_CATALOGUE, catalogue);
            }
        }
    }

    async function _initNewSheetOPFS(id, name) {
        try {
            const now = new Date().toISOString();
            await _writeSheetFile(id, { blocks: [], customVizes: [] });
            await _putSheet({ id, name, createdAt: now, updatedAt: now });
        } catch (err) {
            localStatus.value = 'error';
            localError.value  = err.message;
        }
    }

    // ── persistDeleteSheet ────────────────────────────────────────────────────

    async function persistDeleteSheet(id) {
        if (useOPFS) {
            await _deleteSheet(id);
            await _deleteSheetFile(id);
        } else {
            localStorage.removeItem(KEY_SHEET(id));
            const catalogue = _readJson(KEY_CATALOGUE, []);
            _writeJson(KEY_CATALOGUE, catalogue.filter(s => s.id !== id));
        }
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

    // ── auto-save watcher (initialised once per singleton) ───────────────────

    if (!initialised) {
        initialised = true;
        watch(
            [blocks, customVizes, activeVizName, activeSheetName],
            () => {
                if (loading) { return; }
                _scheduleSave();
            },
            { deep: true }
        );
    }

    return {
        localStatus,
        localError,
        openSheetIds,
        loadFromStorage,
        switchSheet,
        closeSheet,
        initNewSheet,
        persistDeleteSheet
    };
}
