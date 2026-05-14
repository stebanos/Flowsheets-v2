import { ref } from 'vue';
import { deserializeSheet, migrate, serializeBundle, serializeSheet } from '@/shared/lib/persistence';
import { useBlockStore } from '@/entities/block';
import { useNoteStore } from '@/entities/note';
import { useSheetStore } from '@/entities/sheet';
import { useVizLibrary } from '@/entities/viz';
import { getHash } from '@/shared/lib/hash';

// Prevent Vite HMR from resetting module-level state (pendingImport would be lost on hot reload)
if (import.meta.hot) { import.meta.hot.decline(); }

import { useCustomViz } from '@/features/block/visualize';
import { useSheetStorage } from '@/features/sheet/storage';
import { useBundleImport } from './useBundleImport';

// Module-level singletons — shared across all callers
// { summary, data, conflicts } | null
const pendingImport = ref(null);
// { [importedName]: { action: 'use-system' | 'add-as-new' | 'remap', targetName?: string } }
const conflictResolutions = ref({});

function _triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function _nextAvailableName(baseName) {
    const { library } = useVizLibrary();
    let n = 2;
    while (library[`${baseName}-${n}`]) { n++; }
    return `${baseName}-${n}`;
}

export function useFileIO() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { notes, replaceNotes } = useNoteStore();
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
        return JSON.stringify(serializeSheet(blocks, customVizes, activeSheetName.value, null, notes), null, 2);
    }

    async function exportSheet(sheetId = null) {
        let suggestedName, content;

        if (sheetId) {
            const stored = await readSheetData(sheetId);
            const name = sheets.find(s => s.id === sheetId)?.name ?? 'untitled';
            const sanitized = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            suggestedName = `${sanitized || 'untitled'}.flowsheet.json`;
            content = JSON.stringify(serializeSheet(stored?.blocks ?? [], stored?.customVizes ?? {}, name, null, stored?.notes ?? []), null, 2);
        } else {
            suggestedName = _buildSuggestedName();
            content = _buildContent();
        }

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
            json = await migrate(json);
        } catch (err) {
            return { error: err.message };
        }

        let importedBlocks;
        let importedVizes;
        let importedName;
        let importedNotes;
        try {
            const result = deserializeSheet(json);
            importedBlocks = result.blocks;
            importedVizes = result.vizes ?? {};
            importedName = result.name ?? 'Untitled';
            importedNotes = result.notes ?? [];
        } catch (_err) {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets file.' };
        }

        const { library } = useVizLibrary();

        // Classify each imported viz: case A (hash match), B (hash mismatch), C (new)
        const silentVizes = {};   // case A + C — add without conflict UI
        const conflicts = [];     // case B — requires user resolution

        for (const [name, vizData] of Object.entries(importedVizes)) {
            const existing = library[name];
            if (!existing) {
                // Case C — name unknown, add silently
                silentVizes[name] = vizData;
            } else {
                // Need hash to compare — compute on the fly for imported entry
                const importedHash = vizData.hash ?? await getHash(vizData.source ?? {});
                if (existing.hash === importedHash) {
                    // Case A — same content, add silently (already in library)
                    silentVizes[name] = vizData;
                } else {
                    // Case B — conflict
                    conflicts.push({
                        importedName: name,
                        systemEntry: { hash: existing.hash, source: existing.source },
                        importedEntry: { hash: importedHash, source: vizData.source }
                    });
                }
            }
        }

        conflictResolutions.value = {};

        pendingImport.value = {
            summary: {
                name: importedName,
                blockCount: importedBlocks.length,
                vizCount: Object.keys(importedVizes).length,
                conflictCount: conflicts.length
            },
            data: {
                blocks: importedBlocks,
                vizes: silentVizes,
                name: importedName,
                notes: importedNotes
            },
            conflicts
        };

        if (conflicts.length > 0) {
            return { pending: true, conflicts: true };
        }
        return { pending: true };
    }

    async function confirmImport() {
        if (!pendingImport.value) { return; }
        const { data, conflicts } = pendingImport.value;
        let { blocks: importedBlocks, vizes, name } = data;

        const { saveLibraryEntry, library } = useVizLibrary();

        // Apply conflict resolutions — mutate a working copy of blocks
        let finalBlocks = importedBlocks;
        if (conflicts?.length > 0) {
            const blockRewrites = {};  // { [importedName]: resolvedName }

            for (const conflict of conflicts) {
                const resolution = conflictResolutions.value[conflict.importedName];
                if (!resolution) { continue; }

                if (resolution.action === 'use-system') {
                    // Keep existing system viz; no block rewrite needed
                } else if (resolution.action === 'add-as-new') {
                    const newName = _nextAvailableName(conflict.importedName);
                    await saveLibraryEntry(newName, conflict.importedEntry.source);
                    blockRewrites[conflict.importedName] = newName;
                } else if (resolution.action === 'remap') {
                    blockRewrites[conflict.importedName] = resolution.targetName;
                }
            }

            if (Object.keys(blockRewrites).length > 0) {
                finalBlocks = importedBlocks.map(block => {
                    const vizName = block.vizOptions?.customVizName;
                    if (vizName && blockRewrites[vizName]) {
                        return { ...block, vizOptions: { ...block.vizOptions, customVizName: blockRewrites[vizName] } };
                    }
                    return block;
                });
            }
        }

        // Add case A + C vizes (silent)
        for (const [vizName, { source }] of Object.entries(vizes)) {
            if (source && !library[vizName]) {
                await saveLibraryEntry(vizName, source);
            }
        }

        finalBlocks = finalBlocks.map(b => ({ ...b, id: crypto.randomUUID() }));

        const newId = createSheetInStore(name);
        initNewSheet(newId, name);
        replaceBlocks(finalBlocks);
        replaceNotes(data.notes ?? []);
        loadVizes(library);

        pendingImport.value = null;
        conflictResolutions.value = {};
    }

    function resolveConflict(importedName, resolution) {
        conflictResolutions.value = { ...conflictResolutions.value, [importedName]: resolution };
    }

    function cancelImport() {
        pendingImport.value = null;
        conflictResolutions.value = {};
    }

    // ── bundle export ─────────────────────────────────────────────────────────

    async function exportBundle() {
        const sheetEntries = await Promise.all(sheets.map(async (sheet) => {
            const stored = await readSheetData(sheet.id);
            return {
                id: sheet.id,
                name: sheet.name,
                blocks: stored?.blocks ?? [],
                vizes: stored?.customVizes ?? {},
                notes: stored?.notes ?? []
            };
        }));

        const bundle = serializeBundle(sheetEntries, activeSheetId.value);
        const raw = activeSheetName.value ?? 'untitled';
        const sanitized = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const filename = `${sanitized || 'untitled'}.flowbundle.json`;
        _triggerDownload(filename, JSON.stringify(bundle, null, 2));
    }

    async function findSheetsReferencingViz(vizName) {
        const matching = [];
        for (const sheet of sheets) {
            const data = await readSheetData(sheet.id);
            const sheetBlocks = data?.blocks ?? [];
            const refs = sheetBlocks.some(b => b.vizOptions?.customVizName === vizName);
            if (refs) { matching.push(sheet.name); }
        }
        return matching;
    }

    const bundleImport = useBundleImport({ sheets, writeSheetData, persistDeleteSheet, setActiveSheet, switchSheet });

    return {
        pendingImport,
        conflictResolutions,
        cancelImport,
        confirmImport,
        prepareImport,
        resolveConflict,
        findSheetsReferencingViz,
        exportSheet,
        exportBundle,
        // bundle import state and actions from useBundleImport
        ...bundleImport
    };
}
