import { describe, expect, test } from 'vitest';
import { formatValue } from './format-value';

describe('formatValue', () => {
    test('undefined → "undefined"', () => {
        expect(formatValue(undefined)).toBe('undefined');
    });

    test('null → "null"', () => {
        expect(formatValue(null)).toBe('null');
    });

    test('string → the string itself, unquoted', () => {
        expect(formatValue('hello')).toBe('hello');
        expect(formatValue('')).toBe('');
    });

    test('numbers use String(), not JSON.stringify', () => {
        expect(formatValue(42)).toBe('42');
        expect(formatValue(1.5)).toBe('1.5');
        expect(formatValue(NaN)).toBe('NaN');
        expect(formatValue(Infinity)).toBe('Infinity');
        expect(formatValue(-Infinity)).toBe('-Infinity');
        expect(formatValue(-0)).toBe('0');
    });

    test('boolean → JSON form', () => {
        expect(formatValue(true)).toBe('true');
        expect(formatValue(false)).toBe('false');
    });

    test('array → JSON form', () => {
        expect(formatValue([1, 'a', null])).toBe('[1,"a",null]');
    });

    test('nested object → JSON form', () => {
        expect(formatValue({ a: { b: [1, 2] }, c: 'x' })).toBe('{"a":{"b":[1,2]},"c":"x"}');
    });

    test('BigInt falls back to String()', () => {
        expect(formatValue(10n)).toBe('10');
    });

    test('circular object falls back to String()', () => {
        const o = {};
        o.self = o;
        expect(formatValue(o)).toBe('[object Object]');
    });
});
