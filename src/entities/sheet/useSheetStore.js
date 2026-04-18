import { ref, reactive, computed } from 'vue';

// Module-level singletons — shared across all callers
const activeSheetId = ref(null);
const sheets = reactive([]);

const activeSheetName = computed(() => {
    const sheet = sheets.find(s => s.id === activeSheetId.value);
    return sheet ? sheet.name : 'Untitled';
});

function _now() {
    return new Date().toISOString();
}

function createSheet(name) {
    const id = `sheet:local/${crypto.randomUUID()}`;
    const resolvedName = name?.trim() || 'Untitled';
    sheets.push({ id, name: resolvedName, createdAt: _now(), updatedAt: _now() });
    activeSheetId.value = id;
    return id;
}

function deleteSheet(id) {
    const idx = sheets.findIndex(s => s.id === id);
    if (idx === -1) { return; }
    sheets.splice(idx, 1);
    if (activeSheetId.value !== id) { return; }
    if (sheets.length === 0) {
        activeSheetId.value = null;
        return;
    }
    // Switch to nearest remaining sheet
    const nearestIdx = Math.min(idx, sheets.length - 1);
    activeSheetId.value = sheets[nearestIdx].id;
}

function renameSheet(id, name) {
    const trimmed = name?.trim();
    if (!trimmed) { return false; }
    const sheet = sheets.find(s => s.id === id);
    if (!sheet) { return false; }
    sheet.name = trimmed;
    sheet.updatedAt = _now();
    return true;
}

/**
 * Upserts a sheet into the catalogue and sets it as active.
 * Use when registering sheets from persisted storage or after writing a new
 * sheet entry (e.g. bundle import) so the reactive catalogue stays in sync.
 */
function setActiveSheet(id, name) {
    activeSheetId.value = id;
    if (id === null) { return; }
    const existing = sheets.find(s => s.id === id);
    const resolvedName = name ?? 'Untitled';
    if (existing) {
        existing.name = resolvedName;
        existing.updatedAt = _now();
    } else {
        sheets.push({ id, name: resolvedName, createdAt: _now(), updatedAt: _now() });
    }
}

/**
 * Renames the currently active sheet. Convenience wrapper around renameSheet.
 * @param {string} name
 * @returns {boolean} false if name is empty after trim
 */
function renameActiveSheet(name) {
    return renameSheet(activeSheetId.value, name);
}

export function useSheetStore() {
    return {
        activeSheetId,
        activeSheetName,
        sheets,
        createSheet,
        deleteSheet,
        renameSheet,
        setActiveSheet,
        renameActiveSheet
    };
}
