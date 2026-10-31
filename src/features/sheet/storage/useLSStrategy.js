import { emptySheet } from './emptySheet';
import { KEY_CATALOGUE, KEY_SHEET } from './storageKeys';

// Throws on corrupt data (unparseable, or not an array) so no caller can
// replace an existing catalogue with a fresh one. A missing key is an empty catalogue.
function _readCatalogue() {
    const raw = localStorage.getItem(KEY_CATALOGUE);
    if (raw === null) { return []; }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) { throw new Error('Sheet catalogue is not an array'); }
    return parsed;
}

function _writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function useLSStrategy() {
    // Throws on corrupt data so the caller can refuse to overwrite it.
    async function loadCatalogue() {
        return _readCatalogue();
    }

    // Throws on corrupt data so the caller can refuse to overwrite it.
    async function readSheet(id) {
        const raw = localStorage.getItem(KEY_SHEET(id));
        return raw ? JSON.parse(raw) : emptySheet();
    }

    async function writeSheet(id, name, data) {
        const catalogue = _readCatalogue();
        _writeJson(KEY_SHEET(id), data);
        const now = new Date().toISOString();
        const idx = catalogue.findIndex(s => s.id === id);
        if (idx !== -1) {
            catalogue[idx].name      = name;
            catalogue[idx].updatedAt = now;
        } else {
            catalogue.push({ id, name, createdAt: now, updatedAt: now });
        }
        _writeJson(KEY_CATALOGUE, catalogue);
    }

    async function renameSheet(id, name) {
        const catalogue = _readCatalogue();
        const entry = catalogue.find(s => s.id === id);
        if (!entry) { return; }
        entry.name      = name;
        entry.updatedAt = new Date().toISOString();
        _writeJson(KEY_CATALOGUE, catalogue);
    }

    async function deleteSheet(id) {
        const catalogue = _readCatalogue();
        localStorage.removeItem(KEY_SHEET(id));
        _writeJson(KEY_CATALOGUE, catalogue.filter(s => s.id !== id));
    }

    async function initSheet(id, name) {
        const catalogue = _readCatalogue();
        _writeJson(KEY_SHEET(id), emptySheet());
        if (!catalogue.find(s => s.id === id)) {
            const now = new Date().toISOString();
            catalogue.push({ id, name, createdAt: now, updatedAt: now });
            _writeJson(KEY_CATALOGUE, catalogue);
        }
    }

    return { loadCatalogue, readSheet, writeSheet, renameSheet, deleteSheet, initSheet };
}
