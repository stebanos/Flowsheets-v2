import { ref, reactive } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';

const deletingIds   = reactive(new Set());
const deletedNotice = ref(null);
let _noticeTimer    = null;

function _setDeletedNotice(name) {
    if (_noticeTimer) { clearTimeout(_noticeTimer); }
    deletedNotice.value = name;
    _noticeTimer = setTimeout(() => { deletedNotice.value = null; }, 3000);
}

export function useSheetManager() {
    const sheetStore = useSheetStore();
    const sheetStorage = useSheetStorage();

    function createSheet(name) {
        const resolvedName = name?.trim() || 'Untitled';
        const id = sheetStore.createSheet(resolvedName);
        sheetStorage.initNewSheet(id, resolvedName);
        return id;
    }

    async function deleteSheet(id) {
        const { sheets } = sheetStore;
        if (sheets.length <= 1) { return; }
        const name = sheets.find(s => s.id === id)?.name ?? 'Sheet';
        deletingIds.add(id);
        sheetStorage.closeSheet(id);
        await new Promise(resolve => requestAnimationFrame(resolve));
        await sheetStorage.persistDeleteSheet(id);
        sheetStore.deleteSheet(id);
        deletingIds.delete(id);
        _setDeletedNotice(name);
    }

    function renameSheet(id, name) {
        const trimmed = name?.trim();
        if (!trimmed) { return; }
        sheetStore.renameSheet(id, trimmed);
    }

    return {
        createSheet,
        deleteSheet,
        renameSheet,
        deletingIds,
        deletedNotice
    };
}
