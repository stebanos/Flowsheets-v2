// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { evaluateInContext } from './evaluateInContext';

describe('evaluateInContext', () => {
    it('returns empty value for empty code string', () => {
        const result = evaluateInContext('', 'a', {}, () => null, null);
        expect(result).toEqual({ value: '', error: null, cache: null });
    });

    it('returns empty value for whitespace-only code', () => {
        const result = evaluateInContext('   \n\t  ', 'a', {}, () => null, null);
        expect(result).toEqual({ value: '', error: null, cache: null });
    });

    it('returns circular dependency error when a cycle is detected', () => {
        const depMap = { a: ['b'], b: ['a'] };
        const result = evaluateInContext('b + 1', 'a', depMap, () => null, null);
        expect(result.value).toBeNull();
        expect(result.cache).toBeNull();
        expect(result.error).toContain('Circular dependency');
        expect(result.error).toContain('a');
        expect(result.error).toContain('b');
    });

    it('circular dependency error includes the full cycle path with arrow separators', () => {
        const depMap = { a: ['b'], b: ['a'] };
        const result = evaluateInContext('b', 'a', depMap, () => null, null);
        // The source uses the unicode right arrow → (U+2192)
        expect(result.error).toBe('Circular dependency: a \u2192 b \u2192 a');
    });

    it('evaluates code successfully with no dependencies', () => {
        const result = evaluateInContext('2 + 2', 'a', {}, () => null, null);
        expect(result.value).toBe(4);
        expect(result.error).toBeNull();
        expect(result.cache).not.toBeNull();
    });

    it('calls getResult with the correct dep names', () => {
        const depMap = { a: ['b', 'c'] };
        const getResult = vi.fn(name => name === 'b' ? 10 : 5);
        evaluateInContext('b + c', 'a', depMap, getResult, null);
        // Array.map passes (value, index, array) — assert only the first arg of each call
        const calledNames = getResult.mock.calls.map(args => args[0]);
        expect(calledNames).toEqual(['b', 'c']);
        expect(getResult).toHaveBeenCalledTimes(2);
    });

    it('resolves dep values via getResult and uses them in evaluation', () => {
        const depMap = { a: ['x'] };
        const getResult = name => name === 'x' ? 7 : null;
        const result = evaluateInContext('x * 3', 'a', depMap, getResult, null);
        expect(result.value).toBe(21);
        expect(result.error).toBeNull();
    });

    it('propagates a runtime error from evaluateBlock in the error field', () => {
        const result = evaluateInContext('null.property', 'a', {}, () => null, null);
        expect(result.value).toBeNull();
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
    });

    it('propagates a syntax error from evaluateBlock in the error field', () => {
        const result = evaluateInContext('{{{', 'a', {}, () => null, null);
        expect(result.value).toBeNull();
        expect(typeof result.error).toBe('string');
    });

    it('returns cache object matching evaluateBlock result on success', () => {
        const result = evaluateInContext('1 + 1', 'a', {}, () => null, null);
        expect(result.cache).not.toBeNull();
        expect(result.cache.value).toBe(2);
        expect(result.cache.forCode).toBe('1 + 1');
    });

    it('passes lastCache through to evaluateBlock for reuse on repeated calls', () => {
        const depMap = { a: ['n'] };
        const getResult = () => 5;
        const first = evaluateInContext('n + 1', 'a', depMap, getResult, null);
        const second = evaluateInContext('n + 1', 'a', depMap, getResult, first.cache);
        // Same compiled function should be reused (cache hit)
        expect(second.cache.compiledFn).toBe(first.cache.compiledFn);
        expect(second.value).toBe(6);
    });

    it('does not call getResult when code is empty', () => {
        const getResult = vi.fn();
        evaluateInContext('', 'a', { a: ['b'] }, getResult, null);
        expect(getResult).not.toHaveBeenCalled();
    });

    it('does not call getResult when a cycle is detected', () => {
        const depMap = { a: ['a'] };
        const getResult = vi.fn();
        evaluateInContext('a + 1', 'a', depMap, getResult, null);
        expect(getResult).not.toHaveBeenCalled();
    });
});
