import { ref, watch } from 'vue';
import { useBlockStore } from '@/entities/block';

// Prevent Vite HMR from resetting module-level state (fileHandle would be lost on hot reload)
if (import.meta.hot) { import.meta.hot.decline(); }
import { useCustomViz } from '@/features/block/visualize';
import { useSheetStore } from '@/entities/sheet';
import { serializeSheet, deserializeSheet, migrate } from '@/shared/lib/persistence';

// Module-level singletons — shared across all callers (BlockEditorPage + TopBar)
const fileHandle = ref(null);
const fileName = ref(null);
// null | 'saving' | 'saved' | 'ambient' | 'dirty'
const fileStatus = ref(null);
const fileDirty = ref(false);
// { summary, data } | null
const pendingImport = ref(null);

let initialised = false;
let trackDirty = false;
let savedStatusTimer = null;

function _triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function _onSaveSuccess() {
    fileDirty.value = false;
    trackDirty = true;
    fileStatus.value = 'saved';
    clearTimeout(savedStatusTimer);
    savedStatusTimer = setTimeout(() => {
        if (fileStatus.value === 'saved') { fileStatus.value = 'ambient'; }
    }, 3500);
}

export function useFileIO() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { customVizes, loadVizes } = useCustomViz();
    const { activeSheetName, renameActiveSheet } = useSheetStore();

    if (!initialised) {
        initialised = true;
        watch(
            [blocks, customVizes],
            () => {
                if (trackDirty) { fileDirty.value = true; fileStatus.value = 'dirty'; }
            },
            { deep: true }
        );
    }

    function _buildSuggestedName() {
        const raw = activeSheetName.value ?? 'untitled';
        const sanitized = raw
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        return `${sanitized || 'untitled'}.flowsheet.json`;
    }

    function _buildContent() {
        return JSON.stringify(serializeSheet(blocks, customVizes, activeSheetName.value), null, 2);
    }

    async function saveSheet() {
        fileStatus.value = 'saving';
        const suggestedName = _buildSuggestedName();
        const content = _buildContent();

        try {
            if ('showSaveFilePicker' in window) {
                if (fileHandle.value === null) {
                    fileHandle.value = await window.showSaveFilePicker({
                        suggestedName,
                        types: [{ description: 'Flowsheets file', accept: { 'application/json': ['.flowsheet.json'] } }]
                    });
                }
                const writable = await fileHandle.value.createWritable();
                await writable.write(content);
                await writable.close();
                fileName.value = fileHandle.value.name;
            } else {
                _triggerDownload(suggestedName, content);
                fileName.value = suggestedName;
            }
            _onSaveSuccess();
        } catch (err) {
            if (err.name === 'AbortError') {
                fileStatus.value = fileDirty.value ? 'dirty' : null;
                return;
            }
            fileStatus.value = null;
            throw err;
        }
    }

    async function saveSheetAs() {
        fileHandle.value = null;
        await saveSheet();
    }

    async function prepareImport(file) {
        let text;
        try {
            text = await file.text();
        } catch (_err) {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets file.' };
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets file.' };
        }

        try {
            json = migrate(json);
        } catch (err) {
            return { error: err.message };
        }

        let importedBlocks;
        let importedVizes;
        let importedName;
        try {
            const result = deserializeSheet(json);
            importedBlocks = result.blocks;
            importedVizes = result.vizes ?? {};
            importedName = result.name ?? 'Untitled';
        } catch (_err) {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets file.' };
        }

        // Resolve viz name conflicts
        const renamedVizes = {};
        const resolvedVizes = {};

        for (const [name, vizData] of Object.entries(importedVizes)) {
            const existing = customVizes[name];
            if (existing && existing.source !== vizData.source) {
                // Name collision with different source — rename
                let candidate = `${name}-1`;
                let counter = 1;
                while (customVizes[candidate] || resolvedVizes[candidate]) {
                    counter++;
                    candidate = `${name}-${counter}`;
                }
                renamedVizes[name] = candidate;
                resolvedVizes[candidate] = vizData;
            } else {
                resolvedVizes[name] = vizData;
            }
        }

        // Update block vizOptions references to match renamed vizes
        const resolvedBlocks = importedBlocks.map(block => {
            const vizName = block.vizOptions?.customVizName;
            if (vizName && renamedVizes[vizName]) {
                return {
                    ...block,
                    vizOptions: { ...block.vizOptions, customVizName: renamedVizes[vizName] }
                };
            }
            return block;
        });

        pendingImport.value = {
            summary: {
                name: importedName,
                blockCount: resolvedBlocks.length,
                vizCount: Object.keys(resolvedVizes).length,
                renamedVizes
            },
            data: {
                blocks: resolvedBlocks,
                vizes: resolvedVizes,
                name: importedName
            }
        };

        return { pending: true };
    }

    function confirmImport() {
        if (!pendingImport.value) { return; }
        const { blocks: importedBlocks, vizes, name } = pendingImport.value.data;

        replaceBlocks(importedBlocks);

        loadVizes(vizes);
        renameActiveSheet(name);

        fileHandle.value = null;
        fileName.value = null;
        fileStatus.value = null;
        fileDirty.value = false;
        trackDirty = false;

        pendingImport.value = null;
    }

    function cancelImport() {
        pendingImport.value = null;
    }

    return {
        fileStatus,
        fileName,
        fileDirty,
        pendingImport,
        cancelImport,
        confirmImport,
        prepareImport,
        saveSheet,
        saveSheetAs
    };
}
