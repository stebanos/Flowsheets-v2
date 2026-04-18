import { reactive, ref } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────────

const mockSheets = reactive([]);
const mockActiveSheetId = ref(null);

const mockSheetStore = {
    sheets: mockSheets,
    activeSheetId: mockActiveSheetId,
    createSheet: vi.fn(),
    deleteSheet: vi.fn(),
    renameSheet: vi.fn()
};

vi.mock('@/entities/sheet', () => ({
    useSheetStore: () => mockSheetStore
}));

const mockOpenSheetIds = reactive([]);

const mockSheetStorage = {
    openSheetIds: mockOpenSheetIds,
    switchSheet: vi.fn(),
    closeSheet: vi.fn()
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
        // Reset reactive state
        mockSheets.splice(0);
        mockOpenSheetIds.splice(0);
        mockActiveSheetId.value = null;

        // Reset localStorage
        localStorage.clear();

        // Reset mocks
        vi.clearAllMocks();

        // Reset renamingSheetId by calling clearRenamingId between tests
        const { clearRenamingId } = useSheetManager();
        clearRenamingId();
    });

    describe('createSheet()', () => {
        it('calls sheetStore.createSheet() and writes empty storage entry', () => {
            const newId = 'sheet:local/new-1';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet();

            expect(mockSheetStore.createSheet).toHaveBeenCalledTimes(1);

            const stored = JSON.parse(localStorage.getItem(`flowsheets.v2.sheet.${newId}`));
            expect(stored).toEqual({ blocks: [], customVizes: [] });
        });

        it('adds id to openSheetIds if not already present', () => {
            const newId = 'sheet:local/new-2';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet();

            expect(mockOpenSheetIds).toContain(newId);
        });

        it('does not duplicate id in openSheetIds', () => {
            const newId = 'sheet:local/new-3';
            mockSheetStore.createSheet.mockReturnValue(newId);
            mockOpenSheetIds.push(newId);

            const { createSheet } = useSheetManager();
            createSheet();

            expect(mockOpenSheetIds.filter(id => id === newId)).toHaveLength(1);
        });

        it('calls switchSheet with the new id', () => {
            const newId = 'sheet:local/new-4';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet } = useSheetManager();
            createSheet();

            expect(mockSheetStorage.switchSheet).toHaveBeenCalledWith(newId);
        });

        it('sets renamingSheetId to the new id', () => {
            const newId = 'sheet:local/new-5';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet, renamingSheetId } = useSheetManager();
            createSheet();

            expect(renamingSheetId.value).toBe(newId);
        });
    });

    describe('deleteSheet()', () => {
        it('does nothing when only one sheet exists (last-sheet guard)', () => {
            addSheet('sheet:local/only');

            const { deleteSheet } = useSheetManager();
            deleteSheet('sheet:local/only');

            expect(mockSheetStorage.closeSheet).not.toHaveBeenCalled();
            expect(mockSheetStore.deleteSheet).not.toHaveBeenCalled();
        });

        it('closes, deletes, removes storage key and rebuilds catalogue when multiple sheets exist', () => {
            const id1 = 'sheet:local/a';
            const id2 = 'sheet:local/b';
            addSheet(id1, 'Alpha');
            addSheet(id2, 'Beta');

            // Pre-populate sheet storage key
            localStorage.setItem(`flowsheets.v2.sheet.${id1}`, JSON.stringify({ blocks: [], customVizes: [] }));

            const { deleteSheet } = useSheetManager();
            deleteSheet(id1);

            expect(mockSheetStorage.closeSheet).toHaveBeenCalledWith(id1);
            expect(mockSheetStore.deleteSheet).toHaveBeenCalledWith(id1);
            expect(localStorage.getItem(`flowsheets.v2.sheet.${id1}`)).toBeNull();
        });

        it('persists updated catalogue after deletion', () => {
            const id1 = 'sheet:local/c';
            const id2 = 'sheet:local/d';
            addSheet(id1, 'One');
            addSheet(id2, 'Two');

            // Simulate store.deleteSheet removing id1 from mockSheets
            mockSheetStore.deleteSheet.mockImplementation((id) => {
                const idx = mockSheets.findIndex(s => s.id === id);
                if (idx !== -1) { mockSheets.splice(idx, 1); }
            });

            const { deleteSheet } = useSheetManager();
            deleteSheet(id1);

            const catalogue = JSON.parse(localStorage.getItem('flowsheets.v2.catalogue'));
            expect(catalogue).toHaveLength(1);
            expect(catalogue[0].id).toBe(id2);
        });
    });

    describe('renameSheet()', () => {
        it('calls sheetStore.renameSheet with trimmed name', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '  My Sheet  ');

            expect(mockSheetStore.renameSheet).toHaveBeenCalledWith('sheet:local/x', 'My Sheet');
        });

        it('returns early without calling renameSheet when name is blank', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '   ');

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
        });

        it('returns early without calling renameSheet when name is empty string', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', '');

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
        });

        it('returns early without calling renameSheet when name is null', () => {
            const { renameSheet } = useSheetManager();
            renameSheet('sheet:local/x', null);

            expect(mockSheetStore.renameSheet).not.toHaveBeenCalled();
        });
    });

    describe('renamingSheetId lifecycle', () => {
        it('starts as null', () => {
            const { renamingSheetId } = useSheetManager();
            expect(renamingSheetId.value).toBeNull();
        });

        it('clearRenamingId() resets it to null', () => {
            const newId = 'sheet:local/rename-test';
            mockSheetStore.createSheet.mockReturnValue(newId);

            const { createSheet, clearRenamingId, renamingSheetId } = useSheetManager();
            createSheet();
            expect(renamingSheetId.value).toBe(newId);

            clearRenamingId();
            expect(renamingSheetId.value).toBeNull();
        });
    });
});
