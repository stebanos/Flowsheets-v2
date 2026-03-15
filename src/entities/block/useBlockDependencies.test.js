import { describe, test, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { createApp } from 'vue';
import { useBlockDependencies } from './useBlockDependencies';
import { useBlockStore } from '@/entities/block';

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
