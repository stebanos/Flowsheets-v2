import { describe, test, expect, beforeEach } from 'vitest';
import { useBlockManager } from './useBlockManager';
import { useBlockStore } from '@/entities/block';

const { blocks } = useBlockStore();

beforeEach(() => {
    blocks.splice(0);
});

describe('createBlock — return value', () => {
    test('returns the name of the newly created block', () => {
        const { createBlock } = useBlockManager();
        const name = createBlock({ x: 0, y: 0 });
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
    });

    test('returned name matches the name stored in the block', () => {
        const { createBlock } = useBlockManager();
        const name = createBlock({ x: 0, y: 0 });
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe(name);
    });

    test('uses a unique name from the provided hint when name is given', () => {
        const { createBlock } = useBlockManager();
        const name = createBlock({ x: 0, y: 0 }, 'myHint');
        expect(name).toBe('myHint');
        expect(blocks[0].name).toBe('myHint');
    });

    test('deduplicates the hinted name when it already exists', () => {
        const { createBlock } = useBlockManager();
        createBlock({ x: 0, y: 0 }, 'foo');
        const second = createBlock({ x: 0, y: 0 }, 'foo');
        // The name must be different from 'foo' to avoid collision
        expect(second).not.toBe('foo');
        expect(blocks[1].name).toBe(second);
    });

    test('auto-generates a unique name when no hint is given', () => {
        const { createBlock } = useBlockManager();
        const first = createBlock({ x: 0, y: 0 });
        const second = createBlock({ x: 0, y: 0 });
        expect(first).not.toBe(second);
    });
});

describe('createBlock — block shape', () => {
    test('block is added to the store', () => {
        const { createBlock } = useBlockManager();
        createBlock({ x: 0, y: 0 });
        expect(blocks).toHaveLength(1);
    });

    test('block uses the supplied code argument', () => {
        const { createBlock } = useBlockManager();
        createBlock({ x: 0, y: 0 }, null, 'myCode');
        expect(blocks[0].code).toBe('myCode');
    });

    test('block defaults to "1 + 1" when no code is given', () => {
        const { createBlock } = useBlockManager();
        createBlock({ x: 0, y: 0 });
        expect(blocks[0].code).toBe('1 + 1');
    });

    test('block has required shape fields', () => {
        const { createBlock } = useBlockManager();
        createBlock({ x: 0, y: 0 });
        const block = blocks[0];
        expect(block).toHaveProperty('id');
        expect(block).toHaveProperty('name');
        expect(block).toHaveProperty('x');
        expect(block).toHaveProperty('y');
        expect(block).toHaveProperty('width');
        expect(block).toHaveProperty('height');
        expect(block).toHaveProperty('code');
        expect(block).toHaveProperty('inputModes');
        expect(block).toHaveProperty('visualizationType');
        expect(block).toHaveProperty('vizOptions');
        expect(block).toHaveProperty('isStringConcat');
        expect(block).toHaveProperty('userMinWidth');
        expect(block).toHaveProperty('userMinEditorHeight');
    });

    test('x and y are snapped to grid (multiples of cell dimensions)', () => {
        const { createBlock } = useBlockManager();
        // Default cellWidth = 30, unitY = 30
        createBlock({ x: 17, y: 22 });
        const block = blocks[0];
        // Math.floor(17 / 30) * 30 = 0
        expect(block.x % 30).toBe(0);
        // Math.floor(22 / 30) * 30 = 0
        expect(block.y % 30).toBe(0);
    });
});
