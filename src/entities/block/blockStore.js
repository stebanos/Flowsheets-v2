import { reactive } from 'vue';

const blocks = reactive([]);

export function useBlockStore() {
    function addBlock(block) {
        blocks.push(block);
    }

    function removeBlock(id) {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx !== -1) { blocks.splice(idx, 1); }
    }

    function updateBlock(id, patch) {
        const block = blocks.find(b => b.id === id);
        if (block) { Object.assign(block, patch); }
    }

    function replaceBlocks(newBlocks) {
        blocks.splice(0, blocks.length);
        for (const block of newBlocks) { blocks.push(block); }
    }

    return { blocks, addBlock, removeBlock, replaceBlocks, updateBlock };
}
