// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { renameIdentifier, renameIdentifiers } from './renameIdentifier';

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

describe('syntax awareness', () => {
    test('non-computed member property is not renamed', () => {
        expect(renameIdentifier('obj.a + a', 'a', 'x')).toBe('obj.a + x');
    });

    test('object literal key is not renamed', () => {
        expect(renameIdentifier('({ a: 1 }).a + a', 'a', 'x')).toBe('({ a: 1 }).a + x');
    });

    test('shorthand property is expanded so the key survives', () => {
        expect(renameIdentifier('f({ a, b })', 'a', 'x')).toBe('f({ a: x, b })');
    });

    test('identifiers containing $ are matched exactly', () => {
        expect(renameIdentifier('$a + 1', '$a', 'b')).toBe('b + 1');
        expect(renameIdentifier('a$ + a', 'a', 'x')).toBe('a$ + x');
        expect(renameIdentifier('$a + a', 'a', 'x')).toBe('$a + x');
    });

    test('regex literal body is not renamed', () => {
        expect(renameIdentifier('/a/.test(a)', 'a', 'x')).toBe('/a/.test(x)');
    });

    test('labels are not renamed', () => {
        expect(renameIdentifier('a: for (;;) { break a; }', 'a', 'x')).toBe('a: for (;;) { break a; }');
    });
});

describe('scope awareness', () => {
    test('local declaration shadowing the name is left alone', () => {
        expect(renameIdentifier('const a = 1; a + 2', 'a', 'x')).toBe('const a = 1; a + 2');
    });

    test('parameter shadowing inside a function, free use outside', () => {
        expect(renameIdentifier('(a => a + 1)(a)', 'a', 'x')).toBe('(a => a + 1)(x)');
    });

    test('nested function referencing the outer free name', () => {
        expect(renameIdentifier('[1, 2].map(n => n * a)', 'a', 'x')).toBe('[1, 2].map(n => n * x)');
    });
});

describe('string mode (template body)', () => {
    test('prose is untouched, interpolations are renamed', () => {
        expect(renameIdentifier('Hello a, value ${a} and a', 'a', 'x')).toBe('Hello a, value ${x} and a');
    });

    test('an apostrophe in prose does not hide later interpolations', () => {
        expect(renameIdentifier("it's ${a}", 'a', 'x')).toBe("it's ${x}");
    });

    test('backticks in prose survive the round trip', () => {
        expect(renameIdentifier('say `hi` ${a} \\` ${a}', 'a', 'x')).toBe('say `hi` ${x} \\` ${x}');
    });

    test('member access inside an interpolation keeps its property', () => {
        expect(renameIdentifier('${a.a} ${o.a}', 'a', 'x')).toBe('${x.a} ${o.a}');
    });
});

describe('unparseable code', () => {
    test('falls back to a word-boundary rename', () => {
        expect(renameIdentifier('a + ', 'a', 'x')).toBe('x + ');
        expect(renameIdentifier('a$ + (', 'a', 'x')).toBe('a$ + (');
        expect(renameIdentifier('$a + (', '$a', 'b')).toBe('b + (');
    });
});

describe('renameIdentifiers (simultaneous)', () => {
    test('applies every mapping in one pass — chained names do not cascade', () => {
        expect(renameIdentifiers('a + a2', { a: 'a2', a2: 'a3' })).toBe('a2 + a3');
    });

    test('swaps two names', () => {
        expect(renameIdentifiers('a + b', { a: 'b', b: 'a' })).toBe('b + a');
    });

    test('respects scope, strings and comments for each name', () => {
        const code = 'const b = 1; // a\n"a" + a + b';
        expect(renameIdentifiers(code, { a: 'x', b: 'y' })).toBe('const b = 1; // a\n"a" + x + b');
    });

    test('handles $ names and shorthand properties', () => {
        expect(renameIdentifiers('({ a, $b })', { a: 'x', $b: 'y' })).toBe('({ a: x, $b: y })');
    });

    test('string mode remaps interpolations only', () => {
        expect(renameIdentifiers('a is ${a + a2}', { a: 'a2', a2: 'a3' })).toBe('a is ${a2 + a3}');
    });

    test('unparseable code falls back to a simultaneous scan', () => {
        expect(renameIdentifiers('a + a2 +', { a: 'a2', a2: 'a3' })).toBe('a2 + a3 +');
    });

    test('empty map returns code unchanged', () => {
        expect(renameIdentifiers('a + b', {})).toBe('a + b');
    });
});
