import { createApp, nextTick } from 'vue';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBlockDependencies, useBlockStore } from '@/entities/block';

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

const { blocks, addBlock, removeBlock, updateBlock } = useBlockStore();

beforeEach(() => {
    blocks.splice(0);
});

describe('identifiersByBlock', () => {
    test('populated from initial blocks', () => {
        addBlock({ id: '1', name: 'a', code: 'b + 1' });
        addBlock({ id: '2', name: 'b', code: '10' });
        const { identifiersByBlock } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(identifiersByBlock['a']).toContain('b');
        expect(identifiersByBlock['b']).toEqual([]);
    });

    test('updates when block code changes', async () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: '2' });
        const { identifiersByBlock } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(identifiersByBlock['a']).toEqual([]);
        updateBlock('1', { code: 'b + 1' });
        await nextTick();
        expect(identifiersByBlock['a']).toContain('b');
    });

    test('removed block is deleted from identifiersByBlock', async () => {
        addBlock({ id: '1', name: 'a', code: 'b' });
        addBlock({ id: '2', name: 'b', code: '1' });
        const { identifiersByBlock } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect('a' in identifiersByBlock).toBe(true);
        removeBlock('1');
        await nextTick();
        expect('a' in identifiersByBlock).toBe(false);
    });
});

describe('dependsOn', () => {
    test('excludes self-references', () => {
        addBlock({ id: '1', name: 'a', code: 'a + 1' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(dependsOn.value['a']).not.toContain('a');
    });

    test('excludes identifiers that are not block names', () => {
        addBlock({ id: '1', name: 'a', code: 'Math.random() + foo' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(dependsOn.value['a']).toEqual([]);
    });

    test('includes only identifiers that match another block name', () => {
        addBlock({ id: '1', name: 'a', code: 'b + c + foo' });
        addBlock({ id: '2', name: 'b', code: '1' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(dependsOn.value['a']).toEqual(['b']);
    });

    test('updates reactively when code changes', async () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: '2' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(dependsOn.value['a']).toEqual([]);
        updateBlock('1', { code: 'b * 2' });
        await nextTick();
        expect(dependsOn.value['a']).toContain('b');
    });
});

describe('stability — unchanged entries keep their identity', () => {
    test('identifiersByBlock keeps the same array when a block\'s identifiers did not change', async () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: 'a + 1' });
        const { identifiersByBlock } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        const before = identifiersByBlock['b'];
        updateBlock('1', { code: '2' });
        await nextTick();
        expect(identifiersByBlock['b']).toBe(before);
    });

    test('dependsOn keeps the same map and the same per-block arrays for unrelated blocks', async () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: 'a + 1' });
        addBlock({ id: '3', name: 'c', code: '3' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        const mapBefore = dependsOn.value;
        const bBefore = dependsOn.value['b'];
        updateBlock('3', { code: 'a * 2' });
        await nextTick();
        expect(dependsOn.value).toBe(mapBefore);
        expect(dependsOn.value['b']).toBe(bBefore);
        expect(dependsOn.value['c']).toEqual(['a']);
    });

    test('dependsOn follows a rename of a dependency', async () => {
        addBlock({ id: '1', name: 'a', code: 'b + 1' });
        addBlock({ id: '2', name: 'b', code: '2' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        updateBlock('2', { name: 'c' });
        updateBlock('1', { code: 'c + 1' });
        await nextTick();
        expect(dependsOn.value['a']).toEqual(['c']);
        expect('b' in dependsOn.value).toBe(false);
    });
});

describe('local declarations', () => {
    test('a local const shadowing a block name is not a dependency', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: 'const a = 5; a * 2' });
        const { dependsOn } = withSetup(() => useBlockDependencies({ debounceMs: 0 }));
        expect(dependsOn.value['b']).toEqual([]);
    });
});
