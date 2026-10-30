import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createBlock, setBeforeMutationHook, useBlockStore } from '@/entities/block';
import { useListOrder } from './useListOrder';

const mk = (id, listPosition = null) => createBlock({ id, name: id, x: 0, y: 0, width: 2, height: 2, listPosition });

let store;
let tags;

beforeEach(() => {
    store = useBlockStore();
    store.replaceBlocks([]);
    tags = [];
    setBeforeMutationHook(tag => tags.push(tag));
});

afterEach(() => {
    setBeforeMutationHook(null);
});

const get = id => store.blocks.find(b => b.id === id);

describe('include / exclude / toggle', () => {
    test('first include gets 0, next gets max+1', () => {
        store.replaceBlocks([mk('a'), mk('b'), mk('c', 4)]);
        const { include } = useListOrder();
        include(get('a'));
        expect(get('a').listPosition).toBe(5);
        store.replaceBlocks([mk('a'), mk('b')]);
        include(get('a'));
        expect(get('a').listPosition).toBe(0);
        include(get('b'));
        expect(get('b').listPosition).toBe(1);
    });

    test('include is a no-op when already included', () => {
        store.replaceBlocks([mk('a', 3)]);
        tags.length = 0;
        useListOrder().include(get('a'));
        expect(get('a').listPosition).toBe(3);
        expect(tags).toHaveLength(0);
    });

    test('exclude nulls listPosition; no-op when not included', () => {
        store.replaceBlocks([mk('a', 0), mk('b')]);
        const { exclude } = useListOrder();
        exclude(get('a'));
        expect(get('a').listPosition).toBeNull();
        tags.length = 0;
        exclude(get('b'));
        expect(tags).toHaveLength(0);
    });

    test('toggle flips inclusion', () => {
        store.replaceBlocks([mk('a')]);
        const { toggle, isIncluded } = useListOrder();
        toggle(get('a'));
        expect(isIncluded(get('a'))).toBe(true);
        toggle(get('a'));
        expect(isIncluded(get('a'))).toBe(false);
    });
});

describe('includedBlocks', () => {
    test('sorted by listPosition and excludes nulls', () => {
        store.replaceBlocks([mk('a', 2), mk('b'), mk('c', 0), mk('d', 1)]);
        const { includedBlocks } = useListOrder();
        expect(includedBlocks.value.map(b => b.id)).toEqual(['c', 'd', 'a']);
    });
});

describe('moveTo', () => {
    test('reindexes to 0..n-1', () => {
        store.replaceBlocks([mk('a', 0), mk('b', 5), mk('c', 9), mk('x')]);
        const { moveTo, includedBlocks } = useListOrder();
        moveTo('c', 0);
        expect(includedBlocks.value.map(b => b.id)).toEqual(['c', 'a', 'b']);
        expect(['c', 'a', 'b'].map(id => get(id).listPosition)).toEqual([0, 1, 2]);
        expect(get('x').listPosition).toBeNull();
    });

    test('writes within one moveTo share a tag; a second moveTo differs', () => {
        store.replaceBlocks([mk('a', 0), mk('b', 1), mk('c', 2)]);
        const { moveTo } = useListOrder();
        tags.length = 0;
        moveTo('a', 2);
        const first = [...tags];
        expect(first.length).toBeGreaterThan(1);
        expect(new Set(first).size).toBe(1);
        expect(first[0]).toMatch(/^listorder:/);
        tags.length = 0;
        moveTo('a', 0);
        expect(tags.length).toBeGreaterThan(0);
        expect(new Set(tags).size).toBe(1);
        expect(tags[0]).not.toBe(first[0]);
    });

    test('clamps index', () => {
        store.replaceBlocks([mk('a', 0), mk('b', 1), mk('c', 2)]);
        const { moveTo, includedBlocks } = useListOrder();
        moveTo('a', 99);
        expect(includedBlocks.value.map(b => b.id)).toEqual(['b', 'c', 'a']);
        moveTo('a', -5);
        expect(includedBlocks.value.map(b => b.id)).toEqual(['a', 'b', 'c']);
    });

    test('no-op for non-included block or unchanged index', () => {
        store.replaceBlocks([mk('a', 0), mk('b')]);
        const { moveTo } = useListOrder();
        tags.length = 0;
        moveTo('b', 0);
        moveTo('a', 0);
        expect(tags).toHaveLength(0);
    });
});
