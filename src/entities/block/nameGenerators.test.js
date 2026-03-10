import { describe, test, expect } from 'vitest';
import { isReservedOrGlobal, generateUniqueName, generateUniqueNameFromName } from './nameGenerators';

describe('isReservedOrGlobal', () => {

    test('empty string returns true', () => {
        expect(isReservedOrGlobal('')).toBe(true);
    });

    test('non-string returns true', () => {
        expect(isReservedOrGlobal(null)).toBe(true);
        expect(isReservedOrGlobal(undefined)).toBe(true);
        expect(isReservedOrGlobal(42)).toBe(true);
    });

    test('whitespace-only string returns true', () => {
        expect(isReservedOrGlobal('   ')).toBe(true);
    });

    test('JS reserved keywords return true', () => {
        expect(isReservedOrGlobal('if')).toBe(true);
        expect(isReservedOrGlobal('while')).toBe(true);
        expect(isReservedOrGlobal('return')).toBe(true);
        expect(isReservedOrGlobal('class')).toBe(true);
        expect(isReservedOrGlobal('null')).toBe(true);
        expect(isReservedOrGlobal('true')).toBe(true);
        expect(isReservedOrGlobal('false')).toBe(true);
    });

    test('globalThis properties return true', () => {
        expect(isReservedOrGlobal('Math')).toBe(true);
        expect(isReservedOrGlobal('Array')).toBe(true);
        expect(isReservedOrGlobal('Object')).toBe(true);
        expect(isReservedOrGlobal('console')).toBe(true);
    });

    test('normal user-defined names return false', () => {
        expect(isReservedOrGlobal('myVar')).toBe(false);
        expect(isReservedOrGlobal('result')).toBe(false);
        expect(isReservedOrGlobal('a')).toBe(false);
        expect(isReservedOrGlobal('total_price')).toBe(false);
    });

});

describe('generateUniqueName', () => {

    test('returns a for empty list', () => {
        expect(generateUniqueName([])).toBe('a');
    });

    test('skips taken names sequentially', () => {
        expect(generateUniqueName(['a'])).toBe('b');
        expect(generateUniqueName(['a', 'b'])).toBe('c');
        expect(generateUniqueName(['a', 'b', 'c'])).toBe('d');
    });

    test('skips non-sequential gaps and picks first free letter', () => {
        expect(generateUniqueName(['a', 'c'])).toBe('b');
    });

    test('skips a long initial run', () => {
        const taken = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
        expect(generateUniqueName(taken)).toBe('j');
    });

});

describe('generateUniqueNameFromName', () => {

    test('returns the name unchanged if it is free and valid', () => {
        expect(generateUniqueNameFromName('myVar', [])).toBe('myVar');
    });

    test('converts spaces to underscores', () => {
        expect(generateUniqueNameFromName('my var', [])).toBe('my_var');
    });

    test('multiple consecutive spaces become a single underscore', () => {
        // \s+ collapses any run of whitespace into one underscore
        expect(generateUniqueNameFromName('a  b', [])).toBe('a_b');
    });

    test('reserved word gets leading underscore', () => {
        expect(generateUniqueNameFromName('if', [])).toBe('_if');
        expect(generateUniqueNameFromName('return', [])).toBe('_return');
    });

    test('collision appends _1 then _2', () => {
        expect(generateUniqueNameFromName('foo', ['foo'])).toBe('foo_1');
        expect(generateUniqueNameFromName('foo', ['foo', 'foo_1'])).toBe('foo_2');
    });

    test('reserved word that is also taken: _if, then _if_1', () => {
        expect(generateUniqueNameFromName('if', ['_if'])).toBe('_if_1');
        expect(generateUniqueNameFromName('if', ['_if', '_if_1'])).toBe('_if_2');
    });

    test('space+reserved: space→underscore then reserved prefix', () => {
        // 'if else' → 'if_else' — not reserved, so no prefix needed
        expect(generateUniqueNameFromName('if else', [])).toBe('if_else');
    });

    test('name not in existingNames returned as-is', () => {
        expect(generateUniqueNameFromName('total', ['other'])).toBe('total');
    });

});
