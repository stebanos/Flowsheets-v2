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
        const newById = new Map(newBlocks.map(b => [b.id, b]));
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (!newById.has(blocks[i].id)) { blocks.splice(i, 1); }
        }
        for (const existing of blocks) {
            const next = newById.get(existing.id);
            for (const key of Object.keys(existing)) {
                if (!(key in next)) { delete existing[key]; }
            }
            Object.assign(existing, next);
            newById.delete(existing.id);
        }
        for (const block of newById.values()) { blocks.push(block); }
    }

    return { blocks, addBlock, removeBlock, replaceBlocks, updateBlock };
}
