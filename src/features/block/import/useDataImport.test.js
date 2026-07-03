import { ref } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useDataImport } from './useDataImport';

function fakeFile(name, text) {
    return { name, text: async () => text };
}

function makeImporter() {
    const createBlock = vi.fn();
    const cellWidth = ref(150);
    const unitY = ref(24);
    const api = useDataImport({ createBlock, cellWidth, unitY });
    return { ...api, createBlock, cellWidth, unitY };
}

function seedBlocks(names) {
    useBlockStore().replaceBlocks(names.map((name, i) => ({ id: `id-${i}`, name })));
}

describe('useDataImport', () => {
    beforeEach(() => {
        useBlockStore().replaceBlocks([]);
        makeImporter().cancelLargeImport();
    });

    test('creates a block from a CSV file at the given position', async () => {
        const { importDataFile, createBlock, cellWidth, unitY } = makeImporter();
        const result = await importDataFile(fakeFile('sales.csv', 'name,age\nAda,36'), { x: 40, y: 80 });

        expect(result.error).toBeUndefined();
        expect(createBlock).toHaveBeenCalledTimes(1);
        const [pos, name, code, cw, uy] = createBlock.mock.calls[0];
        expect(pos).toEqual({ x: 40, y: 80 });
        expect(name).toBe('sales');
        expect(JSON.parse(code)).toEqual([{ name: 'Ada', age: 36 }]);
        expect(cw).toBe(cellWidth);
        expect(uy).toBe(unitY);
    });

    test('uniquifies the block name against existing blocks', async () => {
        seedBlocks(['sales']);
        const { importDataFile, createBlock } = makeImporter();
        await importDataFile(fakeFile('sales.csv', 'x\n1'), { x: 0, y: 0 });

        expect(createBlock.mock.calls[0][1]).toBe('sales_1');
    });

    test('returns an error and creates no block for malformed JSON', async () => {
        const { importDataFile, createBlock } = makeImporter();
        const result = await importDataFile(fakeFile('bad.json', '{not json'), { x: 0, y: 0 });

        expect(result.error).toBeTruthy();
        expect(createBlock).not.toHaveBeenCalled();
    });

    test('defers a large file to confirmation instead of creating immediately', async () => {
        const { importDataFile, createBlock, pendingLargeImport } = makeImporter();
        const big = 'x\n' + 'a'.repeat(1_100_000);
        const result = await importDataFile(fakeFile('big.csv', big), { x: 10, y: 20 });

        expect(result.error).toBeUndefined();
        expect(createBlock).not.toHaveBeenCalled();
        expect(pendingLargeImport.value).toBeTruthy();
        expect(pendingLargeImport.value.name).toBe('big');
        expect(pendingLargeImport.value.pos).toEqual({ x: 10, y: 20 });
    });

    test('confirmLargeImport creates the deferred block and clears the pending state', async () => {
        const { importDataFile, confirmLargeImport, createBlock, pendingLargeImport } = makeImporter();
        await importDataFile(fakeFile('big.csv', 'x\n' + 'a'.repeat(1_100_000)), { x: 5, y: 6 });

        confirmLargeImport();

        expect(createBlock).toHaveBeenCalledTimes(1);
        expect(createBlock.mock.calls[0][0]).toEqual({ x: 5, y: 6 });
        expect(createBlock.mock.calls[0][1]).toBe('big');
        expect(pendingLargeImport.value).toBe(null);
    });

    test('cancelLargeImport discards the deferred block', async () => {
        const { importDataFile, cancelLargeImport, createBlock, pendingLargeImport } = makeImporter();
        await importDataFile(fakeFile('big.csv', 'x\n' + 'a'.repeat(1_100_000)), { x: 0, y: 0 });

        cancelLargeImport();

        expect(createBlock).not.toHaveBeenCalled();
        expect(pendingLargeImport.value).toBe(null);
    });
});
