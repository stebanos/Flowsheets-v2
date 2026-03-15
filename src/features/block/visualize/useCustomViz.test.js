import { describe, test, expect, beforeEach } from 'vitest';
import { useCustomViz } from './useCustomViz';
import { useBlockStore } from '@/entities/block/blockStore';

const { customVizes, activeVizName, createViz, renameViz, runViz, getComponent } = useCustomViz();
const { blocks, addBlock } = useBlockStore();

beforeEach(() => {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
    blocks.splice(0);
});

describe('runViz', () => {
    test('stores compiled component on entry', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, `{ props: ['value'], template: '<div>{{ value }}</div>' }`);
        expect(customVizes[name].error).toBeNull();
        expect(customVizes[name].component).not.toBeNull();
        expect(getComponent(name)).not.toBeNull();
    });

    test('stores error and leaves component null on compile failure', () => {
        createViz();
        const name = activeVizName.value;
        runViz(name, 'not valid }{');
        expect(customVizes[name].error).toBeTruthy();
        expect(customVizes[name].component).toBeNull();
        expect(getComponent(name)).toBeNull();
    });
});

describe('renameViz', () => {
    test('preserves tab order', () => {
        customVizes['A'] = { source: null, draft: '', component: null, error: null };
        customVizes['B'] = { source: null, draft: '', component: null, error: null };
        customVizes['C'] = { source: null, draft: '', component: null, error: null };
        renameViz('B', 'X');
        expect(Object.keys(customVizes)).toEqual(['A', 'X', 'C']);
    });

    test('updates activeVizName when renaming the active tab', () => {
        customVizes['Viz 1'] = { source: null, draft: '', component: null, error: null };
        activeVizName.value = 'Viz 1';
        renameViz('Viz 1', 'MyViz');
        expect(activeVizName.value).toBe('MyViz');
    });

    test('does not change activeVizName when renaming a non-active tab', () => {
        customVizes['A'] = { source: null, draft: '', component: null, error: null };
        customVizes['B'] = { source: null, draft: '', component: null, error: null };
        activeVizName.value = 'A';
        renameViz('B', 'X');
        expect(activeVizName.value).toBe('A');
    });

    test('updates blocks whose customVizName matches the old name', () => {
        addBlock({ id: '1', name: 'a', code: '1', visualizationType: 'custom', vizOptions: { customVizName: 'Old' } });
        addBlock({ id: '2', name: 'b', code: '2', visualizationType: 'custom', vizOptions: { customVizName: 'Other' } });
        customVizes['Old'] = { source: null, draft: '', component: null, error: null };
        renameViz('Old', 'New');
        expect(blocks.find(b => b.id === '1').vizOptions.customVizName).toBe('New');
        expect(blocks.find(b => b.id === '2').vizOptions.customVizName).toBe('Other');
    });

    test('returns false and does nothing if new name already exists', () => {
        customVizes['A'] = { source: null, draft: '', component: null, error: null };
        customVizes['B'] = { source: null, draft: '', component: null, error: null };
        const result = renameViz('A', 'B');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A', 'B']);
    });

    test('returns false and does nothing if old name does not exist', () => {
        customVizes['A'] = { source: null, draft: '', component: null, error: null };
        const result = renameViz('Z', 'A2');
        expect(result).toBe(false);
        expect(Object.keys(customVizes)).toEqual(['A']);
    });
});