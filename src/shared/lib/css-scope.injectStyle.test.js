import { describe, test, expect, beforeEach } from 'vitest';
import { injectStyle } from './css-scope';

beforeEach(() => {
    document.head.querySelectorAll('style[data-viz-name]').forEach(el => el.remove());
});

describe('injectStyle — element creation', () => {
    test('injects a style element into document.head', () => {
        injectStyle('MyViz', '.foo { color: red; }', 'data-v-abc');
        const el = document.head.querySelector('style[data-viz-name="MyViz"]');
        expect(el).not.toBeNull();
    });

    test('sets the data-viz-name attribute to the viz name', () => {
        injectStyle('MyViz', '.foo { color: red; }', 'data-v-abc');
        const el = document.head.querySelector('style[data-viz-name="MyViz"]');
        expect(el.getAttribute('data-viz-name')).toBe('MyViz');
    });

    test('sets textContent to the scoped CSS', () => {
        injectStyle('MyViz', '.foo { color: red; }', 'data-v-abc');
        const el = document.head.querySelector('style[data-viz-name="MyViz"]');
        expect(el.textContent).toBe('.foo[data-v-abc] { color: red; }');
    });
});

describe('injectStyle — element reuse', () => {
    test('reuses the existing style element on a second call with the same name', () => {
        injectStyle('MyViz', '.foo { color: red; }', 'data-v-abc');
        injectStyle('MyViz', '.bar { color: blue; }', 'data-v-abc');

        const els = document.head.querySelectorAll('style[data-viz-name="MyViz"]');
        expect(els.length).toBe(1);
    });

    test('updates textContent when called again with the same name', () => {
        injectStyle('MyViz', '.foo { color: red; }', 'data-v-abc');
        injectStyle('MyViz', '.bar { color: blue; }', 'data-v-abc');

        const el = document.head.querySelector('style[data-viz-name="MyViz"]');
        expect(el.textContent).toBe('.bar[data-v-abc] { color: blue; }');
    });

    test('creates separate elements for different viz names', () => {
        injectStyle('VizA', '.a { }', 'data-v-1');
        injectStyle('VizB', '.b { }', 'data-v-2');

        expect(document.head.querySelector('style[data-viz-name="VizA"]')).not.toBeNull();
        expect(document.head.querySelector('style[data-viz-name="VizB"]')).not.toBeNull();
    });
});

describe('injectStyle — name escaping', () => {
    // Known limitation: escapeAttr converts " to &quot; for HTML embedding, but CSS attribute
    // selectors don't decode HTML entities. A viz name containing a double quote causes a new
    // style element to be created on each call instead of reusing the existing one.
    test('KNOWN BUG: double quote in viz name causes duplicate style element', () => {
        injectStyle('My"Viz', '.x { }', 'data-v-abc');
        injectStyle('My"Viz', '.y { }', 'data-v-abc');

        const els = document.head.querySelectorAll('style[data-viz-name]');
        const match = [...els].filter(el => el.getAttribute('data-viz-name') === 'My"Viz');
        expect(match.length).toBe(2);
    });
});
