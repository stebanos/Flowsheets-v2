import { beforeEach, describe, expect, it } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useDeleteBlock } from './useDeleteBlock';

// Real store — no mocks.
const { blocks, addBlock } = useBlockStore();
const { deleteBlock } = useDeleteBlock();

beforeEach(() => {
    blocks.splice(0);
});

describe('deleteBlock', () => {
    it('removes the block from the real store', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        deleteBlock(blocks[0]);
        expect(blocks).toHaveLength(0);
    });
});
