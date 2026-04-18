import { reactive, computed, nextTick, createApp } from 'vue';
import { describe, test, expect } from 'vitest';
import { useEvaluatorRegistry } from './useEvaluatorRegistry';

function withSetup(fn) {
    let result;
    const app = createApp({ setup() { result = fn(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

function createRegistry(blocks, depsMap = {}) {
    const deps = reactive(depsMap);
    const dependsOn = computed(() => deps);
    return withSetup(() => useEvaluatorRegistry(blocks, dependsOn));
}

describe('adding a block', () => {
    test('getEvaluation returns a value after adding a block', async () => {
        const blocks = reactive([]);
        const { getEvaluation } = createRegistry(blocks);
        blocks.push({ id: '1', name: 'a', code: '1 + 1' });
        await nextTick();
        expect(getEvaluation('a').value).toBe(2);
        expect(getEvaluation('a').error).toBeNull();
    });

    test('unknown name returns an error', () => {
        const blocks = reactive([]);
        const { getEvaluation } = createRegistry(blocks);
        expect(getEvaluation('nope').error).toMatch(/no block named/);
    });
});

describe('removing a block', () => {
    test('getEvaluation returns an error after block is removed', async () => {
        const blocks = reactive([{ id: '1', name: 'a', code: '42' }]);
        const { getEvaluation } = createRegistry(blocks);
        expect(getEvaluation('a').value).toBe(42);
        blocks.splice(0, 1);
        await nextTick();
        expect(getEvaluation('a').error).toMatch(/no block named/);
    });

    test('other blocks unaffected', async () => {
        const blocks = reactive([
            { id: '1', name: 'a', code: '1' },
            { id: '2', name: 'b', code: '2' }
        ]);
        const { getEvaluation } = createRegistry(blocks);
        blocks.splice(0, 1); // remove 'a'
        await nextTick();
        expect(getEvaluation('b').value).toBe(2);
    });
});

describe('renaming a block', () => {
    test('old name returns error, new name resolves', async () => {
        const blocks = reactive([{ id: '1', name: 'a', code: '99' }]);
        const { getEvaluation } = createRegistry(blocks);
        expect(getEvaluation('a').value).toBe(99);
        blocks[0].name = 'z';
        await nextTick();
        expect(getEvaluation('a').error).toMatch(/no block named/);
        expect(getEvaluation('z').value).toBe(99);
    });
});

describe('getEvaluation reactivity — block added after initial call', () => {
    test('computed re-runs when a block with the queried name is added', async () => {
        const blocks = reactive([]);
        const { getEvaluation } = createRegistry(blocks);

        // Call getEvaluation in a computed before the block exists
        const result = computed(() => getEvaluation('a'));
        expect(result.value.error).toMatch(/no block named/);

        // Add the block — result should update reactively
        blocks.push({ id: '1', name: 'a', code: '7' });
        await nextTick();
        expect(result.value.value).toBe(7);
        expect(result.value.error).toBeNull();
    });

    test('computed re-runs when a block is renamed to the queried name', async () => {
        const blocks = reactive([{ id: '1', name: 'x', code: '42' }]);
        const { getEvaluation } = createRegistry(blocks);
        await nextTick();

        const result = computed(() => getEvaluation('a'));
        expect(result.value.error).toMatch(/no block named/);

        blocks[0].name = 'a';
        await nextTick();
        expect(result.value.value).toBe(42);
    });
});

describe('circular dependency', () => {
    test('getEvaluation returns a cycle error', async () => {
        const blocks = reactive([
            { id: '1', name: 'a', code: 'b' },
            { id: '2', name: 'b', code: 'a' }
        ]);
        const { getEvaluation } = createRegistry(blocks, { a: ['b'], b: ['a'] });
        await nextTick();
        const result = getEvaluation('a');
        expect(result.error).toMatch(/circular/i);
    });
});

describe('dispose', () => {
    test('getEvaluation returns error for all blocks after dispose', async () => {
        const blocks = reactive([
            { id: '1', name: 'a', code: '1' },
            { id: '2', name: 'b', code: '2' }
        ]);
        const { getEvaluation, dispose } = createRegistry(blocks);
        expect(getEvaluation('a').value).toBe(1);
        dispose();
        expect(getEvaluation('a').error).toMatch(/no block named/);
        expect(getEvaluation('b').error).toMatch(/no block named/);
    });
});
