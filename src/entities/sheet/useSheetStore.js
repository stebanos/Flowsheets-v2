import { ref } from 'vue';

// Module-level singletons — shared across all callers
const activeSheetId = ref(null);
const activeSheetName = ref('Untitled');

function createSheetId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function setActiveSheet(id, name) {
    activeSheetId.value = id;
    activeSheetName.value = name ?? 'Untitled';
}

/**
 * Update the name of the active sheet (reactive state only — persistence
 * is handled by the pages layer).
 * @param {string} name
 * @returns {boolean} false if name is empty after trim
 */
function renameActiveSheet(name) {
    const trimmed = name.trim();
    if (!trimmed) { return false; }
    activeSheetName.value = trimmed;
    return true;
}

/**
 * Returns the active sheet id and name.
 * @returns {{ id: string, name: string }}
 */
function ensureActiveSheet() {
    return { id: activeSheetId.value, name: activeSheetName.value };
}

export function useSheetStore() {
    return { activeSheetId, activeSheetName, setActiveSheet, createSheetId, renameActiveSheet, ensureActiveSheet };
}
