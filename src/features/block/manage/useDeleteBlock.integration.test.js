import { beforeEach, describe, expect, it } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useDeleteBlock } from './useDeleteBlock';

// Real store — no mocks.
const { blocks, addBlock } = useBlockStore();
const { deleteBlock, undoDelete, dismissUndo, undoPending } = useDeleteBlock();

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

    it('sets undoPending with the exact block data', () => {
        addBlock({ id: '1', name: 'myBlock', x: 10, y: 20, code: '42' });
        deleteBlock(blocks[0]);
        expect(undoPending.value.block).toMatchObject({ id: '1', name: 'myBlock', x: 10, y: 20, code: '42' });
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

describe('undoDelete round-trip', () => {
    it('restores the block to the real store', () => {
        addBlock({ id: '1', name: 'a', x: 10, y: 20, code: '42' });
        deleteBlock(blocks[0]);
        expect(blocks).toHaveLength(0);

        undoDelete();
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toMatchObject({ id: '1', name: 'a', x: 10, y: 20, code: '42' });
    });

    it('clears undoPending after restoring', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        deleteBlock(blocks[0]);
        undoDelete();
        expect(undoPending.value).toBeNull();
    });

    it('preserves all block fields through a delete-undo cycle', () => {
        const original = { id: 'abc', name: 'myBlock', x: 123, y: 456, code: 'x + y' };
        addBlock({ ...original });
        deleteBlock(blocks[0]);
        undoDelete();
        expect(blocks[0]).toMatchObject(original);
    });

    it('is a no-op when there is nothing to undo', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        undoDelete(); // nothing pending
        expect(blocks).toHaveLength(1); // block untouched
    });
});

describe('sequential deletes', () => {
    it('only the last deleted block is restored on undo', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 0, y: 0, code: '' });

        deleteBlock(blocks[0]); // delete 'a'
        deleteBlock(blocks[0]); // delete 'b' (now at index 0)
        expect(blocks).toHaveLength(0);

        undoDelete();
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('b');
    });
});
