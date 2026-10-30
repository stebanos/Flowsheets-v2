import { describe, expect, it } from 'vitest';
import { readSheetData } from './sheetLoader';

function strategyReturning(raw) {
    return { readSheet: async () => raw };
}

describe('readSheetData', () => {
    it('normalises a legacy envelope with only blocks', async () => {
        const sheet = await readSheetData(strategyReturning({ blocks: [{ id: 'b1', name: 'a', code: '1' }] }), 'x');

        expect(sheet.blocks).toHaveLength(1);
        expect(sheet.blocks[0].id).toBe('b1');
        expect(sheet.vizes).toEqual({});
        expect(sheet.view).toEqual({ panX: 0, panY: 0, viewMode: 'canvas' });
        expect(sheet.notes).toEqual([]);
    });

    it('treats an array customVizes as empty', async () => {
        const sheet = await readSheetData(strategyReturning({ blocks: [], customVizes: [] }), 'x');

        expect(sheet.vizes).toEqual({});
    });

    it('keeps a stored view and notes', async () => {
        const raw = { blocks: [], customVizes: {}, view: { panX: 10, panY: 20 }, notes: [{ id: 'n1', text: 'hi' }] };
        const sheet = await readSheetData(strategyReturning(raw), 'x');

        expect(sheet.view.panX).toBe(10);
        expect(sheet.view.panY).toBe(20);
        expect(sheet.notes).toHaveLength(1);
        expect(sheet.notes[0].id).toBe('n1');
    });

    it('propagates a strategy rejection', async () => {
        const strategy = { readSheet: async () => { throw new Error('corrupt'); } };

        await expect(readSheetData(strategy, 'x')).rejects.toThrow('corrupt');
    });
});
