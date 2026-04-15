import { describe, test, expect, beforeEach } from 'vitest';
import { useSheetStore } from './useSheetStore';

// Singleton — reset to a known state before each test
beforeEach(() => {
    const { setActiveSheet } = useSheetStore();
    setActiveSheet(null, 'Untitled');
});

describe('renameActiveSheet — success', () => {
    test('updates activeSheetName', () => {
        const { renameActiveSheet, activeSheetName } = useSheetStore();
        renameActiveSheet('My Sheet');
        expect(activeSheetName.value).toBe('My Sheet');
    });

    test('trims surrounding whitespace', () => {
        const { renameActiveSheet, activeSheetName } = useSheetStore();
        renameActiveSheet('  trimmed  ');
        expect(activeSheetName.value).toBe('trimmed');
    });

    test('returns true', () => {
        const { renameActiveSheet } = useSheetStore();
        expect(renameActiveSheet('Valid')).toBe(true);
    });
});

describe('renameActiveSheet — rejection', () => {
    test('returns false for empty string', () => {
        const { renameActiveSheet } = useSheetStore();
        expect(renameActiveSheet('')).toBe(false);
    });

    test('returns false for whitespace-only string', () => {
        const { renameActiveSheet } = useSheetStore();
        expect(renameActiveSheet('   ')).toBe(false);
    });

    test('does not change name when input is empty', () => {
        const { renameActiveSheet, activeSheetName } = useSheetStore();
        renameActiveSheet('Valid');
        renameActiveSheet('');
        expect(activeSheetName.value).toBe('Valid');
    });
});

describe('ensureActiveSheet', () => {
    test('returns the active sheet id and name', () => {
        const { setActiveSheet, ensureActiveSheet } = useSheetStore();
        setActiveSheet('sheet-123', 'My Project');
        const { id, name } = ensureActiveSheet();
        expect(id).toBe('sheet-123');
        expect(name).toBe('My Project');
    });

    test('reflects a subsequent rename', () => {
        const { setActiveSheet, renameActiveSheet, ensureActiveSheet } = useSheetStore();
        setActiveSheet('sheet-abc', 'Old Name');
        renameActiveSheet('New Name');
        expect(ensureActiveSheet().name).toBe('New Name');
    });
});
