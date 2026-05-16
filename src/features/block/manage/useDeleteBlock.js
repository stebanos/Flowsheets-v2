import { ref, toRaw } from 'vue';
import { useBlockStore } from '@/entities/block';

const _pendingLabel = ref(null); // { label, hasDownstream } — shown in toast; cleared on next action

export function useDeleteBlock() {
    const { removeBlock, blocks } = useBlockStore();

    function deleteBlock(block) {
        const raw = toRaw(block);
        const escaped = raw.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escaped}\\b`);
        const hasDownstream = blocks.some(b => b.id !== raw.id && pattern.test(b.code || ''));
        removeBlock(raw.id);
        _pendingLabel.value = { label: raw.name, hasDownstream };
    }

    function dismissUndo() {
        _pendingLabel.value = null;
    }

    return {
        deleteBlock,
        dismissUndo,
        // undoPending shape kept for UndoDeleteToast compatibility
        undoPending: _pendingLabel
    };
}
