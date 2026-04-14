import { ref, watch } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useCustomViz } from '@/features/block/visualize';
import { useSheetStore } from '@/entities/sheet';
import { serializeSheet, deserializeSheet } from '@/shared/lib/persistence';

// Module-level singletons — shared across all callers (BlockEditorPage + TopBar)
// Values: null | 'saving' | 'saved' | 'restored' | 'error'
const localStatus = ref(null);
const localError = ref(null);

let initialised = false;

export function useLocalStorage() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { customVizes, activeVizName, loadVizes } = useCustomViz();
    const { activeSheetName, setActiveSheet, createSheetId, ensureActiveSheet } = useSheetStore();

    // Plain variable — not reactive, only read inside watcher callback
    let loading = false;
    let saveTimer = null;

    function _save() {
        const { id, name } = ensureActiveSheet();
        try {
            const serialized = serializeSheet(blocks, customVizes, name);
            const sheetsRaw = localStorage.getItem('flowsheets.sheets');
            const sheets = sheetsRaw ? JSON.parse(sheetsRaw) : {};
            sheets[id] = { name, blocks: serialized.blocks };
            localStorage.setItem('flowsheets.sheets', JSON.stringify(sheets));
            localStorage.setItem('flowsheets.customVizes', JSON.stringify(serialized.customVizes));
            if (activeVizName.value) { localStorage.setItem('flowsheets.activeVizName', activeVizName.value); }
            localStatus.value = 'saved';
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                localStatus.value = 'error';
                localError.value = 'Auto-save failed — your browser storage is full. Save your work as a file to avoid losing it.';
            } else {
                localStatus.value = 'error';
                localError.value = err.message;
            }
        }
    }

    function _scheduleSave() {
        if (saveTimer !== null) { clearTimeout(saveTimer); }
        localStatus.value = 'saving';
        saveTimer = setTimeout(() => {
            saveTimer = null;
            _save();
        }, 500);
    }

    function loadFromStorage() {
        loading = true;

        // Bootstrap: ensure an active sheet exists in storage
        const sheetsRaw = localStorage.getItem('flowsheets.sheets');
        const sheets = sheetsRaw ? JSON.parse(sheetsRaw) : {};
        let id = localStorage.getItem('flowsheets.activeSheet');
        if (!id || !sheets[id]) {
            id = createSheetId();
            sheets[id] = { name: 'Untitled' };
            localStorage.setItem('flowsheets.sheets', JSON.stringify(sheets));
            localStorage.setItem('flowsheets.activeSheet', id);
        }
        setActiveSheet(id, sheets[id].name ?? 'Untitled');

        const sheetData = sheets[id];

        if (sheetData?.blocks) {
            const vizesRaw = localStorage.getItem('flowsheets.customVizes');
            const savedVizes = vizesRaw ? JSON.parse(vizesRaw) : {};

            const { blocks: loadedBlocks } = deserializeSheet({
                version: 1,
                name: sheetData.name ?? 'Untitled',
                blocks: sheetData.blocks,
                customVizes: savedVizes
            });

            replaceBlocks(loadedBlocks);

            loadVizes(savedVizes);
            const savedActive = localStorage.getItem('flowsheets.activeVizName');
            if (savedActive && customVizes[savedActive]) { activeVizName.value = savedActive; }

            localStatus.value = 'restored';
            setTimeout(() => {
                if (localStatus.value === 'restored') { localStatus.value = 'saved'; }
            }, 2500);
        } else {
            // First open — no saved data
            localStatus.value = null;
        }

        loading = false;
    }

    if (!initialised) {
        initialised = true;
        watch(
            [blocks, customVizes, activeVizName, activeSheetName],
            () => {
                if (loading) { return; }
                _scheduleSave();
            },
            { deep: true }
        );
    }

    return { localStatus, localError, loadFromStorage };
}
