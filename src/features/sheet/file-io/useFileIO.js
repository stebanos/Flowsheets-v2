import { ref } from 'vue';
import { deserializeSheet, migrate, serializeBundle, serializeSheet } from '@/shared/lib/persistence';
import { useBlockStore } from '@/entities/block';
import { useSheetStore } from '@/entities/sheet';

// Prevent Vite HMR from resetting module-level state (pendingImport would be lost on hot reload)
if (import.meta.hot) { import.meta.hot.decline(); }

import { useCustomViz } from '@/features/block/visualize';
import { useSheetStorage } from '@/features/sheet/storage';
import { useBundleImport } from './useBundleImport';

// Module-level singletons — shared across all callers
// { summary, data } | null
const pendingImport = ref(null);

function _triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function useFileIO() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { customVizes, loadVizes } = useCustomViz();
    const { activeSheetName, sheets, activeSheetId, setActiveSheet, createSheet: createSheetInStore } = useSheetStore();
    const { readSheetData, writeSheetData, switchSheet, initNewSheet, persistDeleteSheet } = useSheetStorage();

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

    async function exportSheet() {
        const suggestedName = _buildSuggestedName();
        const content = _buildContent();

        if ('showSaveFilePicker' in window) {
            let handle;
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [{ description: 'Flowsheets file', accept: { 'application/json': ['.flowsheet.json'] } }]
                });
            } catch (err) {
                if (err.name === 'AbortError') { return; }
                throw err;
            }
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        } else {
            _triggerDownload(suggestedName, content);
        }
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

        const newId = createSheetInStore(name);
        initNewSheet(newId, name);
        replaceBlocks(importedBlocks);
        loadVizes(vizes);

        pendingImport.value = null;
    }

    function cancelImport() {
        pendingImport.value = null;
    }

    // ── bundle export ─────────────────────────────────────────────────────────

    async function exportBundle() {
        const sheetEntries = await Promise.all(sheets.map(async (sheet) => {
            const stored = await readSheetData(sheet.id);
            return {
                id: sheet.id,
                name: sheet.name,
                blocks: stored?.blocks ?? [],
                vizes: stored?.customVizes ?? {}
            };
        }));

        const bundle = serializeBundle(sheetEntries, activeSheetId.value);
        const raw = activeSheetName.value ?? 'untitled';
        const sanitized = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const filename = `${sanitized || 'untitled'}.flowbundle.json`;
        _triggerDownload(filename, JSON.stringify(bundle, null, 2));
    }

    const bundleImport = useBundleImport({ sheets, writeSheetData, persistDeleteSheet, setActiveSheet, switchSheet });

    return {
        pendingImport,
        cancelImport,
        confirmImport,
        prepareImport,
        exportSheet,
        exportBundle,
        // bundle import state and actions from useBundleImport
        ...bundleImport
    };
}
