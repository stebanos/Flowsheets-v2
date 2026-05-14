import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddBlock = vi.fn();
const mockRemoveBlock = vi.fn();
const mockBlocks = [];

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ addBlock: mockAddBlock, removeBlock: mockRemoveBlock, blocks: mockBlocks }),
    generateUniqueNameFromName: (name, taken) => {
        let c = name; let i = 2;
        while (taken.includes(c)) { c = `${name}${i++}`; }
        return c;
    }
}));

vi.mock('@/shared/utils', () => ({ generateUniqueId: vi.fn(() => crypto.randomUUID()) }));

const mockWriteText = vi.fn();
const mockReadText = vi.fn();
vi.stubGlobal('navigator', { clipboard: { writeText: mockWriteText, readText: mockReadText } });

const { useBlockClipboard } = await import('./useBlockClipboard');
const { copySelected, cutSelected, pasteBlocks, duplicateSelected } = useBlockClipboard();

beforeEach(() => {
    mockAddBlock.mockClear();
    mockRemoveBlock.mockClear();
    mockWriteText.mockReset().mockResolvedValue(undefined);
    mockReadText.mockReset();
    mockBlocks.length = 0;
});

describe('copySelected', () => {
    it('returns false when no blocks match', async () => {
        const result = await copySelected([], ['a']);
        expect(result).toBe(false);
        expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('returns false when selectedNames does not match any block', async () => {
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = await copySelected(blocks, ['z']);
        expect(result).toBe(false);
    });

    it('writes JSON with the correct type', async () => {
        const blocks = [{ id: '1', name: 'a', x: 10, y: 20, code: 'a + 1' }];
        await copySelected(blocks, ['a']);
        const written = JSON.parse(mockWriteText.mock.calls[0][0]);
        expect(written.type).toBe('flowsheets/blocks');
    });

    it('normalises positions so bounding-box top-left is (0, 0)', async () => {
        const blocks = [
            { id: '1', name: 'a', x: 10, y: 20, code: '' },
            { id: '2', name: 'b', x: 30, y: 40, code: '' }
        ];
        await copySelected(blocks, ['a', 'b']);
        const { blocks: saved } = JSON.parse(mockWriteText.mock.calls[0][0]);
        expect(saved[0].x).toBe(0);
        expect(saved[0].y).toBe(0);
        expect(saved[1].x).toBe(20);
        expect(saved[1].y).toBe(20);
    });

    it('returns false when writeText rejects', async () => {
        mockWriteText.mockRejectedValue(new Error('denied'));
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = await copySelected(blocks, ['a']);
        expect(result).toBe(false);
    });

    it('returns true on success', async () => {
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = await copySelected(blocks, ['a']);
        expect(result).toBe(true);
    });
});

describe('cutSelected', () => {
    it('calls removeBlock for each selected block id after copy succeeds', async () => {
        const blocks = [
            { id: '1', name: 'a', x: 0, y: 0, code: '' },
            { id: '2', name: 'b', x: 50, y: 0, code: '' }
        ];
        await cutSelected(blocks, ['a', 'b']);
        expect(mockRemoveBlock).toHaveBeenCalledWith('1');
        expect(mockRemoveBlock).toHaveBeenCalledWith('2');
    });

    it('does not call removeBlock when clipboard write fails', async () => {
        mockWriteText.mockRejectedValue(new Error('denied'));
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        await cutSelected(blocks, ['a']);
        expect(mockRemoveBlock).not.toHaveBeenCalled();
    });

    it('returns false when copy fails', async () => {
        mockWriteText.mockRejectedValue(new Error('denied'));
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = await cutSelected(blocks, ['a']);
        expect(result).toBe(false);
    });

    it('returns true on success', async () => {
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = await cutSelected(blocks, ['a']);
        expect(result).toBe(true);
    });
});

describe('pasteBlocks', () => {
    const makeCanvas = () => ({
        canvasEl: { offsetWidth: 800, offsetHeight: 600 },
        panX: { value: 0 },
        panY: { value: 0 }
    });

    it('returns null when readText rejects', async () => {
        mockReadText.mockRejectedValue(new Error('denied'));
        const result = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(result).toBeNull();
    });

    it('returns null when clipboard text is not valid JSON', async () => {
        mockReadText.mockResolvedValue('not json');
        const result = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(result).toBeNull();
    });

    it('returns null when type is not flowsheets/blocks', async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ type: 'other', blocks: [] }));
        const result = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(result).toBeNull();
    });

    it('returns empty array and calls no addBlock for empty blocks payload', async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ type: 'flowsheets/blocks', blocks: [] }));
        const result = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(result).toEqual([]);
        expect(mockAddBlock).not.toHaveBeenCalled();
    });

    it('calls addBlock for each block in payload', async () => {
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'a', x: 0, y: 0, code: '1' },
                { id: 'y', name: 'b', x: 50, y: 0, code: '2' }
            ]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        await pasteBlocks({ canvasX: 100, canvasY: 200, ...makeCanvas() });
        expect(mockAddBlock).toHaveBeenCalledTimes(2);
    });

    it('assigns unique names when name already exists in store', async () => {
        mockBlocks.push({ id: 'existing', name: 'a', x: 0, y: 0, code: '' });
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [{ id: 'x', name: 'a', x: 0, y: 0, code: '' }]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        const newNames = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(newNames[0]).not.toBe('a');
        expect(newNames[0]).toBe('a2');
    });

    it('returns an array of new block names', async () => {
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'foo', x: 0, y: 0, code: '' },
                { id: 'y', name: 'bar', x: 50, y: 0, code: '' }
            ]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        const newNames = await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        expect(newNames).toEqual(['foo', 'bar']);
    });

    it('remaps intra-paste code references', async () => {
        mockBlocks.push({ id: 'e1', name: 'a', x: 0, y: 0, code: '' });
        mockBlocks.push({ id: 'e2', name: 'b', x: 0, y: 0, code: '' });
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'a', x: 0, y: 0, code: 'a + 1' },
                { id: 'y', name: 'b', x: 50, y: 0, code: 'a * b' }
            ]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        const firstCall = mockAddBlock.mock.calls[0][0];
        const secondCall = mockAddBlock.mock.calls[1][0];
        expect(firstCall.code).toBe('a2 + 1');
        expect(secondCall.code).toBe('a2 * b2');
    });

    it('leaves external block references untouched', async () => {
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [
                { id: 'x', name: 'a', x: 0, y: 0, code: 'external + a' }
            ]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        await pasteBlocks({ canvasX: 0, canvasY: 0, ...makeCanvas() });
        const firstCall = mockAddBlock.mock.calls[0][0];
        expect(firstCall.code).toBe('external + a');
    });

    it('places bounding-box top-left at (canvasX, canvasY)', async () => {
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [{ id: 'x', name: 'a', x: 0, y: 0, code: '' }]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        await pasteBlocks({ canvasX: 100, canvasY: 200, ...makeCanvas() });
        const call = mockAddBlock.mock.calls[0][0];
        expect(call.x).toBe(100);
        expect(call.y).toBe(200);
    });

    it('falls back to canvas centre when canvasX/canvasY are null', async () => {
        const payload = {
            type: 'flowsheets/blocks',
            blocks: [{ id: 'x', name: 'a', x: 0, y: 0, code: '' }]
        };
        mockReadText.mockResolvedValue(JSON.stringify(payload));
        const panX = { value: -50 };
        const panY = { value: -100 };
        const canvasEl = { offsetWidth: 800, offsetHeight: 600 };
        await pasteBlocks({ canvasX: null, canvasY: null, canvasEl, panX, panY });
        const call = mockAddBlock.mock.calls[0][0];
        expect(call.x).toBe(50 + 400); // -panX + offsetWidth/2
        expect(call.y).toBe(100 + 300);
    });
});

describe('duplicateSelected', () => {
    const dims = () => ({ cellWidth: { value: 150 }, unitY: { value: 24 } });

    it('returns null when nothing is selected', () => {
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const result = duplicateSelected(blocks, [], dims());
        expect(result).toBeNull();
    });

    it('offsets position by +50 snapped to grid', () => {
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        duplicateSelected(blocks, ['a'], dims());
        const call = mockAddBlock.mock.calls[0][0];
        expect(call.x).toBe(Math.floor(50 / 150) * 150);
        expect(call.y).toBe(Math.floor(50 / 24) * 24);
    });

    it('deduplicates names when original name is taken', () => {
        mockBlocks.push({ id: 'e', name: 'a', x: 0, y: 0, code: '' });
        const blocks = [{ id: '1', name: 'a', x: 0, y: 0, code: '' }];
        const newNames = duplicateSelected(blocks, ['a'], dims());
        expect(newNames[0]).toBe('a2');
    });

    it('remaps intra-selection code references', () => {
        const blocks = [
            { id: '1', name: 'a', x: 0, y: 0, code: 'a + 1' },
            { id: '2', name: 'b', x: 0, y: 0, code: 'a * b' }
        ];
        mockBlocks.push(...blocks);
        duplicateSelected(blocks, ['a', 'b'], dims());
        const firstCall = mockAddBlock.mock.calls[0][0];
        const secondCall = mockAddBlock.mock.calls[1][0];
        expect(firstCall.code).toBe('a2 + 1');
        expect(secondCall.code).toBe('a2 * b2');
    });

    it('returns new block names', () => {
        const blocks = [
            { id: '1', name: 'foo', x: 0, y: 0, code: '' },
            { id: '2', name: 'bar', x: 0, y: 0, code: '' }
        ];
        mockBlocks.push(...blocks);
        const newNames = duplicateSelected(blocks, ['foo', 'bar'], dims());
        expect(newNames).toEqual(['foo2', 'bar2']);
    });
});
