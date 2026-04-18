import { describe, test, expect, beforeEach } from 'vitest';
import { useSheetStore } from './useSheetStore';

// Singleton store — reset to a known empty state before each test
beforeEach(() => {
    const { sheets, activeSheetId } = useSheetStore();
    sheets.splice(0);
    activeSheetId.value = null;
});

// ---------------------------------------------------------------------------
// createSheet
// ---------------------------------------------------------------------------
describe('createSheet', () => {
    test('adds an entry to sheets', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet('Alpha');
        expect(sheets).toHaveLength(1);
        expect(sheets[0].name).toBe('Alpha');
    });

    test('sets the returned id as activeSheetId', () => {
        const { createSheet, activeSheetId } = useSheetStore();
        const id = createSheet('Beta');
        expect(activeSheetId.value).toBe(id);
    });

    test('generated id matches sheet:local/<uuid> format', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet('C');
        expect(sheets[0].id).toMatch(/^sheet:local\//);
    });

    test('uses "Untitled" when no name supplied', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet();
        expect(sheets[0].name).toBe('Untitled');
    });

    test('trims surrounding whitespace from name', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet('  trimmed  ');
        expect(sheets[0].name).toBe('trimmed');
    });

    test('records createdAt and updatedAt', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet('D');
        expect(sheets[0].createdAt).toBeTruthy();
        expect(sheets[0].updatedAt).toBeTruthy();
    });

    test('each call produces a unique id', () => {
        const { createSheet, sheets } = useSheetStore();
        createSheet('E');
        createSheet('F');
        expect(sheets[0].id).not.toBe(sheets[1].id);
    });
});

// ---------------------------------------------------------------------------
// deleteSheet
// ---------------------------------------------------------------------------
describe('deleteSheet', () => {
    test('removes the sheet from the catalogue', () => {
        const { createSheet, deleteSheet, sheets } = useSheetStore();
        const id = createSheet('X');
        deleteSheet(id);
        expect(sheets).toHaveLength(0);
    });

    test('no-ops for an unknown id', () => {
        const { createSheet, deleteSheet, sheets } = useSheetStore();
        createSheet('X');
        deleteSheet('nonexistent');
        expect(sheets).toHaveLength(1);
    });

    test('switches active to nearest sheet when active is deleted', () => {
        const { createSheet, deleteSheet, activeSheetId } = useSheetStore();
        createSheet('A');
        const b = createSheet('B');
        const c = createSheet('C');
        // active is now C; delete C → switches to B (idx 1 → clamped to new last)
        deleteSheet(c);
        expect(activeSheetId.value).toBe(b);
    });

    test('sets activeSheetId to null when last sheet is deleted', () => {
        const { createSheet, deleteSheet, activeSheetId } = useSheetStore();
        const id = createSheet('Only');
        deleteSheet(id);
        expect(activeSheetId.value).toBeNull();
    });

    test('does not change activeSheetId when a non-active sheet is deleted', () => {
        const { createSheet, deleteSheet, activeSheetId } = useSheetStore();
        const a = createSheet('A');
        const b = createSheet('B');
        // active is B; delete A
        deleteSheet(a);
        expect(activeSheetId.value).toBe(b);
    });
});

// ---------------------------------------------------------------------------
// renameSheet
// ---------------------------------------------------------------------------
describe('renameSheet', () => {
    test('updates the name in the catalogue', () => {
        const { createSheet, renameSheet, sheets } = useSheetStore();
        const id = createSheet('Old');
        renameSheet(id, 'New');
        expect(sheets[0].name).toBe('New');
    });

    test('returns true on success', () => {
        const { createSheet, renameSheet } = useSheetStore();
        const id = createSheet('X');
        expect(renameSheet(id, 'Y')).toBe(true);
    });

    test('returns false for empty string', () => {
        const { createSheet, renameSheet } = useSheetStore();
        const id = createSheet('X');
        expect(renameSheet(id, '')).toBe(false);
    });

    test('returns false for whitespace-only string', () => {
        const { createSheet, renameSheet } = useSheetStore();
        const id = createSheet('X');
        expect(renameSheet(id, '   ')).toBe(false);
    });

    test('returns false for unknown id', () => {
        const { renameSheet } = useSheetStore();
        expect(renameSheet('ghost', 'Name')).toBe(false);
    });

    test('sets updatedAt to an ISO timestamp', () => {
        const { createSheet, renameSheet, sheets } = useSheetStore();
        const id = createSheet('X');
        renameSheet(id, 'Y');
        expect(sheets[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
});

// ---------------------------------------------------------------------------
// activeSheetName computed
// ---------------------------------------------------------------------------
describe('activeSheetName computed', () => {
    test('reflects the name of the active sheet', () => {
        const { createSheet, activeSheetName } = useSheetStore();
        createSheet('My Sheet');
        expect(activeSheetName.value).toBe('My Sheet');
    });

    test('updates reactively after renameSheet', () => {
        const { createSheet, renameSheet, activeSheetName } = useSheetStore();
        const id = createSheet('Before');
        renameSheet(id, 'After');
        expect(activeSheetName.value).toBe('After');
    });

    test('returns "Untitled" when no active sheet', () => {
        const { activeSheetName } = useSheetStore();
        expect(activeSheetName.value).toBe('Untitled');
    });
});

// ---------------------------------------------------------------------------
// renameActiveSheet — backward compat
// ---------------------------------------------------------------------------
describe('renameActiveSheet', () => {
    test('updates activeSheetName', () => {
        const { createSheet, renameActiveSheet, activeSheetName } = useSheetStore();
        createSheet('Init');
        renameActiveSheet('My Sheet');
        expect(activeSheetName.value).toBe('My Sheet');
    });

    test('trims surrounding whitespace', () => {
        const { createSheet, renameActiveSheet, activeSheetName } = useSheetStore();
        createSheet('Init');
        renameActiveSheet('  trimmed  ');
        expect(activeSheetName.value).toBe('trimmed');
    });

    test('returns true on success', () => {
        const { createSheet, renameActiveSheet } = useSheetStore();
        createSheet('Init');
        expect(renameActiveSheet('Valid')).toBe(true);
    });

    test('returns false for empty string', () => {
        const { createSheet, renameActiveSheet } = useSheetStore();
        createSheet('Init');
        expect(renameActiveSheet('')).toBe(false);
    });

    test('returns false for whitespace-only string', () => {
        const { createSheet, renameActiveSheet } = useSheetStore();
        createSheet('Init');
        expect(renameActiveSheet('   ')).toBe(false);
    });

    test('does not change name when input is empty', () => {
        const { createSheet, renameActiveSheet, activeSheetName } = useSheetStore();
        createSheet('Init');
        renameActiveSheet('Valid');
        renameActiveSheet('');
        expect(activeSheetName.value).toBe('Valid');
    });
});

// ---------------------------------------------------------------------------
// setActiveSheet
// ---------------------------------------------------------------------------
describe('setActiveSheet', () => {
    test('registers a new sheet in the catalogue', () => {
        const { setActiveSheet, sheets } = useSheetStore();
        setActiveSheet('sheet:local/abc', 'Loaded');
        expect(sheets).toHaveLength(1);
        expect(sheets[0].name).toBe('Loaded');
    });

    test('sets activeSheetId to the given id', () => {
        const { setActiveSheet, activeSheetId } = useSheetStore();
        setActiveSheet('sheet:local/abc', 'X');
        expect(activeSheetId.value).toBe('sheet:local/abc');
    });

    test('updates existing entry if id already in catalogue', () => {
        const { setActiveSheet, sheets } = useSheetStore();
        setActiveSheet('sheet:local/abc', 'First');
        setActiveSheet('sheet:local/abc', 'Second');
        expect(sheets).toHaveLength(1);
        expect(sheets[0].name).toBe('Second');
    });

    test('sets activeSheetId to null without touching catalogue', () => {
        const { setActiveSheet, activeSheetId, sheets } = useSheetStore();
        setActiveSheet('sheet:local/abc', 'X');
        setActiveSheet(null);
        expect(activeSheetId.value).toBeNull();
        expect(sheets).toHaveLength(1);
    });
});
