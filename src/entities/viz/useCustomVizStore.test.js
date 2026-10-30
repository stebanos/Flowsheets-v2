import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useCustomVizStore } from './useCustomVizStore';

vi.mock('./useVizLibrary', () => ({
    useVizLibrary: () => ({
        library: {},
        createLibraryEntry: vi.fn(),
        saveLibraryEntry: vi.fn(),
        deleteLibraryEntry: vi.fn(),
        renameLibraryEntry: vi.fn()
    })
}));

const { customVizes, activeVizName, createViz, deleteViz, renameViz, resetVizes, saveDraft, revertDraft } = useCustomVizStore();

function stubEntry() {
    return { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
}

beforeEach(() => {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
});

describe('createViz', () => {
    test('initializes entry with new draft shape', () => {
        createViz();
        const name = activeVizName.value;
        const entry = customVizes[name];
        expect(entry).toBeDefined();
        expect(entry.source).toBeNull();
        expect(entry.component).toBeNull();
        expect(entry.error).toBeNull();
        expect(entry.errorPanel).toBeNull();
        expect(typeof entry.draft.template).toBe('string');
        expect(typeof entry.draft.script).toBe('string');
        expect(typeof entry.draft.style).toBe('string');
    });

    test('picks the first free "Viz n" name and makes it active', () => {
        customVizes['Viz 1'] = stubEntry();
        createViz();
        expect(Object.keys(customVizes)).toEqual(['Viz 1', 'Viz 2']);
        expect(activeVizName.value).toBe('Viz 2');
    });
});

describe('deleteViz', () => {
    test('removes the entry and moves the active tab to a neighbour', () => {
        customVizes['A'] = stubEntry();
        customVizes['B'] = stubEntry();
        customVizes['C'] = stubEntry();
        activeVizName.value = 'C';
        deleteViz('C');
        expect(Object.keys(customVizes)).toEqual(['A', 'B']);
        expect(activeVizName.value).toBe('B');
    });

    test('clears the active tab when the last entry is removed', () => {
        customVizes['A'] = stubEntry();
        activeVizName.value = 'A';
        deleteViz('A');
        expect(activeVizName.value).toBeNull();
    });

    test('does nothing for unknown name', () => {
        customVizes['A'] = stubEntry();
        deleteViz('Z');
        expect(Object.keys(customVizes)).toEqual(['A']);
    });
});

describe('saveDraft', () => {
    test('updates all three panel fields', () => {
        createViz();
        const name = activeVizName.value;
        const newDraft = { template: '<p/>', script: 'return {};', style: 'p {}' };
        saveDraft(name, newDraft);
        expect(customVizes[name].draft).toEqual(newDraft);
    });
});

describe('revertDraft', () => {
    test('restores draft to source and clears error and errorPanel', () => {
        const source = { template: '<div/>', script: '', style: '' };
        customVizes['A'] = { ...stubEntry(), source, draft: { template: '<p/>', script: 'bad', style: '' }, error: 'oops', errorPanel: 'template' };
        revertDraft('A');
        expect(customVizes['A'].draft).toEqual(source);
        expect(customVizes['A'].error).toBeNull();
        expect(customVizes['A'].errorPanel).toBeNull();
    });

    test('does nothing if source is null', () => {
        createViz();
        const name = activeVizName.value;
        const originalDraft = { ...customVizes[name].draft };
        revertDraft(name);
        expect(customVizes[name].draft).toEqual(originalDraft);
    });
});

describe('resetVizes', () => {
    test('clears existing entries and loads uncompiled ones with draft = source', () => {
        createViz();
        const source = { template: '<div>{{ value }}</div>', script: '', style: '' };
        resetVizes({ MyViz: { source } });
        expect(Object.keys(customVizes)).toEqual(['MyViz']);
        expect(customVizes['MyViz'].draft).toEqual(source);
        expect(customVizes['MyViz'].source).toBeNull();
        expect(customVizes['MyViz'].component).toBeNull();
    });

    test('activates the first viz, or none when the map is empty', () => {
        resetVizes({ A: { source: { template: '', script: '', style: '' } }, B: { source: { template: '', script: '', style: '' } } });
        expect(activeVizName.value).toBe('A');
        resetVizes({});
        expect(activeVizName.value).toBeNull();
    });
});

describe('renameViz', () => {
    test('preserves tab order', () => {
        customVizes['A'] = stubEntry();
        customVizes['B'] = stubEntry();
        customVizes['C'] = stubEntry();
        renameViz('B', 'X');
        expect(Object.keys(customVizes)).toEqual(['A', 'X', 'C']);
    });

    test('updates activeVizName when renaming the active tab', () => {
        customVizes['Viz 1'] = stubEntry();
        activeVizName.value = 'Viz 1';
        renameViz('Viz 1', 'MyViz');
        expect(activeVizName.value).toBe('MyViz');
    });

    test('does not change activeVizName when renaming a non-active tab', () => {
        customVizes['A'] = stubEntry();
        customVizes['B'] = stubEntry();
        activeVizName.value = 'A';
        renameViz('B', 'X');
        expect(activeVizName.value).toBe('A');
    });

    test('returns false and does nothing if new name already exists', () => {
        customVizes['A'] = stubEntry();
        customVizes['B'] = stubEntry();
        const result = renameViz('A', 'B');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A', 'B']);
    });

    test('returns false and does nothing if old name does not exist', () => {
        customVizes['A'] = stubEntry();
        const result = renameViz('Z', 'A2');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A']);
    });
});
