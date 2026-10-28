// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { extractFreeIdentifiers } from './ast';

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
        test('top-level return parses (block code is a function body)', () => {
            expect(free('const x = a; return x + b')).toEqual(['a', 'b']);
        });

        test('returns empty set on syntax error', () => {
            expect(free('if (')).toEqual([]);
            expect(free('???')).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Scope analysis — bindings are resolved against the real lexical scope
    // -------------------------------------------------------------------------

    describe('scope analysis', () => {
        test('sibling const declaration binds later uses in the same scope', () => {
            expect(free('const a = 1; a + 1')).toEqual([]);
        });

        test('let declared then assigned is not free', () => {
            expect(free('let a; a = 2; a')).toEqual([]);
        });

        test('use before let declaration is still the local binding', () => {
            expect(free('a; let a = 1')).toEqual([]);
        });

        test('var is hoisted to the enclosing function scope', () => {
            expect(free('a; var a = 1')).toEqual([]);
            expect(free('{ var v = 1 } v')).toEqual([]);
            expect(free('if (c) { var w = 1 } w')).toEqual(['c']);
        });

        test('function declarations are hoisted', () => {
            expect(free('function f() { return a; } function a() {}')).toEqual([]);
        });

        test('let in a nested block is not visible outside it', () => {
            expect(free('if (x) { let a = 1; } a')).toEqual(['a', 'x']);
        });

        test('nested functions see outer bindings', () => {
            expect(free('const a = 1; (() => a)()')).toEqual([]);
            expect(free('function f(p) { return q; }')).toEqual(['q']);
        });

        test('for loop heads bind their own scope', () => {
            expect(free('for (let i = 0; i < n; i++) { i }')).toEqual(['n']);
            expect(free('for (const k of list) k')).toEqual(['list']);
            expect(free('for (const k in obj) k')).toEqual(['obj']);
            expect(free('for (var j = 0; j < 1; j++) {} j')).toEqual([]);
        });

        test('destructuring declarations bind names; defaults and sources stay free', () => {
            expect(free('const { x, y: z = w } = obj; x + z')).toEqual(['obj', 'w']);
            expect(free('const [p, , ...rest] = arr; p + rest')).toEqual(['arr']);
            expect(free('const { [key]: val } = obj; val')).toEqual(['key', 'obj']);
        });

        test('destructured and defaulted function params are bound', () => {
            expect(free('(({ x }, [y, ...rest]) => x + y + rest)()')).toEqual([]);
            expect(free('((a = b) => a)()')).toEqual(['b']);
        });

        test('function and class expressions bind their own name inside', () => {
            expect(free('(function g() { return g; })()')).toEqual([]);
            expect(free('(class D { m() { return D; } })')).toEqual([]);
            expect(free('class C { m() { return C; } } new C()')).toEqual([]);
        });

        test('class members: computed keys and values are free, plain keys are not', () => {
            expect(free('class K { [kk] = vv; static { st } #p = pv; m() { return mm; } }')).toEqual(['kk', 'mm', 'pv', 'st', 'vv']);
        });

        test('catch clause patterns are bound', () => {
            expect(free('try { f() } catch ({ message }) { message }')).toEqual(['f']);
        });

        test('switch cases share one block scope', () => {
            expect(free('switch (v) { case 1: let q = 2; q; default: q }')).toEqual(['v']);
        });

        test('assignment targets are references, not bindings', () => {
            expect(free('a.b = c')).toEqual(['a', 'c']);
            expect(free('[p, q] = arr')).toEqual(['arr', 'p', 'q']);
            expect(free('({ k: m } = src)')).toEqual(['m', 'src']);
        });

        test('labels and meta properties are not identifiers', () => {
            expect(free('lbl: for (;;) { break lbl; }')).toEqual([]);
            expect(free('(function () { return new.target; })()')).toEqual([]);
            expect(free('import.meta.url')).toEqual([]);
        });

        test('object literal methods and computed keys', () => {
            expect(free('obj = { [k]: v, m() { return s; }, get g() { return t; } }')).toEqual(['k', 'obj', 's', 't', 'v']);
        });

        test('export default function body resolves normally', () => {
            expect(free('export default function () { return a; }')).toEqual(['a']);
        });

        test('template literal expressions are free', () => {
            expect(free('`${a} and ${b.c}`')).toEqual(['a', 'b']);
        });
    });

});
