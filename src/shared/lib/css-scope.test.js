import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { escapeAttr, injectStyle, scopeCSS } from './css-scope';

describe('scopeCSS — single rule', () => {
    test('prefixes selector with scope attribute', () => {
        expect(scopeCSS('.foo { color: red; }', 'data-v-abc')).toBe('.foo[data-v-abc] { color: red; }');
    });

    test('empty CSS returns empty string', () => {
        expect(scopeCSS('', 'data-v-abc')).toBe('');
    });

    test('trims whitespace from the selector before prefixing', () => {
        expect(scopeCSS('  .foo  { color: red; }', 'data-v-abc')).toBe('.foo[data-v-abc] { color: red; }');
    });
});

describe('scopeCSS — multiple selectors', () => {
    test('comma-separated selectors are each prefixed', () => {
        const result = scopeCSS('h1, h2 { margin: 0; }', 'data-v-abc');
        expect(result).toBe('h1[data-v-abc], h2[data-v-abc] { margin: 0; }');
    });

    test('three comma-separated selectors are all prefixed', () => {
        const result = scopeCSS('.a, .b, .c { color: red; }', 'data-v-abc');
        expect(result).toContain('.a[data-v-abc]');
        expect(result).toContain('.b[data-v-abc]');
        expect(result).toContain('.c[data-v-abc]');
    });
});

describe('scopeCSS — multiple rules', () => {
    test('both rules are prefixed when two rules are present', () => {
        const result = scopeCSS('.a { color: red; } .b { color: blue; }', 'data-v-abc');
        expect(result).toContain('.a[data-v-abc]');
        expect(result).toContain('.b[data-v-abc]');
    });
});

describe('scopeCSS — at-rules', () => {
    test('@media block is passed through unchanged', () => {
        const css = '@media (max-width: 600px) { .foo { color: red; } }';
        expect(scopeCSS(css, 'data-v-abc')).toBe(css);
    });

    test('@keyframes block is passed through unchanged', () => {
        const css = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        expect(scopeCSS(css, 'data-v-abc')).toBe(css);
    });

    test('rule before an at-rule is prefixed', () => {
        const css = '.before { color: red; } @media print { .x { display: none; } }';
        const result = scopeCSS(css, 'data-v-abc');
        expect(result).toContain('.before[data-v-abc]');
        expect(result).toContain('@media print');
    });

    test('rule after an at-rule is prefixed', () => {
        const css = '@media print { .x { display: none; } } .after { color: blue; }';
        const result = scopeCSS(css, 'data-v-abc');
        expect(result).toContain('.after[data-v-abc]');
        expect(result).toContain('@media print');
    });

    test('rules on both sides of an at-rule are each prefixed', () => {
        const css = '.before { } @media print { .x { } } .after { }';
        const result = scopeCSS(css, 'data-v-abc');
        expect(result).toContain('.before[data-v-abc]');
        expect(result).toContain('.after[data-v-abc]');
    });

    test('nested at-rules with multiple brace depths are handled', () => {
        // @supports wrapping @media — two levels of at-rule nesting
        const css = '@supports (display: grid) { @media (min-width: 600px) { .foo { color: red; } } }';
        expect(scopeCSS(css, 'data-v-abc')).toBe(css);
    });
});

describe('scopeCSS — scope attribute format', () => {
    test('uses the exact scopeId wrapped in brackets', () => {
        const result = scopeCSS('.x { }', 'data-v-xyz123');
        expect(result).toContain('[data-v-xyz123]');
    });
});

describe('escapeAttr', () => {
    test('escapes a double quote', () => {
        expect(escapeAttr('foo"bar')).toBe('foo&quot;bar');
    });

    test('escapes multiple double quotes', () => {
        expect(escapeAttr('"a"b"')).toBe('&quot;a&quot;b&quot;');
    });

    test('leaves strings without double quotes unchanged', () => {
        expect(escapeAttr('my-viz')).toBe('my-viz');
    });

    test('empty string returns empty string', () => {
        expect(escapeAttr('')).toBe('');
    });
});

describe('injectStyle', () => {
    afterEach(() => {
        document.head.querySelectorAll('style[data-viz-scope], style[data-viz-name]').forEach(el => el.remove());
    });

    test('two calls with the same plain name produce only one style element', () => {
        injectStyle('MyViz', '.a { color: red; }', 'scope-abc');
        injectStyle('MyViz', '.a { color: blue; }', 'scope-abc');
        const els = document.head.querySelectorAll('style[data-viz-name]');
        expect(els.length).toBe(1);
    });

    test('two calls with a name containing a double-quote produce only one style element', () => {
        injectStyle('My"Viz', '.a { color: red; }', 'scope-abc');
        injectStyle('My"Viz', '.a { color: blue; }', 'scope-abc');
        const els = document.head.querySelectorAll('style[data-viz-name]');
        expect(els.length).toBe(1);
    });

    test('second call updates the textContent in place', () => {
        injectStyle('MyViz', '.a { color: red; }', 'scope-abc');
        injectStyle('MyViz', '.a { color: blue; }', 'scope-abc');
        const el = document.head.querySelector('style[data-viz-name]');
        expect(el.textContent).toContain('blue');
        expect(el.textContent).not.toContain('red');
    });

    test('two different names produce two separate style elements', () => {
        injectStyle('VizA', '.a {}', 'scope-aaa');
        injectStyle('VizB', '.b {}', 'scope-bbb');
        const els = document.head.querySelectorAll('style[data-viz-name]');
        expect(els.length).toBe(2);
    });
});
