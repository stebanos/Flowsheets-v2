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

// ── strategy ─────────────────────────────────────────────────────────────────

export function useOPFSStrategy() {
    async function loadCatalogue() {
        return _getAllSheets();
    }

    async function readSheet(id) {
        return _readSheetFile(id);
    }

    async function writeSheet(id, name, data) {
        const now = new Date().toISOString();
        await _writeSheetFile(id, data);
        const all = await _getAllSheets();
        const existing = all.find(s => s.id === id);
        await _putSheet({
            id,
            name,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        });
    }

    async function renameSheet(id, name) {
        const all = await _getAllSheets();
        const existing = all.find(s => s.id === id);
        if (!existing) { return; }
        await _putSheet({ ...existing, name, updatedAt: new Date().toISOString() });
    }

    async function deleteSheet(id) {
        await _deleteSheet(id);
        await _deleteSheetFile(id);
    }

    async function initSheet(id, name) {
        const now = new Date().toISOString();
        await _writeSheetFile(id, { blocks: [], customVizes: [] });
        await _putSheet({ id, name, createdAt: now, updatedAt: now });
    }

    return { loadCatalogue, readSheet, writeSheet, renameSheet, deleteSheet, initSheet };
}
