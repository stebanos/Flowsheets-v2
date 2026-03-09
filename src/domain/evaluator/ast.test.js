import { describe, test, expect } from 'vitest';
import { extractFreeIdentifiers } from './ast.js';

// Helper: extract as sorted array for stable assertions
function free(code) {
    return [...extractFreeIdentifiers(code)].sort();
}

describe('extractFreeIdentifiers', () => {

    // -------------------------------------------------------------------------
    // Basic free identifiers
    // -------------------------------------------------------------------------

    describe('basic free identifiers', () => {
        test('single reference', () => {
            expect(free('a')).toEqual(['a']);
        });

        test('arithmetic with two references', () => {
            expect(free('a + b')).toEqual(['a', 'b']);
        });

        test('each identifier counted once (set semantics)', () => {
            expect(free('a + a + a')).toEqual(['a']);
        });

        test('empty string returns empty set', () => {
            expect(free('')).toEqual([]);
        });

        test('literal only — no identifiers', () => {
            expect(free('42')).toEqual([]);
            expect(free('"hello"')).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Declaration skipping
    // -------------------------------------------------------------------------

    describe('skips declared identifiers', () => {
        test('const declaration lhs', () => {
            expect(free('const x = 1')).toEqual([]);
        });

        test('let declaration lhs', () => {
            expect(free('let x = 1')).toEqual([]);
        });

        test('var declaration lhs', () => {
            expect(free('var x = 1')).toEqual([]);
        });

        test('function declaration name', () => {
            expect(free('function f() {}')).toEqual([]);
        });

        test('class declaration name', () => {
            expect(free('class C {}')).toEqual([]);
        });

        test('rhs of declaration is still free', () => {
            expect(free('const x = a + b')).toEqual(['a', 'b']);
        });
    });

    // -------------------------------------------------------------------------
    // Shadowing
    // -------------------------------------------------------------------------

    describe('shadowing by local declarations', () => {
        test('function param shadows use inside body', () => {
            expect(free('(function(x) { return x + 1; })()')).toEqual([]);
        });

        test('arrow function param shadows use inside body', () => {
            expect(free('(x => x * 2)()')).toEqual([]);
        });

        test('catch clause param is not free inside catch body', () => {
            expect(free('try {} catch(e) { e.message; }')).toEqual([]);
        });

        test('outer reference not shadowed by inner function param', () => {
            // `a` is free at outer scope; `x` is a param (not free)
            expect(free('a + (function(x) { return x; })()')).toEqual(['a']);
        });
    });

    // -------------------------------------------------------------------------
    // Member expressions
    // -------------------------------------------------------------------------

    describe('member expressions', () => {
        test('object of member expression is free', () => {
            expect(free('a.b')).toEqual(['a']);
        });

        test('non-computed property name is not free', () => {
            // `b` in `a.b` is not a free identifier
            const ids = free('a.b');
            expect(ids).not.toContain('b');
        });

        test('computed property is free', () => {
            // `a[b]` — both a and b are free
            expect(free('a[b]')).toEqual(['a', 'b']);
        });

        test('chained member expression', () => {
            expect(free('a.b.c')).toEqual(['a']);
        });
    });

    // -------------------------------------------------------------------------
    // Object literals
    // -------------------------------------------------------------------------

    describe('object literal keys', () => {
        test('shorthand property key is not free (key === value identifier)', () => {
            // `{ a }` — `a` is the shorthand; the key `a` should not be counted,
            // but the value `a` is a free reference. Behaviour: `a` appears once as free.
            expect(free('({ a })')).toEqual(['a']);
        });

        test('non-computed key is not treated as free identifier', () => {
            // `{ key: val }` — `key` is a literal property name, `val` is free
            expect(free('({ key: val })')).toEqual(['val']);
        });

        test('computed key is free', () => {
            expect(free('({ [key]: val })')).toEqual(['key', 'val']);
        });
    });

    // -------------------------------------------------------------------------
    // Import / export (sourceType: module)
    // -------------------------------------------------------------------------

    describe('import and export specifiers', () => {
        test('imported binding name is not free', () => {
            expect(free('import { foo } from "bar"')).toEqual([]);
        });

        test('export specifier is not free', () => {
            expect(free('const x = 1; export { x }')).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Parse errors
    // -------------------------------------------------------------------------

    describe('parse errors', () => {
        test('returns empty set on syntax error', () => {
            expect(free('if (')).toEqual([]);
            expect(free('???')).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Known limitations (documented in source)
    // -------------------------------------------------------------------------

    describe('known limitations', () => {
        test('sibling const declaration does NOT shadow later use (ancestor-only check)', () => {
            // `const a = 1; a + 1` — the second `a` is a sibling in the statement list,
            // not a descendant of the VariableDeclarator, so the ancestor walk misses it.
            // In Flowsheets blocks this is rarely an issue (blocks are usually single expressions).
            expect(free('const a = 1; a + 1')).toEqual(['a']);
        });

        test('destructured function param is NOT shadowed (not yet handled)', () => {
            // `({ x }) => x` — x is destructured from param, ideally not free,
            // but the current implementation does not handle ObjectPattern/ArrayPattern.
            // This test documents the current behaviour, not the ideal behaviour.
            const ids = free('(({ x }) => x)()');
            expect(ids).toContain('x');
        });
    });

});
