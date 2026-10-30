// ── pointer keys (localStorage — small, fast) ────────────────────────────────
// The active sheet id and the open-tab list are the only things the storage
// segment keeps in localStorage regardless of the strategy in use.

export const KEY_ACTIVE_ID = 'flowsheets.v2.activeSheetId';
export const KEY_OPEN_IDS  = 'flowsheets.v2.openSheetIds';

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

export function readActiveId() {
    return localStorage.getItem(KEY_ACTIVE_ID);
}

export function writeActiveId(id) {
    localStorage.setItem(KEY_ACTIVE_ID, id);
}

export function readOpenIds(fallback) {
    return _readJson(KEY_OPEN_IDS, fallback);
}

export function writeOpenIds(ids) {
    _writeJson(KEY_OPEN_IDS, ids);
}
