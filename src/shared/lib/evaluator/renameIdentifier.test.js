// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { renameIdentifier } from './renameIdentifier';

describe('basic rename', () => {
    test('renames identifier', () => {
        expect(renameIdentifier('a + b', 'a', 'x')).toBe('x + b');
    });

    test('whole-word only — prefix not renamed', () => {
        expect(renameIdentifier('abc + a', 'a', 'x')).toBe('abc + x');
    });

    test('multiple occurrences', () => {
        expect(renameIdentifier('a + a + a', 'a', 'x')).toBe('x + x + x');
    });

    test('old name not present — no change', () => {
        expect(renameIdentifier('b + c', 'a', 'x')).toBe('b + c');
    });
});

describe('strings', () => {
    test('skip inside single-quoted string', () => {
        expect(renameIdentifier("'a' + a", 'a', 'x')).toBe("'a' + x");
    });

    test('skip inside double-quoted string', () => {
        expect(renameIdentifier('"a" + a', 'a', 'x')).toBe('"a" + x');
    });

    test('skip inside template literal raw section', () => {
        expect(renameIdentifier('`a` + a', 'a', 'x')).toBe('`a` + x');
    });

    test('rename inside template ${} expression', () => {
        expect(renameIdentifier('`${a}`', 'a', 'x')).toBe('`${x}`');
    });

    test('skip string inside template ${} expression', () => {
        expect(renameIdentifier("`${'a'}` + a", 'a', 'x')).toBe("`${'a'}` + x");
    });
});

describe('comments', () => {
    test('skip inside line comment', () => {
        expect(renameIdentifier('// a\na', 'a', 'x')).toBe('// a\nx');
    });

    test('skip inside block comment', () => {
        expect(renameIdentifier('/* a */ a', 'a', 'x')).toBe('/* a */ x');
    });
});

describe('edge cases', () => {
    test('null returns null', () => {
        expect(renameIdentifier(null, 'a', 'x')).toBe(null);
    });

    test('empty string returns empty string', () => {
        expect(renameIdentifier('', 'a', 'x')).toBe('');
    });

    test('non-string returns as-is', () => {
        expect(renameIdentifier(42, 'a', 'x')).toBe(42);
    });
});
