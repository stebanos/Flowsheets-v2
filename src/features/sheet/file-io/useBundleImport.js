import { ref, toValue } from 'vue';
import { deserializeBundle, serializeSheet } from '@/shared/lib/persistence';
import { useVizLibrary } from '@/entities/viz';

export function useBundleImport({ sheets, writeSheetData, persistDeleteSheet, setActiveSheet, switchSheet }) {
    const bundleImportState = ref({ pending: false, entries: [] });

    async function prepareBundleImport(file) {
        let text;
        try {
            text = await file.text();
        } catch (_err) {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets bundle.' };
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            return { error: 'This file could not be read. It may be corrupted or not a valid Flowsheets bundle.' };
        }

        let parsed;
        try {
            parsed = deserializeBundle(json);
        } catch (err) {
            return { error: err.message };
        }

        const localIds = new Set(toValue(sheets).map(s => s.id));

        const entries = parsed.sheets.map((sheet) => ({
            id: sheet.id,
            name: sheet.name,
            blocks: sheet.blocks,
            vizes: sheet.vizes,
            action: localIds.has(sheet.id) ? 'skip' : 'import'
        }));

        bundleImportState.value = { pending: true, entries, rootSheetId: parsed.rootSheetId, vizLibrary: parsed.vizLibrary ?? {} };
        return { pending: true };
    }

    async function confirmBundleImport() {
        if (!bundleImportState.value.pending) { return; }
        const { saveLibraryEntry, library } = useVizLibrary();
        const { entries, rootSheetId, vizLibrary } = bundleImportState.value;

        for (const [vizName, entry] of Object.entries(vizLibrary ?? {})) {
            if (!entry.source) { continue; }
            const existing = library[vizName];
            if (!existing) {
                await saveLibraryEntry(vizName, entry.source);
            } else if (existing.hash === entry.hash) {
                // already present — no-op
            }
            // if hash differs: use system version (skip import)
        }

        let resolvedRootId = rootSheetId;
        const stagedIds = [];

        try {
            for (const entry of entries) {
                if (entry.action === 'skip') { continue; }

                let targetId = entry.id;
                let targetName = entry.name;

                if (entry.action === 'copy') {
                    targetId = `sheet:local/${crypto.randomUUID()}`;
                    targetName = `${entry.name} (copy)`;
                    if (entry.id === rootSheetId) { resolvedRootId = targetId; }
                }

                const serialized = serializeSheet(entry.blocks ?? [], entry.vizes ?? {}, targetName);
                await writeSheetData(targetId, targetName, { blocks: serialized.blocks, customVizes: serialized.customVizes });
                stagedIds.push(targetId);
                setActiveSheet(targetId, targetName);
            }

            bundleImportState.value = { pending: false, entries: [] };
            switchSheet(resolvedRootId);
        } catch (err) {
            for (const id of stagedIds) { await persistDeleteSheet(id).catch(() => {}); }
            bundleImportState.value = null;
            throw err;
        }
    }

    function cancelBundleImport() {
        bundleImportState.value = { pending: false, entries: [] };
    }

    return {
        bundleImportState,
        prepareBundleImport,
        confirmBundleImport,
        cancelBundleImport
    };
}
