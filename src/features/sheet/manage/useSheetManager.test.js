import { reactive, ref } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────────

const mockSheets = reactive([]);

const mockSheetStore = {
    sheets: mockSheets,
    createSheet: vi.fn(),
    deleteSheet: vi.fn(),
    renameSheet: vi.fn()
};

vi.mock('@/entities/sheet', () => ({
    useSheetStore: () => mockSheetStore
}));

const mockSheetStorage = {
    openSheetIds: reactive([]),
    initNewSheet: vi.fn(),
    closeSheet: vi.fn(),
    persistDeleteSheet: vi.fn(),
    persistRenameSheet: vi.fn(),
    markPendingDelete: vi.fn(),
    unmarkPendingDelete: vi.fn()
};

vi.mock('@/features/sheet/storage', () => ({
    useSheetStorage: () => mockSheetStorage
}));

// ── import after mocks ────────────────────────────────────────────────────────

const { useSheetManager } = await import('./useSheetManager');

// ── helpers ───────────────────────────────────────────────────────────────────

function addSheet(id, name = 'Sheet') {
    mockSheets.push({ id, name, createdAt: '', updatedAt: '' });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useSheetManager', () => {
    beforeEach(() => {
        mockSheets.splice(0);
        vi.clearAllMocks();
        mockSheetStorage.persistDeleteSheet.mockResolvedValue(undefined);
    });

    describe('createSheet()', () => {
        it('calls sheetStore.createSheet and sheetStorage.initNewSheet, returns id', () => {
            const newId = 'sheet:local/new-1';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            const result = createSheet('My Sheet');

            expect(mockSheetStore.createSheet).toHaveBeenCalledWith('My Sheet');
            expect(mockSheetStorage.initNewSheet).toHaveBeenCalledWith(newId, 'My Sheet');
            expect(result).toBe(newId);
        });

        it('defaults to Untitled when name is blank', () => {
            const newId = 'sheet:local/new-2';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet('   ');

            expect(mockSheetStore.createSheet).toHaveBeenCalledWith('Untitled');
            expect(mockSheetStorage.initNewSheet).toHaveBeenCalledWith(newId, 'Untitled');
        });

        it('defaults to Untitled when name is null', () => {
            const newId = 'sheet:local/new-3';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet(null);

            expect(mockSheetStore.createSheet).toHaveBeenCalledWith('Untitled');
        });

        it('defaults to Untitled when name is omitted', () => {
            const newId = 'sheet:local/new-4';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet();

            expect(mockSheetStore.createSheet).toHaveBeenCalledWith('Untitled');
        });
    });

    describe('deleteSheet()', () => {
it('calls closeSheet, persistDeleteSheet, then sheetStore.deleteSheet in order', async () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1, 'Alpha');
            addSheet(id2, 'Beta');

            const callOrder = [];
            mockSheetStorage.closeSheet.mockImplementation(() => { callOrder.push('closeSheet'); });
            mockSheetStorage.persistDeleteSheet.mockImplementation(() => {
                callOrder.push('persistDeleteSheet');
                return Promise.resolve();
            });
            mockSheetStore.deleteSheet.mockImplementation(() => { callOrder.push('deleteSheet'); });

            const { deleteSheet } = useSheetManager();
            await deleteSheet(id1);

            expect(callOrder).toEqual(['closeSheet', 'persistDeleteSheet', 'deleteSheet']);
        });

        it('adds id to deletingIds during execution and removes it after', async () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1);
            addSheet(id2);

            let wasInDeletingIds = false;
            mockSheetStorage.persistDeleteSheet.mockImplementation(() => {
                wasInDeletingIds = deletingIds.has(id1);
                return Promise.resolve();
            });

            const { deleteSheet, deletingIds } = useSheetManager();
            await deleteSheet(id1);

            expect(wasInDeletingIds).toBe(true);
            expect(deletingIds.has(id1)).toBe(false);
        });

        it('is a no-op when already deleting the same id', async () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1, 'Alpha');
            addSheet(id2, 'Beta');

            const { deleteSheet } = useSheetManager();
            // Fire both without awaiting — second must be skipped by the guard.
            // Await both so no dangling promise leaks into later tests.
            await Promise.all([deleteSheet(id1), deleteSheet(id1)]);

            expect(mockSheetStorage.closeSheet).toHaveBeenCalledTimes(1);
            expect(mockSheetStorage.persistDeleteSheet).toHaveBeenCalledTimes(1);
        });

        it('clears deletingIds and sets deleteError when persistDeleteSheet throws', async () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1, 'Alpha');
            addSheet(id2, 'Beta');

            mockSheetStorage.persistDeleteSheet.mockRejectedValue(new Error('quota exceeded'));

            const { deleteSheet, deletingIds, deleteError } = useSheetManager();
            await deleteSheet(id1);

            expect(deletingIds.has(id1)).toBe(false);
            expect(deleteError.value).toBe('quota exceeded');
            expect(mockSheetStore.deleteSheet).not.toHaveBeenCalled();
        });

        it('sets deletedNotice to the sheet name after completion', async () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1, 'Alpha');
            addSheet(id2, 'Beta');

            const { deleteSheet, deletedNotice } = useSheetManager();
            await deleteSheet(id1);

            expect(deletedNotice.value).toBe('Alpha');
        });
    });

    describe('renameSheet()', () => {
        it('calls sheetStore.renameSheet and sheetStorage.persistRenameSheet with trimmed name', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '  My Sheet  ');

            expect(mockSheetStore.renameSheet).toHaveBeenCalledWith('sheet:local/x', 'My Sheet');
            expect(mockSheetStorage.persistRenameSheet).toHaveBeenCalledWith('sheet:local/x', 'My Sheet');
        });

        it('is a no-op on blank name', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '   ');

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
            expect(mockSheetStorage.persistRenameSheet).not.toHaveBeenCalled();
        });

        it('is a no-op on empty string', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '');

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
            expect(mockSheetStorage.persistRenameSheet).not.toHaveBeenCalled();
        });

        it('is a no-op on null name', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', null);

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
            expect(mockSheetStorage.persistRenameSheet).not.toHaveBeenCalled();
        });
    });
});
