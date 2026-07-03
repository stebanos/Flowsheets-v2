import { describe, expect, test } from 'vitest';
import { toCodeLiteral } from './toCodeLiteral';

// The produced string must be a valid JS expression when wrapped in `return (...)`,
// mirroring how the evaluator compiles block code (evaluate-fn.js).
function evalAsExpression(code) {
    return new Function(`'use strict'; return (${code})`)();
}

describe('toCodeLiteral', () => {
    test('serialises an array of objects and round-trips through eval', () => {
        const value = [{ name: 'Ada', age: 36 }, { name: 'Bob', age: null }];
        const code = toCodeLiteral(value);
        expect(evalAsExpression(code)).toEqual(value);
    });

    test('serialises a top-level object as a valid expression', () => {
        const value = { a: 1, b: [2, 3] };
        const code = toCodeLiteral(value);
        expect(evalAsExpression(code)).toEqual(value);
    });

    test('pretty-prints with two-space indentation', () => {
        expect(toCodeLiteral({ a: 1 })).toBe('{\n  "a": 1\n}');
    });

    test('a string value containing ${...} stays a plain double-quoted string', () => {
        const value = [{ msg: 'hello ${x}' }];
        const code = toCodeLiteral(value);
        expect(code).toContain('"hello ${x}"');
        expect(evalAsExpression(code)).toEqual(value);
    });
});
