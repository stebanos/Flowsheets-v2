import { ref } from 'vue';

// Module-level singletons — shared across all callers
const activeSheetId = ref(null);
const activeSheetName = ref('Untitled');
let initialised = false;

function _newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function _saveSheets(sheets) {
    localStorage.setItem('flowsheets.sheets', JSON.stringify(sheets));
}

function _init() {
    const sheetsRaw = localStorage.getItem('flowsheets.sheets');
    const sheets = sheetsRaw ? JSON.parse(sheetsRaw) : {};
    let id = localStorage.getItem('flowsheets.activeSheet');
    if (!id || !sheets[id]) {
        id = _newId();
        sheets[id] = { name: 'Untitled' };
        _saveSheets(sheets);
        localStorage.setItem('flowsheets.activeSheet', id);
    }
    activeSheetId.value = id;
    activeSheetName.value = sheets[id].name ?? 'Untitled';
}

/**
 * Update the name of the active sheet.
 * @param {string} name
 * @returns {boolean} false if name is empty after trim
 */
function renameActiveSheet(name) {
    const trimmed = name.trim();
    if (!trimmed) { return false; }
    activeSheetName.value = trimmed;
    const sheetsRaw = localStorage.getItem('flowsheets.sheets');
    const sheets = sheetsRaw ? JSON.parse(sheetsRaw) : {};
    if (sheets[activeSheetId.value]) {
        sheets[activeSheetId.value].name = trimmed;
    } else {
        sheets[activeSheetId.value] = { name: trimmed };
    }
    _saveSheets(sheets);
    return true;
}

/**
 * Returns the active sheet id and name.
 * Used by useLocalStorage when saving — ensures there is always an active sheet.
 * @returns {{ id: string, name: string }}
 */
function ensureActiveSheet() {
    return { id: activeSheetId.value, name: activeSheetName.value };
}

export function useSheetStore() {
    if (!initialised) { _init(); initialised = true; }
    return { activeSheetId, activeSheetName, renameActiveSheet, ensureActiveSheet };
}
