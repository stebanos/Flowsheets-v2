import { beforeEach, describe, expect, it } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useDeleteBlock } from './useDeleteBlock';

// Real store — no mocks.
const { blocks, addBlock } = useBlockStore();
const { deleteBlock, dismissUndo, undoPending } = useDeleteBlock();

beforeEach(() => {
    blocks.splice(0);
    dismissUndo(); // drain module-level singleton between tests
});

describe('deleteBlock', () => {
    it('removes the block from the real store', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        deleteBlock(blocks[0]);
        expect(blocks).toHaveLength(0);
    });

    it('sets undoPending with the block label', () => {
        addBlock({ id: '1', name: 'myBlock', x: 10, y: 20, code: '42' });
        deleteBlock(blocks[0]);
        expect(undoPending.value).not.toBeNull();
        expect(undoPending.value.label).toBe('myBlock');
    });

    it('detects downstream references against the real store', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 0, y: 0, code: 'a * 2' });
        deleteBlock(blocks[0]);
        expect(undoPending.value.hasDownstream).toBe(true);
    });

    it('reports no downstream when no other block references the deleted name', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 0, y: 0, code: 'x + 1' });
        deleteBlock(blocks[0]);
        expect(undoPending.value.hasDownstream).toBe(false);
    });

    it('does not count partial-word matches as downstream references', () => {
        addBlock({ id: '1', name: 'total', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'sub', x: 0, y: 0, code: 'subtotal * 2' });
        deleteBlock(blocks[0]);
        expect(undoPending.value.hasDownstream).toBe(false);
    });
});

describe('dismissUndo', () => {
    it('clears undoPending', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        deleteBlock(blocks[0]);
        dismissUndo();
        expect(undoPending.value).toBeNull();
    });
});
