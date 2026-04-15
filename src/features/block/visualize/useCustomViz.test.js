import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useCustomViz } from './useCustomViz';
import { useBlockStore } from '@/entities/block/blockStore';

const { customVizes, activeVizName, createViz, renameViz, runViz, saveDraft, revertDraft, getComponent, loadVizes, setErrorPanel } = useCustomViz();
const { blocks, addBlock } = useBlockStore();

// Minimal style element stub
function makeStyleEl(name) {
    return {
        textContent: '',
        setAttribute: vi.fn(),
        getAttribute: vi.fn(() => name)
    };
}

let styleEl;
let querySelectorSpy;
let appendChildSpy;
let createElementSpy;

beforeEach(() => {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
    blocks.splice(0);

    styleEl = makeStyleEl('');
    // Default: style element already exists (querySelector returns it)
    querySelectorSpy = vi.spyOn(document.head, 'querySelector').mockReturnValue(styleEl);
    appendChildSpy = vi.spyOn(document.head, 'appendChild').mockReturnValue(styleEl);
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(styleEl);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createViz', () => {
    test('initializes entry with new draft shape', () => {
        createViz();
        const name = activeVizName.value;
        const entry = customVizes[name];
        expect(entry).toBeDefined();
        expect(entry.source).toBeNull();
        expect(entry.error).toBeNull();
        expect(entry.errorPanel).toBeNull();
        expect(typeof entry.draft.template).toBe('string');
        expect(typeof entry.draft.script).toBe('string');
        expect(typeof entry.draft.style).toBe('string');
    });
});

describe('runViz', () => {
    test('stores compiled component on entry', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div>{{ value }}</div>', script: '', style: '' });
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].component).not.toBeNull();
        expect(customVizes[name].errorPanel).toBeNull();
        expect(getComponent(name)).not.toBeNull();
    });

    test('empty script uses identity setup (no new Function)', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div>hello</div>', script: '   ', style: '' });
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].component).not.toBeNull();
    });

    test('non-empty script body is wrapped via new Function with Vue and props', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div>{{ x }}</div>', script: 'const { ref } = Vue;\nconst x = ref(1);\nreturn { x };', style: '' });
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].component).not.toBeNull();
    });

    test('stores error and leaves component null on compile failure', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div/>', script: 'not valid }{', style: '' });
        expect(customVizes[name].error).toBeTruthy();
        expect(customVizes[name].component).toBeNull();
        expect(customVizes[name].errorPanel).toBe('script');
        expect(getComponent(name)).toBeNull();
    });

    test('sets errorPanel to null on successful compile', () => {
        createViz();
        const name = activeVizName.value;
        // First cause an error
        runViz(name, { template: '<div/>', script: 'invalid }{', style: '' });
        expect(customVizes[name].errorPanel).toBe('script');
        // Then succeed
        runViz(name, { template: '<div/>', script: '', style: '' });
        expect(customVizes[name].errorPanel).toBeNull();
    });

    test('stores source as object matching draft on success', () => {
        createViz();
        const name = activeVizName.value;
        const draft = { template: '<div>{{ value }}</div>', script: 'return {};', style: '.root { color: red; }' };
        runViz(name, draft);
        expect(customVizes[name].source).toEqual(draft);
    });

    test('injects style into document.head when style element does not exist', () => {
        querySelectorSpy.mockReturnValueOnce(null);
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div/>', script: '', style: 'div { color: blue; }' });
        expect(appendChildSpy).toHaveBeenCalled();
    });

    test('updates existing style element when it already exists', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<div/>', script: '', style: 'div { color: blue; }' });
        expect(appendChildSpy).not.toHaveBeenCalled();
        expect(styleEl.textContent).toContain('div');
    });

    test('sets __scopeId on the compiled component', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, { template: '<span>hi</span>', script: '', style: '' });
        const comp = customVizes[name].component;
        expect(comp.__scopeId).toMatch(/^data-v-viz-/);
        expect(comp.template).toBe('<span>hi</span>');
    });
});

describe('setErrorPanel', () => {
    test('sets errorPanel on an existing entry', () => {
        createViz();
        const name = activeVizName.value;
        setErrorPanel(name, 'template');
        expect(customVizes[name].errorPanel).toBe('template');
    });

    test('does nothing for unknown name', () => {
        expect(() => setErrorPanel('nonexistent', 'template')).not.toThrow();
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
        createViz();
        const name = activeVizName.value;
        const draft = { template: '<div/>', script: '', style: '' };
        runViz(name, draft);
        // Modify draft and set errorPanel
        saveDraft(name, { template: '<p/>', script: 'bad', style: '' });
        setErrorPanel(name, 'template');
        revertDraft(name);
        expect(customVizes[name].draft).toEqual(draft);
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].errorPanel).toBeNull();
    });

    test('does nothing if source is null', () => {
        createViz();
        const name = activeVizName.value;
        const originalDraft = { ...customVizes[name].draft };
        revertDraft(name);
        expect(customVizes[name].draft).toEqual(originalDraft);
    });
});

describe('loadVizes', () => {
    test('clears existing and loads new vizes', () => {
        createViz();
        const source = { template: '<div>{{ value }}</div>', script: '', style: '' };
        loadVizes({ MyViz: { source } });
        expect(Object.keys(customVizes)).toEqual(['MyViz']);
        expect(customVizes['MyViz'].component).not.toBeNull();
        expect(activeVizName.value).toBe('MyViz');
    });

    test('compiles each viz via runViz', () => {
        const source = { template: '<div/>', script: 'return { x: 1 };', style: '' };
        loadVizes({ V: { source } });
        expect(customVizes['V'].error).toBeNull();
        expect(customVizes['V'].source).toEqual(source);
    });
});

describe('renameViz', () => {
    test('preserves tab order', () => {
        const stub = { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
        customVizes['A'] = { ...stub };
        customVizes['B'] = { ...stub };
        customVizes['C'] = { ...stub };
        renameViz('B', 'X');
        expect(Object.keys(customVizes)).toEqual(['A', 'X', 'C']);
    });

    test('updates activeVizName when renaming the active tab', () => {
        const stub = { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
        customVizes['Viz 1'] = { ...stub };
        activeVizName.value = 'Viz 1';
        renameViz('Viz 1', 'MyViz');
        expect(activeVizName.value).toBe('MyViz');
    });

    test('does not change activeVizName when renaming a non-active tab', () => {
        const stub = { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
        customVizes['A'] = { ...stub };
        customVizes['B'] = { ...stub };
        activeVizName.value = 'A';
        renameViz('B', 'X');
        expect(activeVizName.value).toBe('A');
    });

test('returns false and does nothing if new name already exists', () => {
        const stub = { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
        customVizes['A'] = { ...stub };
        customVizes['B'] = { ...stub };
        const result = renameViz('A', 'B');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A', 'B']);
    });

    test('returns false and does nothing if old name does not exist', () => {
        const stub = { source: null, draft: { template: '', script: '', style: '' }, component: null, error: null, errorPanel: null };
        customVizes['A'] = { ...stub };
        const result = renameViz('Z', 'A2');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A']);
    });
});
