import { toRaw } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useDeleteBlock() {
    const { removeBlock } = useBlockStore();

    function deleteBlock(block) {
        removeBlock(toRaw(block).id);
    }

    return { deleteBlock };
}
