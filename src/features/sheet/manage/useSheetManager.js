import { ref } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';

const KEY_CATALOGUE = 'flowsheets.v2.catalogue';
const KEY_SHEET = (id) => `flowsheets.v2.sheet.${id}`;

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

// Module-level — shared across all callers
const renamingSheetId = ref(null);

export function useSheetManager() {
    const sheetStore = useSheetStore();
    const sheetStorage = useSheetStorage();

    function createSheet() {
        const id = sheetStore.createSheet();

        // Initialise empty storage entry
        _writeJson(KEY_SHEET(id), { blocks: [], customVizes: [] });

        // Add to open tabs
        const { openSheetIds } = sheetStorage;
        if (!openSheetIds.includes(id)) {
            openSheetIds.push(id);
        }

        sheetStorage.switchSheet(id);

        renamingSheetId.value = id;
    }

    function deleteSheet(id) {
        const { sheets } = sheetStore;
        if (sheets.length <= 1) { return; }

        sheetStorage.closeSheet(id);
        sheetStore.deleteSheet(id);
        localStorage.removeItem(KEY_SHEET(id));

        // Rebuild and persist catalogue from current store state
        const { sheets: remaining } = sheetStore;
        const catalogue = remaining.map(s => ({
            id: s.id,
            name: s.name,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));
        _writeJson(KEY_CATALOGUE, catalogue);
    }

    function renameSheet(id, name) {
        const trimmed = name?.trim();
        if (!trimmed) { return; }
        sheetStore.renameSheet(id, trimmed);
    }

    function clearRenamingId() {
        renamingSheetId.value = null;
    }

    return {
        renamingSheetId,
        clearRenamingId,
        createSheet,
        deleteSheet,
        renameSheet,
    };
}
