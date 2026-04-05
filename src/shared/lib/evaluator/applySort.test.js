import { describe, it, expect } from 'vitest';
import { applySort } from './applySort';

const noBlocks = new Set();
const noResult = () => undefined;

describe('applySort', () => {
    it('returns value unchanged when sortClause is null', () => {
        const result = applySort([3, 1, 2], null, noResult, noBlocks);
        expect(result).toEqual({ value: [3, 1, 2], error: null });
    });

    it('returns value unchanged when sortClause is empty string', () => {
        const result = applySort([3, 1, 2], '', noResult, noBlocks);
        expect(result).toEqual({ value: [3, 1, 2], error: null });
    });

    it('returns value unchanged when sortClause is whitespace', () => {
        const result = applySort([3, 1, 2], '   ', noResult, noBlocks);
        expect(result).toEqual({ value: [3, 1, 2], error: null });
    });

    it('returns value unchanged when value is not an array', () => {
        const result = applySort(42, 'item', noResult, noBlocks);
        expect(result).toEqual({ value: 42, error: null });
    });

    it('returns value unchanged when value is a string (non-array)', () => {
        const result = applySort('hello', 'item', noResult, noBlocks);
        expect(result).toEqual({ value: 'hello', error: null });
    });

    it('sorts numbers ascending by item', () => {
        const result = applySort([3, 1, 2], 'item', noResult, noBlocks);
        expect(result).toEqual({ value: [1, 2, 3], error: null });
    });

    it('sorts objects by a property', () => {
        const arr = [{ age: 30 }, { age: 25 }, { age: 35 }];
        const result = applySort(arr, 'item.age', noResult, noBlocks);
        expect(result).toEqual({ value: [{ age: 25 }, { age: 30 }, { age: 35 }], error: null });
    });

    it('sorts descending via key negation', () => {
        const result = applySort([1, 3, 2], '-item', noResult, noBlocks);
        expect(result).toEqual({ value: [3, 2, 1], error: null });
    });

    it('does not mutate the original array', () => {
        const arr = [3, 1, 2];
        applySort(arr, 'item', noResult, noBlocks);
        expect(arr).toEqual([3, 1, 2]);
    });

    it('injects other block values as deps', () => {
        const blockNames = new Set(['field']);
        const getResult = (n) => n === 'field' ? 'age' : undefined;
        const arr = [{ age: 30 }, { age: 25 }, { age: 35 }];
        const result = applySort(arr, 'item[field]', getResult, blockNames);
        expect(result).toEqual({ value: [{ age: 25 }, { age: 30 }, { age: 35 }], error: null });
    });

    it('treats per-item key errors as null (sorts to front)', () => {
        // null.age throws — null item should sort to front
        const arr = [{ age: 3 }, null, { age: 1 }];
        const result = applySort(arr, 'item.age', noResult, noBlocks);
        // null (erroring key) sorts to front, then { age: 1 }, { age: 3 }
        expect(result.value[0]).toBe(null);
        expect(result.value[1]).toEqual({ age: 1 });
        expect(result.value[2]).toEqual({ age: 3 });
        expect(result.error).toBe(null);
    });

    it('returns error on invalid sort expression syntax', () => {
        const result = applySort([1, 2, 3], '<<<', noResult, noBlocks);
        expect(result.value).toBe(null);
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
    });

    it('handles empty array', () => {
        const result = applySort([], 'item', noResult, noBlocks);
        expect(result).toEqual({ value: [], error: null });
    });

    it('does not treat item as a block dep even if a block named item exists', () => {
        const blockNames = new Set(['item']);
        const getResult = (n) => n === 'item' ? 999 : undefined;
        const result = applySort([3, 1, 2], 'item', getResult, blockNames);
        expect(result).toEqual({ value: [1, 2, 3], error: null });
    });

    it('is stable — preserves order of equal keys', () => {
        const arr = [{ name: 'Bo', age: 30 }, { name: 'Al', age: 30 }, { name: 'Cy', age: 30 }];
        const result = applySort(arr, 'item.age', noResult, noBlocks);
        expect(result.value.map(x => x.name)).toEqual(['Bo', 'Al', 'Cy']);
    });
});
