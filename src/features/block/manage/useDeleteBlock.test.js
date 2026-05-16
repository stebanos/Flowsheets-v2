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
    // Drain any leftover undo state from previous test
    useDeleteBlock().dismissUndo();
});

describe('deleteBlock', () => {
    test('removes the block from the store', () => {
        const { deleteBlock } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(mockRemoveBlock).toHaveBeenCalledWith('1');
    });

    test('sets undoPending with label', () => {
        const { deleteBlock, undoPending } = useDeleteBlock();
        const block = { id: '1', name: 'a', code: '1 + 1' };
        deleteBlock(block);
        expect(undoPending.value).not.toBeNull();
        expect(undoPending.value.label).toBe('a');
    });

    test('hasDownstream is true when another block code references the deleted name', () => {
        mockBlocks.push({ id: '2', name: 'b', code: 'a * 2' });
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(undoPending.value.hasDownstream).toBe(true);
    });

    test('hasDownstream is false when no other block references the deleted name', () => {
        mockBlocks.push({ id: '2', name: 'b', code: 'x + 1' });
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(undoPending.value.hasDownstream).toBe(false);
    });

    test('does not count the deleted block itself as a downstream reference', () => {
        // A block referencing itself should not trigger hasDownstream once deleted
        mockBlocks.push({ id: '1', name: 'a', code: 'a + 1' });
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: 'a + 1' });
        expect(undoPending.value.hasDownstream).toBe(false);
    });

    test('hasDownstream is false when another block has a longer name that contains the deleted name as a substring', () => {
        mockBlocks.push({ id: '2', name: 'ab', code: 'ab * 2' }); // 'ab' is not a reference to 'a'
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(undoPending.value.hasDownstream).toBe(false);
    });

    test('hasDownstream is true when another block code references the deleted name as a whole word', () => {
        mockBlocks.push({ id: '2', name: 'ab', code: 'a + 1' }); // 'a' is a standalone identifier
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(undoPending.value.hasDownstream).toBe(true);
    });

    test('hasDownstream is false when the deleted name is a prefix of another block name in its code', () => {
        mockBlocks.push({ id: '2', name: 'total', code: 'subtotal * 2' }); // 'total' inside 'subtotal' is not a reference
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'total', code: '' });
        expect(undoPending.value.hasDownstream).toBe(false);
    });
});

describe('dismissUndo', () => {
    test('clears undoPending immediately', () => {
        const { deleteBlock, dismissUndo, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        dismissUndo();
        expect(undoPending.value).toBeNull();
    });
});
