import { ref, toRaw } from 'vue';
import { useBlockStore } from '@/entities/block';

const undoPending = ref(null); // { block, hasDownstream }
let timer = null;

const UNDO_TIMEOUT_MS = 20000;

export function useDeleteBlock() {
    const { removeBlock, addBlock, blocks } = useBlockStore();

    function deleteBlock(block) {
        const raw = toRaw(block);
        const hasDownstream = blocks.some(b =>
            b.id !== raw.id && (b.code || '').includes(raw.name)
        );
        removeBlock(raw.id);
        undoPending.value = { block: { ...raw }, hasDownstream };
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => {
            undoPending.value = null;
            timer = null;
        }, UNDO_TIMEOUT_MS);
    }

    function undoDelete() {
        if (!undoPending.value) { return; }
        addBlock(undoPending.value.block);
        undoPending.value = null;
        if (timer) { clearTimeout(timer); timer = null; }
    }

    function dismissUndo() {
        undoPending.value = null;
        if (timer) { clearTimeout(timer); timer = null; }
    }

    return { deleteBlock, undoDelete, dismissUndo, undoPending };
}
