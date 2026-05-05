import { ref } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────────

const mockWrapIndicator = ref(false);
const mockSetWrapIndicator = vi.fn((v) => { mockWrapIndicator.value = v; });
const mockAnnounce = vi.fn();
const mockFocusBlockWrapper = vi.fn();

vi.mock('./useFocusedBlock', () => ({
    useFocusedBlock: () => ({
        setWrapIndicator: mockSetWrapIndicator,
        announce: mockAnnounce,
        focusBlockWrapper: mockFocusBlockWrapper
    })
}));

// ── import after mocks ────────────────────────────────────────────────────────

const { useBlockNavigation } = await import('./useBlockNavigation');

// ── helpers ───────────────────────────────────────────────────────────────────

function block(name, x, y) {
    return { name, x, y };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockSetWrapIndicator.mockImplementation((v) => { mockWrapIndicator.value = v; });
    mockWrapIndicator.value = false;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useBlockNavigation', () => {
    describe('focusNext()', () => {
        it('focuses the next block in sorted (y, x) order', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100), block('c', 0, 200)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('a');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('b');
        });

        it('wraps from last to first, sets wrapIndicator, and announces', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('b');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('a');
            expect(mockWrapIndicator.value).toBe(true);
            expect(mockAnnounce).toHaveBeenCalledWith('Wrapped to first block');
        });

        it('does not set wrapIndicator or announce when not at the boundary', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('a');
            expect(mockWrapIndicator.value).toBe(false);
            expect(mockAnnounce).not.toHaveBeenCalled();
        });

        it('starts at index 0 when fromName is not found', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('unknown');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('a');
            expect(mockAnnounce).not.toHaveBeenCalled();
        });

        it('wraps to itself and announces when there is only one block', () => {
            const blocks = [block('solo', 0, 0)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('solo');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('solo');
            expect(mockWrapIndicator.value).toBe(true);
            expect(mockAnnounce).toHaveBeenCalledWith('Wrapped to first block');
        });

        it('is a no-op on an empty array', () => {
            const { focusNext } = useBlockNavigation([]);
            expect(() => focusNext('a')).not.toThrow();
            expect(mockFocusBlockWrapper).not.toHaveBeenCalled();
        });
    });

    describe('focusPrev()', () => {
        it('focuses the previous block in sorted (y, x) order', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100), block('c', 0, 200)];
            const { focusPrev } = useBlockNavigation(blocks);
            focusPrev('c');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('b');
        });

        it('wraps from first to last, sets wrapIndicator, and announces', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusPrev } = useBlockNavigation(blocks);
            focusPrev('a');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('b');
            expect(mockWrapIndicator.value).toBe(true);
            expect(mockAnnounce).toHaveBeenCalledWith('Wrapped to last block');
        });

        it('does not set wrapIndicator or announce when not at the boundary', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusPrev } = useBlockNavigation(blocks);
            focusPrev('b');
            expect(mockWrapIndicator.value).toBe(false);
            expect(mockAnnounce).not.toHaveBeenCalled();
        });

        it('starts at the last block when fromName is not found', () => {
            const blocks = [block('a', 0, 0), block('b', 0, 100)];
            const { focusPrev } = useBlockNavigation(blocks);
            focusPrev('unknown');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('b');
            expect(mockAnnounce).not.toHaveBeenCalled();
        });

        it('wraps to itself and announces when there is only one block', () => {
            const blocks = [block('solo', 0, 0)];
            const { focusPrev } = useBlockNavigation(blocks);
            focusPrev('solo');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('solo');
            expect(mockWrapIndicator.value).toBe(true);
            expect(mockAnnounce).toHaveBeenCalledWith('Wrapped to last block');
        });

        it('is a no-op on an empty array', () => {
            const { focusPrev } = useBlockNavigation([]);
            expect(() => focusPrev('a')).not.toThrow();
            expect(mockFocusBlockWrapper).not.toHaveBeenCalled();
        });
    });

    describe('focusFirst()', () => {
        it('focuses the block with the lowest y then x', () => {
            const blocks = [block('c', 0, 200), block('a', 0, 0), block('b', 0, 100)];
            const { focusFirst } = useBlockNavigation(blocks);
            focusFirst();
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('a');
        });

        it('is a no-op on an empty array', () => {
            const { focusFirst } = useBlockNavigation([]);
            expect(() => focusFirst()).not.toThrow();
            expect(mockFocusBlockWrapper).not.toHaveBeenCalled();
        });
    });

    describe('sort order', () => {
        it('x breaks ties within the same row (lower x comes first)', () => {
            const blocks = [block('right', 200, 0), block('left', 0, 0)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('left');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('right');
        });

        it('y is the primary key — a block with lower y precedes one with higher y regardless of x', () => {
            const blocks = [block('top', 999, 0), block('bottom', 0, 100)];
            const { focusNext } = useBlockNavigation(blocks);
            focusNext('top');
            expect(mockFocusBlockWrapper).toHaveBeenCalledWith('bottom');
        });
    });
});
