import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

const mockRemoveBlock = vi.fn();
const mockAddBlock = vi.fn();
const mockBlocks = [];

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({
        removeBlock: mockRemoveBlock,
        addBlock: mockAddBlock,
        blocks: mockBlocks
    })
}));

// Import after mock is established
const { useDeleteBlock } = await import('./useDeleteBlock');

beforeEach(() => {
    vi.useFakeTimers();
    mockRemoveBlock.mockClear();
    mockAddBlock.mockClear();
    mockBlocks.length = 0;
    // Drain any leftover undo state from previous test
    useDeleteBlock().dismissUndo();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('deleteBlock', () => {
    test('removes the block from the store', () => {
        const { deleteBlock } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(mockRemoveBlock).toHaveBeenCalledWith('1');
    });

    test('sets undoPending with the deleted block snapshot', () => {
        const { deleteBlock, undoPending } = useDeleteBlock();
        const block = { id: '1', name: 'a', code: '1 + 1' };
        deleteBlock(block);
        expect(undoPending.value).not.toBeNull();
        expect(undoPending.value.block).toMatchObject({ id: '1', name: 'a', code: '1 + 1' });
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

describe('undoDelete', () => {
    test('restores the deleted block to the store', () => {
        const { deleteBlock, undoDelete } = useDeleteBlock();
        const block = { id: '1', name: 'a', code: '' };
        deleteBlock(block);
        undoDelete();
        expect(mockAddBlock).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'a' }));
    });

    test('clears undoPending after undo', () => {
        const { deleteBlock, undoDelete, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        undoDelete();
        expect(undoPending.value).toBeNull();
    });

    test('is a no-op when there is nothing to undo', () => {
        const { undoDelete } = useDeleteBlock();
        undoDelete(); // should not throw
        expect(mockAddBlock).not.toHaveBeenCalled();
    });

    test('cancels the auto-dismiss timer', () => {
        const { deleteBlock, undoDelete, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        undoDelete();
        vi.advanceTimersByTime(20000);
        // undoPending was already cleared by undoDelete — timer should be a no-op
        expect(undoPending.value).toBeNull();
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

describe('auto-dismiss timer', () => {
    test('undoPending is cleared after 20 seconds', () => {
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        expect(undoPending.value).not.toBeNull();
        vi.advanceTimersByTime(20000);
        expect(undoPending.value).toBeNull();
    });

    test('a second delete resets the timer', () => {
        const { deleteBlock, undoPending } = useDeleteBlock();
        deleteBlock({ id: '1', name: 'a', code: '' });
        vi.advanceTimersByTime(15000);
        deleteBlock({ id: '2', name: 'b', code: '' });
        vi.advanceTimersByTime(10000); // 15s + 10s = 25s total, but timer reset at 15s
        // Timer was reset at 15s, so 10s later is only 10s into the new timer
        expect(undoPending.value).not.toBeNull();
        vi.advanceTimersByTime(10000); // now 20s since the second delete
        expect(undoPending.value).toBeNull();
    });
});
