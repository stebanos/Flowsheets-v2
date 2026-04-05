import { describe, it, expect } from 'vitest';
import { applyFilter } from './applyFilter';

const noBlocks = new Set();
const noResult = () => undefined;

describe('applyFilter', () => {
    it('returns value unchanged when filterClause is null', () => {
        const result = applyFilter([1, 2, 3], null, noResult, noBlocks);
        expect(result).toEqual({ value: [1, 2, 3], error: null });
    });

    it('returns value unchanged when filterClause is empty string', () => {
        const result = applyFilter([1, 2, 3], '', noResult, noBlocks);
        expect(result).toEqual({ value: [1, 2, 3], error: null });
    });

    it('returns value unchanged when filterClause is whitespace', () => {
        const result = applyFilter([1, 2, 3], '   ', noResult, noBlocks);
        expect(result).toEqual({ value: [1, 2, 3], error: null });
    });

    it('returns value unchanged when value is not an array', () => {
        const result = applyFilter(42, 'item > 0', noResult, noBlocks);
        expect(result).toEqual({ value: 42, error: null });
    });

    it('returns value unchanged when value is a string (non-array)', () => {
        const result = applyFilter('hello', 'item > 0', noResult, noBlocks);
        expect(result).toEqual({ value: 'hello', error: null });
    });

    it('filters an array by a simple expression', () => {
        const result = applyFilter([85, 42, 91, 60], 'item >= 70', noResult, noBlocks);
        expect(result).toEqual({ value: [85, 91], error: null });
    });

    it('returns empty array when no items pass', () => {
        const result = applyFilter([1, 2, 3], 'item > 100', noResult, noBlocks);
        expect(result).toEqual({ value: [], error: null });
    });

    it('returns all items when all pass', () => {
        const result = applyFilter([10, 20, 30], 'item > 0', noResult, noBlocks);
        expect(result).toEqual({ value: [10, 20, 30], error: null });
    });

    it('injects other block values as deps', () => {
        const blockNames = new Set(['threshold']);
        const getResult = (n) => n === 'threshold' ? 70 : undefined;
        const result = applyFilter([85, 42, 91, 60], 'item > threshold', getResult, blockNames);
        expect(result).toEqual({ value: [85, 91], error: null });
    });

    it('excludes item on per-item error (treats as falsy)', () => {
        // item.foo will throw for number items — they should be excluded
        const result = applyFilter([{ foo: 1 }, 42, { foo: 3 }], 'item.foo > 0', noResult, noBlocks);
        expect(result).toEqual({ value: [{ foo: 1 }, { foo: 3 }], error: null });
    });

    it('returns error on invalid filter expression syntax', () => {
        const result = applyFilter([1, 2, 3], '<<<', noResult, noBlocks);
        expect(result.value).toBe(null);
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
    });

    it('handles null value in array (no crash)', () => {
        const result = applyFilter([null, 1, null, 2], 'item !== null', noResult, noBlocks);
        expect(result).toEqual({ value: [1, 2], error: null });
    });

    it('does not treat item as a block dep even if a block named item exists', () => {
        // 'item' in filter clause is always the bound variable, not injected from blocks
        const blockNames = new Set(['item']);
        const getResult = (n) => n === 'item' ? 999 : undefined;
        // item > 5 should use the array element, not the block named 'item'
        const result = applyFilter([3, 7, 10], 'item > 5', getResult, blockNames);
        expect(result).toEqual({ value: [7, 10], error: null });
    });
});