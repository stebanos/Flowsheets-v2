import { computed } from 'vue';
import { describe, expect, test, vi } from 'vitest';
import { createEntityStore } from './entity-store';

describe('add', () => {
    test('item appears in items', () => {
        const { items, add } = createEntityStore();
        add({ id: '1', name: 'a' });
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('1');
    });

    test('computed over items updates reactively', () => {
        const { items, add } = createEntityStore();
        const count = computed(() => items.length);
        expect(count.value).toBe(0);
        add({ id: '1', name: 'a' });
        expect(count.value).toBe(1);
    });
});

describe('remove', () => {
    test('removes item by id', () => {
        const { items, add, remove } = createEntityStore();
        add({ id: '1', name: 'a' });
        add({ id: '2', name: 'b' });
        remove('1');
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('2');
    });

    test('no-op for unknown id', () => {
        const { items, add, remove } = createEntityStore();
        add({ id: '1', name: 'a' });
        remove('999');
        expect(items).toHaveLength(1);
    });

    test('other items unaffected', () => {
        const { items, add, remove } = createEntityStore();
        add({ id: '1', name: 'a' });
        add({ id: '2', name: 'b' });
        add({ id: '3', name: 'c' });
        remove('2');
        expect(items.map(i => i.id)).toEqual(['1', '3']);
    });
});

describe('update', () => {
    test('patches only specified fields', () => {
        const { items, add, update } = createEntityStore();
        add({ id: '1', name: 'a', code: '1', x: 0, y: 0 });
        update('1', { code: '42' });
        expect(items[0].code).toBe('42');
        expect(items[0].name).toBe('a');
        expect(items[0].x).toBe(0);
    });

    test('no-op for unknown id', () => {
        const { items, add, update } = createEntityStore();
        add({ id: '1', code: '1' });
        update('999', { code: 'x' });
        expect(items[0].code).toBe('1');
    });

    test('computed over item field updates reactively', () => {
        const { items, add, update } = createEntityStore();
        add({ id: '1', code: '1' });
        const code = computed(() => items[0]?.code);
        expect(code.value).toBe('1');
        update('1', { code: '99' });
        expect(code.value).toBe('99');
    });
});

describe('replace', () => {
    test('replaces all items with the new set', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '1', name: 'a' });
        add({ id: '2', name: 'b' });
        replace([{ id: '3', name: 'c' }]);
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('3');
    });

    test('clears all items when called with an empty array', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '1', name: 'a' });
        replace([]);
        expect(items).toHaveLength(0);
    });

    test('reactive — computed over items updates after replace', () => {
        const { items, add, replace } = createEntityStore();
        const count = computed(() => items.length);
        add({ id: '1', name: 'a' });
        expect(count.value).toBe(1);
        replace([{ id: '2', name: 'b' }, { id: '3', name: 'c' }]);
        expect(count.value).toBe(2);
    });

    test('updates existing item in-place, preserving object reference', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '1', name: 'a', visualizationType: 'default' });
        const ref = items[0];
        replace([{ id: '1', name: 'a', visualizationType: 'table' }]);
        expect(items[0]).toBe(ref);
        expect(ref.visualizationType).toBe('table');
    });

    test('keeps identity for every existing id while removing missing ones', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '1', name: 'a' });
        add({ id: '2', name: 'b' });
        add({ id: '3', name: 'c' });
        const [ref1, , ref3] = items;
        replace([{ id: '3', name: 'c2' }, { id: '1', name: 'a2' }]);
        expect(items.map(i => i.id)).toEqual(['1', '3']);
        expect(items[0]).toBe(ref1);
        expect(items[1]).toBe(ref3);
        expect(ref1.name).toBe('a2');
        expect(ref3.name).toBe('c2');
    });

    test('deletes keys absent from the incoming object', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '1', name: 'a', color: 'red', x: 10 });
        const ref = items[0];
        replace([{ id: '1', name: 'a' }]);
        expect(items[0]).toBe(ref);
        expect('color' in ref).toBe(false);
        expect('x' in ref).toBe(false);
        expect(ref.name).toBe('a');
    });

    test('appends new items after existing ones, in incoming order', () => {
        const { items, add, replace } = createEntityStore();
        add({ id: '2', name: 'b' });
        replace([{ id: '9', name: 'z' }, { id: '2', name: 'b' }, { id: '5', name: 'e' }]);
        expect(items.map(i => i.id)).toEqual(['2', '9', '5']);
    });
});

describe('beforeMutation hook', () => {
    test('add calls hook once with tag before the array changes', () => {
        const { items, add, setBeforeMutationHook } = createEntityStore();
        const seen = [];
        const hook = vi.fn(() => seen.push(items.length));
        setBeforeMutationHook(hook);
        add({ id: '1' }, 'add-tag');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledWith('add-tag');
        expect(seen).toEqual([0]);
    });

    test('remove calls hook once with tag before the array changes', () => {
        const { items, add, remove, setBeforeMutationHook } = createEntityStore();
        add({ id: '1' });
        const seen = [];
        const hook = vi.fn(() => seen.push(items.length));
        setBeforeMutationHook(hook);
        remove('1', 'remove-tag');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledWith('remove-tag');
        expect(seen).toEqual([1]);
    });

    test('update calls hook once with tag before the item changes', () => {
        const { items, add, update, setBeforeMutationHook } = createEntityStore();
        add({ id: '1', code: 'old' });
        const seen = [];
        const hook = vi.fn(() => seen.push(items[0].code));
        setBeforeMutationHook(hook);
        update('1', { code: 'new' }, 'update-tag');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledWith('update-tag');
        expect(seen).toEqual(['old']);
    });

    test('replace calls hook once with tag before the array changes', () => {
        const { items, add, replace, setBeforeMutationHook } = createEntityStore();
        add({ id: '1' });
        const seen = [];
        const hook = vi.fn(() => seen.push(items.length));
        setBeforeMutationHook(hook);
        replace([], 'replace-tag');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledWith('replace-tag');
        expect(seen).toEqual([1]);
    });

    test('missing tag is passed as null', () => {
        const { add, remove, update, replace, setBeforeMutationHook } = createEntityStore();
        const hook = vi.fn();
        setBeforeMutationHook(hook);
        add({ id: '1' });
        update('1', { a: 1 });
        remove('1');
        replace([]);
        expect(hook.mock.calls).toEqual([[null], [null], [null], [null]]);
    });

    test('hook is not called when remove misses', () => {
        const { remove, setBeforeMutationHook } = createEntityStore();
        const hook = vi.fn();
        setBeforeMutationHook(hook);
        remove('999', 'tag');
        expect(hook).not.toHaveBeenCalled();
    });

    test('hook is not called when update misses', () => {
        const { update, setBeforeMutationHook } = createEntityStore();
        const hook = vi.fn();
        setBeforeMutationHook(hook);
        update('999', { a: 1 }, 'tag');
        expect(hook).not.toHaveBeenCalled();
    });

    test('setBeforeMutationHook(null) detaches the hook', () => {
        const { items, add, setBeforeMutationHook } = createEntityStore();
        const hook = vi.fn();
        setBeforeMutationHook(hook);
        add({ id: '1' });
        setBeforeMutationHook(null);
        add({ id: '2' });
        expect(hook).toHaveBeenCalledTimes(1);
        expect(items).toHaveLength(2);
    });

    test('mutations work without any hook installed', () => {
        const { items, add, update, remove, replace } = createEntityStore();
        add({ id: '1' });
        update('1', { a: 1 });
        remove('1');
        replace([{ id: '2' }]);
        expect(items.map(i => i.id)).toEqual(['2']);
    });
});

describe('independence', () => {
    test('two stores do not share items', () => {
        const a = createEntityStore();
        const b = createEntityStore();
        a.add({ id: '1' });
        expect(a.items).toHaveLength(1);
        expect(b.items).toHaveLength(0);
        expect(a.items).not.toBe(b.items);
    });

    test('two stores do not share hooks', () => {
        const a = createEntityStore();
        const b = createEntityStore();
        const hookA = vi.fn();
        const hookB = vi.fn();
        a.setBeforeMutationHook(hookA);
        b.setBeforeMutationHook(hookB);
        a.add({ id: '1' });
        expect(hookA).toHaveBeenCalledTimes(1);
        expect(hookB).not.toHaveBeenCalled();
        b.add({ id: '2' });
        expect(hookA).toHaveBeenCalledTimes(1);
        expect(hookB).toHaveBeenCalledTimes(1);
    });
});
