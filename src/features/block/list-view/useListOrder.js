import { computed } from 'vue';
import { useBlockStore } from '@/entities/block';

let moveCounter = 0;

export function useListOrder() {
    const { blocks, updateBlock } = useBlockStore();

    const includedBlocks = computed(() => {
        return blocks
            .filter(b => b.listPosition != null)
            .sort((a, b) => a.listPosition - b.listPosition);
    });

    function isIncluded(block) {
        return block.listPosition != null;
    }

    function include(block) {
        if (isIncluded(block)) { return; }
        const positions = includedBlocks.value.map(b => b.listPosition);
        const next = positions.length ? Math.max(...positions) + 1 : 0;
        updateBlock(block.id, { listPosition: next });
    }

    function exclude(block) {
        if (!isIncluded(block)) { return; }
        updateBlock(block.id, { listPosition: null });
    }

    function toggle(block) {
        if (isIncluded(block)) {
            exclude(block);
        } else {
            include(block);
        }
    }

    function moveTo(blockId, newIndex) {
        const ordered = [...includedBlocks.value];
        const from = ordered.findIndex(b => b.id === blockId);
        if (from === -1) { return; }
        const to = Math.min(Math.max(newIndex, 0), ordered.length - 1);
        if (to === from) { return; }
        const [moved] = ordered.splice(from, 1);
        ordered.splice(to, 0, moved);
        const tag = `listorder:${++moveCounter}`;
        ordered.forEach((b, i) => {
            if (b.listPosition !== i) {
                updateBlock(b.id, { listPosition: i }, tag);
            }
        });
    }

    return { includedBlocks, isIncluded, include, exclude, toggle, moveTo };
}
