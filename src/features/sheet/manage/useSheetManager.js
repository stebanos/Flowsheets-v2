import { ref, reactive } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';

const deletingIds   = reactive(new Set());
const deletedNotice = ref(null);
const deleteError   = ref(null);
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
        if (deletingIds.has(id)) { return; }
        const { sheets } = sheetStore;
        if (sheets.length <= 1) { return; }
        const name = sheets.find(s => s.id === id)?.name ?? 'Sheet';
        deleteError.value = null;
        deletingIds.add(id);
        sheetStorage.markPendingDelete(id);
        try {
            sheetStorage.closeSheet(id);
            // one frame so Vue renders the sheet switch before the storage delete
            await new Promise(resolve => requestAnimationFrame(resolve));
            await sheetStorage.persistDeleteSheet(id);
            sheetStore.deleteSheet(id);
            _setDeletedNotice(name);
        } catch (err) {
            deleteError.value = err.message;
        } finally {
            deletingIds.delete(id);
            sheetStorage.unmarkPendingDelete(id);
        }
    }

    function renameSheet(id, name) {
        const trimmed = name?.trim();
        if (!trimmed) { return; }
        sheetStore.renameSheet(id, trimmed);
        sheetStorage.persistRenameSheet(id, trimmed);
    }

    return {
        createSheet,
        deleteSheet,
        renameSheet,
        deletingIds,
        deletedNotice,
        deleteError
    };
}
