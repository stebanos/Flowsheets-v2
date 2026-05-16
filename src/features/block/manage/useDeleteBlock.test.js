import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockRemoveBlock = vi.fn();
const mockBlocks = [];

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({
        removeBlock: mockRemoveBlock,
        blocks: mockBlocks
    })
}));

// Import after mock is established
const { useDeleteBlock } = await import('./useDeleteBlock');

beforeEach(() => {
    mockRemoveBlock.mockClear();
    mockBlocks.length = 0;
});

describe('deleteBlock', () => {
    test('removes the block from the store', () => {
        const { deleteBlock } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(mockRemoveBlock).toHaveBeenCalledWith('1');
    });
});
