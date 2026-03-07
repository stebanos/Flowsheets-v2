import { describe, test, expect } from 'vitest';
import { compileFn, callFn, evaluateBlock, BLOCKED_GLOBALS } from '../evaluate-fn.js';

// ---------------------------------------------------------------------------
// compileFn
// ---------------------------------------------------------------------------

describe('compileFn', () => {
    test('compiles a simple expression', () => {
        const fn = compileFn('1 + 1', [], true);
        expect(typeof fn).toBe('function');
    });

    test('throws SyntaxError for invalid code', () => {
        expect(() => compileFn('{{', [], true)).toThrow(SyntaxError);
    });

    test('compiled expression receives dep values as parameters', () => {
        const fn = compileFn('a + b', ['a', 'b'], true);
        expect(fn(3, 4)).toBe(7);
    });

    test('compiled statement can use return', () => {
        const fn = compileFn('const x = 10; return x * 2;', [], false);
        expect(fn()).toBe(20);
    });

    test('strict mode: assigning to undeclared variable throws ReferenceError', () => {
        const fn = compileFn('undeclaredVar = 42; return undeclaredVar;', [], false);
        expect(() => fn()).toThrow(ReferenceError);
    });
});

// ---------------------------------------------------------------------------
// callFn
// ---------------------------------------------------------------------------

describe('callFn', () => {
    test('returns value and null error on success', () => {
        const fn = compileFn('a * 2', ['a'], true);
        const result = callFn(fn, ['a'], [5]);
        expect(result.value).toBe(10);
        expect(result.error).toBeNull();
    });

    test('returns null value and error message on runtime error', () => {
        const fn = compileFn('a.foo()', ['a'], true);
        const result = callFn(fn, ['a'], [null]);
        expect(result.value).toBeNull();
        expect(typeof result.error).toBe('string');
    });

    test('blocked globals are shadowed with undefined', () => {
        BLOCKED_GLOBALS.forEach(name => {
            const fn = compileFn(`typeof ${name}`, [], true);
            const result = callFn(fn, [], []);
            expect(result.value).toBe('undefined');
        });
    });

    test('user dep with same name as blocked global takes precedence', () => {
        const fn = compileFn('typeof fetch', ['fetch'], true);
        const result = callFn(fn, ['fetch'], [() => {}]);
        expect(result.value).toBe('function');
    });
});

// ---------------------------------------------------------------------------
// evaluateBlock
// ---------------------------------------------------------------------------

describe('evaluateBlock', () => {
    test('evaluates a simple expression', () => {
        const result = evaluateBlock('1 + 1', [], []);
        expect(result.value).toBe(2);
        expect(result.error).toBeNull();
    });

    test('evaluates expression with dep injection', () => {
        const result = evaluateBlock('a + b', ['a', 'b'], [3, 7]);
        expect(result.value).toBe(10);
        expect(result.error).toBeNull();
    });

    test('falls back to statement mode for code with return', () => {
        const result = evaluateBlock('const x = 5; return x * 3;', [], []);
        expect(result.value).toBe(15);
        expect(result.error).toBeNull();
        expect(result.isExpression).toBe(false);
    });

    test('expression mode is used when code is a valid expression', () => {
        const result = evaluateBlock('42', [], []);
        expect(result.isExpression).toBe(true);
    });

    test('returns error for code that fails at runtime', () => {
        const result = evaluateBlock('null.foo', [], []);
        expect(result.value).toBeNull();
        expect(typeof result.error).toBe('string');
    });

    test('returns error for code with syntax errors', () => {
        const result = evaluateBlock('{{{}', [], []);
        expect(result.value).toBeNull();
        expect(typeof result.error).toBe('string');
    });

    test('returns compiled function and metadata', () => {
        const result = evaluateBlock('1', [], []);
        expect(typeof result.compiledFn).toBe('function');
        expect(result.forCode).toBe('1');
        expect(result.forDeps).toBe('');
    });

    test('cache hit: reuses compiledFn when code and deps unchanged', () => {
        const first = evaluateBlock('a + 1', ['a'], [2]);
        const second = evaluateBlock('a + 1', ['a'], [5], first);
        expect(second.compiledFn).toBe(first.compiledFn);
        expect(second.value).toBe(6);
    });

    test('cache miss: recompiles when code changes', () => {
        const first = evaluateBlock('a + 1', ['a'], [2]);
        const second = evaluateBlock('a + 2', ['a'], [2], first);
        expect(second.compiledFn).not.toBe(first.compiledFn);
        expect(second.value).toBe(4);
    });

    test('cache miss: recompiles when depNames change', () => {
        const first = evaluateBlock('a + 1', ['a'], [2]);
        const second = evaluateBlock('a + 1', ['a', 'b'], [2, 0], first);
        expect(second.compiledFn).not.toBe(first.compiledFn);
    });

    test('dep name shadows blocked global', () => {
        const result = evaluateBlock('typeof fetch', ['fetch'], [() => {}]);
        expect(result.value).toBe('function');
    });
});
