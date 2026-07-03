import { describe, expect, test } from 'vitest';
import { coerceCell, csvToRecords, parseCsv } from './parseCsv';

describe('parseCsv', () => {
    test('parses simple comma-separated rows', () => {
        const { rows, delimiter } = parseCsv('a,b,c\n1,2,3');
        expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
        expect(delimiter).toBe(',');
    });

    test('handles \\r\\n line endings', () => {
        const { rows } = parseCsv('a,b\r\n1,2\r\n3,4');
        expect(rows).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
    });

    test('ignores a single trailing newline', () => {
        const { rows } = parseCsv('a,b\n1,2\n');
        expect(rows).toEqual([['a', 'b'], ['1', '2']]);
    });

    test('keeps quoted fields containing the delimiter as one cell', () => {
        const { rows } = parseCsv('name,note\n"Smith, John",hi');
        expect(rows).toEqual([['name', 'note'], ['Smith, John', 'hi']]);
    });

    test('keeps newlines inside quoted fields', () => {
        const { rows } = parseCsv('a,b\n"line1\nline2",x');
        expect(rows).toEqual([['a', 'b'], ['line1\nline2', 'x']]);
    });

    test('unescapes doubled quotes inside quoted fields', () => {
        const { rows } = parseCsv('a\n"she said ""hi"""');
        expect(rows).toEqual([['a'], ['she said "hi"']]);
    });

    test('keeps a cell containing ${...} verbatim', () => {
        const { rows } = parseCsv('a\nhello ${x}');
        expect(rows).toEqual([['a'], ['hello ${x}']]);
    });

    test('auto-detects semicolon delimiter', () => {
        const { rows, delimiter } = parseCsv('a;b;c\n1;2;3');
        expect(delimiter).toBe(';');
        expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    test('auto-detects tab delimiter', () => {
        const { rows, delimiter } = parseCsv('a\tb\n1\t2');
        expect(delimiter).toBe('\t');
        expect(rows).toEqual([['a', 'b'], ['1', '2']]);
    });

    test('prefers comma on a tie', () => {
        const { delimiter } = parseCsv('a,b;c\n1,2;3');
        expect(delimiter).toBe(',');
    });

    test('honours an explicit delimiter override', () => {
        const { rows, delimiter } = parseCsv('a|b\n1|2', { delimiter: '|' });
        expect(delimiter).toBe('|');
        expect(rows).toEqual([['a', 'b'], ['1', '2']]);
    });

    test('strips a UTF-8 BOM from the first field', () => {
        const { rows } = parseCsv('﻿a,b\n1,2');
        expect(rows[0]).toEqual(['a', 'b']);
    });

    test('handles a single column', () => {
        const { rows } = parseCsv('a\n1\n2');
        expect(rows).toEqual([['a'], ['1'], ['2']]);
    });

    test('preserves empty fields', () => {
        const { rows } = parseCsv('a,b,c\n1,,3');
        expect(rows).toEqual([['a', 'b', 'c'], ['1', '', '3']]);
    });
});

describe('coerceCell', () => {
    test('empty string becomes null', () => {
        expect(coerceCell('')).toBe(null);
    });

    test('finite numbers become numbers', () => {
        expect(coerceCell('42')).toBe(42);
        expect(coerceCell('3.14')).toBe(3.14);
        expect(coerceCell('-7')).toBe(-7);
    });

    test('booleans are case-insensitive', () => {
        expect(coerceCell('true')).toBe(true);
        expect(coerceCell('FALSE')).toBe(false);
        expect(coerceCell('True')).toBe(true);
    });

    test('non-numeric, non-boolean stays a string', () => {
        expect(coerceCell('hello')).toBe('hello');
        expect(coerceCell('1abc')).toBe('1abc');
    });

    test('keeps a ${...} string verbatim', () => {
        expect(coerceCell('hello ${x}')).toBe('hello ${x}');
    });

    test('whitespace-only stays a string (not coerced to 0)', () => {
        expect(coerceCell('   ')).toBe('   ');
    });
});

describe('csvToRecords', () => {
    test('maps rows to objects keyed by header with coercion', () => {
        const records = csvToRecords('name,age,active\nAda,36,true\nBob,,false');
        expect(records).toEqual([
            { name: 'Ada', age: 36, active: true },
            { name: 'Bob', age: null, active: false }
        ]);
    });

    test('gives empty/duplicate headers positional fallback names', () => {
        const records = csvToRecords('a,,a\n1,2,3');
        expect(records).toEqual([{ a: 1, col_2: 2, a_3: 3 }]);
    });

    test('returns an empty array for header-only input', () => {
        expect(csvToRecords('a,b,c')).toEqual([]);
    });
});
