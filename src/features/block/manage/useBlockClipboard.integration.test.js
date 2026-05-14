import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useBlockClipboard } from './useBlockClipboard';

// Real store, real name generators — only clipboard is mocked.
let clipboardContent = '';
const mockWriteText = vi.fn(text => { clipboardContent = text; return Promise.resolve(); });
const mockReadText = vi.fn(() => Promise.resolve(clipboardContent));
vi.stubGlobal('navigator', { clipboard: { writeText: mockWriteText, readText: mockReadText } });

const { blocks, addBlock } = useBlockStore();
const { cutSelected, pasteBlocks, duplicateSelected } = useBlockClipboard();

const dims = { cellWidth: { value: 150 }, unitY: { value: 24 } };
const canvas = (x = 0, y = 0) => ({
    canvasX: x, canvasY: y,
    canvasEl: { offsetWidth: 800, offsetHeight: 600 },
    panX: { value: 0 }, panY: { value: 0 }
});

beforeEach(() => {
    blocks.splice(0);
    clipboardContent = '';
    mockWriteText.mockClear();
    mockReadText.mockClear();
});

// Real suffix format from generateUniqueNameFromName is `a_1`, `a_1_1`, not `a2`.

describe('multi-paste deduplication', () => {
    it('assigns a unique name on the second paste when the first paste created that name', async () => {
        clipboardContent = JSON.stringify({
            type: 'flowsheets/blocks',
            blocks: [{ id: 'x', name: 'a', x: 0, y: 0, code: '' }]
        });

        const [first] = await pasteBlocks(canvas());
        expect(first).toBe('a');

        const [second] = await pasteBlocks(canvas());
        expect(second).not.toBe('a');
        expect(blocks).toHaveLength(2);
        expect(new Set(blocks.map(b => b.name)).size).toBe(2);
    });

    it('pastes a multi-block group twice producing four uniquely named blocks', async () => {
        clipboardContent = JSON.stringify({
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'a', x: 0, y: 0, code: '' },
                { id: 'y', name: 'b', x: 50, y: 0, code: '' }
            ]
        });

        await pasteBlocks(canvas());
        await pasteBlocks(canvas());

        expect(blocks).toHaveLength(4);
        expect(new Set(blocks.map(b => b.name)).size).toBe(4);
    });

    it('remaps intra-paste code references to the renamed names on the second paste', async () => {
        clipboardContent = JSON.stringify({
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'a', x: 0, y: 0, code: '1' },
                { id: 'y', name: 'b', x: 50, y: 0, code: 'a * 2' }
            ]
        });

        await pasteBlocks(canvas()); // creates a, b

        const [aNew, bNew] = await pasteBlocks(canvas()); // creates a_1, b_1
        const bNewBlock = blocks.find(b => b.name === bNew);
        expect(bNewBlock.code).toBe(`${aNew} * 2`);
    });
});

describe('cut-then-paste round-trip', () => {
    it('removes the block from the store on cut and restores it on paste', async () => {
        addBlock({ id: '1', name: 'a', x: 10, y: 20, code: '42' });

        await cutSelected(blocks, ['a']);
        expect(blocks).toHaveLength(0);

        const newNames = await pasteBlocks(canvas());
        expect(blocks).toHaveLength(1);
        expect(newNames).toHaveLength(1);
        expect(blocks[0].code).toBe('42');
    });

    it('preserves relative positions of a multi-block group across cut-paste', async () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 100, y: 0, code: '' });

        await cutSelected(blocks, ['a', 'b']);
        expect(blocks).toHaveLength(0);

        await pasteBlocks(canvas(50, 0));
        const aBlock = blocks.find(b => b.name === 'a');
        const bBlock = blocks.find(b => b.name === 'b');
        expect(bBlock.x - aBlock.x).toBe(100);
    });

    it('gives back the original name when the store is empty after cut', async () => {
        addBlock({ id: '1', name: 'myBlock', x: 0, y: 0, code: '' });

        await cutSelected(blocks, ['myBlock']);
        const [restoredName] = await pasteBlocks(canvas());
        expect(restoredName).toBe('myBlock');
    });
});

describe('duplicate-then-duplicate', () => {
    it('assigns a fresh unique name when duplicating an already-duplicated block', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });

        const [name1] = duplicateSelected(blocks, ['a'], dims);
        expect(blocks).toHaveLength(2);

        const [name2] = duplicateSelected(blocks, [name1], dims);
        expect(blocks).toHaveLength(3);
        expect(new Set(['a', name1, name2]).size).toBe(3);
    });

    it('remaps code references correctly through two levels of duplication', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: 'a + 1' });

        const [name1] = duplicateSelected(blocks, ['a'], dims);
        expect(blocks.find(b => b.name === name1).code).toBe(`${name1} + 1`);

        const [name2] = duplicateSelected(blocks, [name1], dims);
        expect(blocks.find(b => b.name === name2).code).toBe(`${name2} + 1`);
    });
});
