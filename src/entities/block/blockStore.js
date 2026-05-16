import { reactive } from 'vue';

const blocks = reactive([]);

let _beforeMutation = null;

export function setBeforeMutationHook(fn) {
    _beforeMutation = fn;
}

export function useBlockStore() {
    function addBlock(block, tag) {
        _beforeMutation?.(tag ?? null);
        blocks.push(block);
    }

    function removeBlock(id, tag) {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx !== -1) {
            _beforeMutation?.(tag ?? null);
            blocks.splice(idx, 1);
        }
    }

    function updateBlock(id, patch, tag) {
        const block = blocks.find(b => b.id === id);
        if (block) {
            _beforeMutation?.(tag ?? null);
            Object.assign(block, patch);
        }
    }

    function replaceBlocks(newBlocks, tag) {
        _beforeMutation?.(tag ?? null);
        blocks.splice(0, blocks.length);
        for (const block of newBlocks) { blocks.push(block); }
    }

    return { blocks, addBlock, removeBlock, replaceBlocks, updateBlock };
}
