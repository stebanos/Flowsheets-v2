import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useCustomViz } from './useCustomViz';

// Mocked by resolved module id, so the store's relative `./useVizLibrary` import is mocked too.
vi.mock('@/entities/viz/useVizLibrary', () => ({
    useVizLibrary: () => ({
        library: {},
        createLibraryEntry: vi.fn(),
        saveLibraryEntry: vi.fn(),
        deleteLibraryEntry: vi.fn(),
        renameLibraryEntry: vi.fn()
    })
}));

const { customVizes, activeVizName, createViz, runViz, saveDraft, revertDraft, getComponent, loadVizes, setErrorPanel } = useCustomViz();
const { blocks } = useBlockStore();

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

beforeEach(() => {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
    blocks.splice(0);

    styleEl = makeStyleEl('');
    // Default: style element already exists (querySelector returns it)
    querySelectorSpy = vi.spyOn(document.head, 'querySelector').mockReturnValue(styleEl);
    appendChildSpy = vi.spyOn(document.head, 'appendChild').mockReturnValue(styleEl);
    vi.spyOn(document, 'createElement').mockReturnValue(styleEl);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useCustomViz', () => {
    test('exposes the store state and data operations alongside the compile operations', () => {
        const api = useCustomViz();
        for (const key of ['customVizes', 'activeVizName', 'createViz', 'deleteViz', 'renameViz', 'runViz', 'saveDraft', 'revertDraft', 'getComponent', 'loadVizes', 'setErrorPanel']) {
            expect(api[key]).toBeDefined();
        }
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

describe('revertDraft after a compile', () => {
    test('restores draft to the compiled source and clears error and errorPanel', () => {
        createViz();
        const name = activeVizName.value;
        const draft = { template: '<div/>', script: '', style: '' };
        runViz(name, draft);
        saveDraft(name, { template: '<p/>', script: 'bad', style: '' });
        setErrorPanel(name, 'template');
        revertDraft(name);
        expect(customVizes[name].draft).toEqual(draft);
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].errorPanel).toBeNull();
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
