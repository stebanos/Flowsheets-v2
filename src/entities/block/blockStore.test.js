import { describe, test, expect, beforeEach } from 'vitest';
import { computed } from 'vue';
import { useBlockStore } from './blockStore';

const { blocks, addBlock, removeBlock, updateBlock } = useBlockStore();

beforeEach(() => {
    blocks.splice(0);
});

describe('addBlock', () => {
    test('block appears in blocks', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        expect(blocks).toHaveLength(1);
        expect(blocks[0].id).toBe('1');
    });

    test('computed over blocks updates reactively', () => {
        const count = computed(() => blocks.length);
        expect(count.value).toBe(0);
        addBlock({ id: '1', name: 'a', code: '1' });
        expect(count.value).toBe(1);
    });
});

describe('removeBlock', () => {
    test('removes block by id', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: '2' });
        removeBlock('1');
        expect(blocks).toHaveLength(1);
        expect(blocks[0].id).toBe('2');
    });

    test('no-op for unknown id', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        removeBlock('999');
        expect(blocks).toHaveLength(1);
    });

    test('other blocks unaffected', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        addBlock({ id: '2', name: 'b', code: '2' });
        addBlock({ id: '3', name: 'c', code: '3' });
        removeBlock('2');
        expect(blocks.map(b => b.id)).toEqual(['1', '3']);
    });
});

describe('updateBlock', () => {
    test('patches only specified fields', () => {
        addBlock({ id: '1', name: 'a', code: '1', x: 0, y: 0 });
        updateBlock('1', { code: '42' });
        expect(blocks[0].code).toBe('42');
        expect(blocks[0].name).toBe('a');
        expect(blocks[0].x).toBe(0);
    });

    test('no-op for unknown id', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        updateBlock('999', { code: 'x' });
        expect(blocks[0].code).toBe('1');
    });

    test('computed over block field updates reactively', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        const code = computed(() => blocks[0]?.code);
        expect(code.value).toBe('1');
        updateBlock('1', { code: '99' });
        expect(code.value).toBe('99');
    });
});

describe('singleton', () => {
    test('two calls to useBlockStore share the same blocks array', () => {
        const store1 = useBlockStore();
        const store2 = useBlockStore();
        store1.addBlock({ id: '1', name: 'a', code: '1' });
        expect(store2.blocks).toHaveLength(1);
    });
});
