import { ref } from 'vue';
import { useBlockStore } from '@/entities/block';
import { buildImportBlock } from './buildImportBlock';

// Prevent Vite HMR from resetting module-level state (pendingLargeImport).
if (import.meta.hot) { import.meta.hot.decline(); }

const ONE_MB = 1024 * 1024;

// Module-level singleton — shared across all callers (the page + its dialog).
// { name, code, pos } | null
const pendingLargeImport = ref(null);

/**
 * File → block orchestration. Block creation is injected (createBlock,
 * cellWidth, unitY) because a feature slice may not import sibling features;
 * the page — which owns those — passes them in.
 *
 * @param {{ createBlock: Function, cellWidth: import('vue').Ref, unitY: import('vue').Ref }} deps
 */
export function useDataImport({ createBlock, cellWidth, unitY }) {
    const { blocks } = useBlockStore();

    function _place(name, code, pos) {
        createBlock(pos, name, code, cellWidth, unitY);
    }

    async function importDataFile(file, pos) {
        let text;
        try {
            text = await file.text();
        } catch {
            return { error: 'This file could not be read. It may be corrupted or unreadable.' };
        }

        const built = buildImportBlock({
            filename: file.name,
            text,
            existingNames: blocks.map(b => b.name)
        });
        if (built.error) { return { error: built.error }; }

        if (built.byteLength > ONE_MB) {
            pendingLargeImport.value = { name: built.name, code: built.code, byteLength: built.byteLength, pos };
            return {};
        }

        _place(built.name, built.code, pos);
        return {};
    }

    function confirmLargeImport() {
        const pending = pendingLargeImport.value;
        if (!pending) { return; }
        _place(pending.name, pending.code, pending.pos);
        pendingLargeImport.value = null;
    }

    function cancelLargeImport() {
        pendingLargeImport.value = null;
    }

    return {
        pendingLargeImport,
        importDataFile,
        confirmLargeImport,
        cancelLargeImport
    };
}
