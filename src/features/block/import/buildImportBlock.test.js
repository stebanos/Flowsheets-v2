import { describe, expect, test } from 'vitest';
import { buildImportBlock } from './buildImportBlock';

describe('buildImportBlock', () => {
    test('builds a block from CSV: name, coerced code, byteLength', () => {
        const result = buildImportBlock({
            filename: 'sales.csv',
            text: 'name,age\nAda,36',
            existingNames: []
        });
        expect(result.name).toBe('sales');
        expect(JSON.parse(result.code)).toEqual([{ name: 'Ada', age: 36 }]);
        expect(result.byteLength).toBe(new TextEncoder().encode(result.code).length);
        expect(result.error).toBeUndefined();
    });

    test('builds a block from a JSON array', () => {
        const result = buildImportBlock({
            filename: 'points.json',
            text: '[1, 2, 3]',
            existingNames: []
        });
        expect(result.name).toBe('points');
        expect(JSON.parse(result.code)).toEqual([1, 2, 3]);
    });

    test('builds a block from a JSON object', () => {
        const result = buildImportBlock({
            filename: 'config.json',
            text: '{"a":1}',
            existingNames: []
        });
        expect(JSON.parse(result.code)).toEqual({ a: 1 });
    });

    test('sanitises the filename to a valid identifier', () => {
        const result = buildImportBlock({
            filename: 'sales-2026.csv',
            text: 'x\n1',
            existingNames: []
        });
        expect(result.name).toBe('sales_2026');
    });

    test('uniquifies against existing block names', () => {
        const result = buildImportBlock({
            filename: 'sales.csv',
            text: 'x\n1',
            existingNames: ['sales']
        });
        expect(result.name).toBe('sales_1');
    });

    test('keeps a ${...} value as a plain string in the code', () => {
        const result = buildImportBlock({
            filename: 'msgs.csv',
            text: 'msg\nhello ${x}',
            existingNames: []
        });
        expect(result.code).toContain('"hello ${x}"');
        expect(JSON.parse(result.code)).toEqual([{ msg: 'hello ${x}' }]);
    });

    test('returns an error for malformed JSON', () => {
        const result = buildImportBlock({
            filename: 'bad.json',
            text: '{not json',
            existingNames: []
        });
        expect(result.error).toBeTruthy();
        expect(result.code).toBeUndefined();
    });

    test('returns an error for an empty file', () => {
        const result = buildImportBlock({ filename: 'empty.csv', text: '', existingNames: [] });
        expect(result.error).toBeTruthy();
    });

    test('returns an error for a header-only CSV', () => {
        const result = buildImportBlock({ filename: 'headers.csv', text: 'a,b,c', existingNames: [] });
        expect(result.error).toBeTruthy();
    });

    test('returns an error for an unsupported extension', () => {
        const result = buildImportBlock({ filename: 'data.txt', text: 'x\n1', existingNames: [] });
        expect(result.error).toBeTruthy();
    });
});
