const KEY_CATALOGUE = 'flowsheets.v2.catalogue';
const KEY_SHEET     = (id) => `flowsheets.v2.sheet.${id}`;

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

export function useLSStrategy() {
    async function loadCatalogue() {
        return _readJson(KEY_CATALOGUE, []);
    }

    async function readSheet(id) {
        return _readJson(KEY_SHEET(id), { blocks: [], customVizes: [] });
    }

    async function writeSheet(id, name, data) {
        _writeJson(KEY_SHEET(id), data);
        const catalogue = _readJson(KEY_CATALOGUE, []);
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
        const catalogue = _readJson(KEY_CATALOGUE, []);
        const entry = catalogue.find(s => s.id === id);
        if (!entry) { return; }
        entry.name      = name;
        entry.updatedAt = new Date().toISOString();
        _writeJson(KEY_CATALOGUE, catalogue);
    }

    async function deleteSheet(id) {
        localStorage.removeItem(KEY_SHEET(id));
        const catalogue = _readJson(KEY_CATALOGUE, []);
        _writeJson(KEY_CATALOGUE, catalogue.filter(s => s.id !== id));
    }

    async function initSheet(id, name) {
        _writeJson(KEY_SHEET(id), { blocks: [], customVizes: [] });
        const catalogue = _readJson(KEY_CATALOGUE, []);
        if (!catalogue.find(s => s.id === id)) {
            const now = new Date().toISOString();
            catalogue.push({ id, name, createdAt: now, updatedAt: now });
            _writeJson(KEY_CATALOGUE, catalogue);
        }
    }

    return { loadCatalogue, readSheet, writeSheet, renameSheet, deleteSheet, initSheet };
}
