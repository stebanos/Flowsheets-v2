import { describe, test, expect, beforeAll } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import VizDefault from './VizDefault.vue';

// ResizeObserver is a browser API unavailable in the node test environment.
// Provide a no-op stub so VizDefault's watcher can mount without throwing.
beforeAll(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
});

describe('VizDefault — single root element', () => {
    test('root element is always a single div, not a fragment', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: 42 } });
        expect(wrapper.element.tagName).toBe('DIV');
    });

    test('root is a single div even in list mode', () => {
        const wrapper = shallowMount(VizDefault, {
            props: { isList: true, outputItems: ['a', 'b', 'c'] }
        });
        expect(wrapper.element.tagName).toBe('DIV');
    });
});

describe('VizDefault — scalar value rendering', () => {
    test('renders number value as text', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: 42 } });
        expect(wrapper.text()).toContain('42');
    });

    test('renders null as the string "null"', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: null } });
        expect(wrapper.text()).toContain('null');
    });

    test('renders undefined as the string "undefined"', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: undefined } });
        expect(wrapper.text()).toContain('undefined');
    });

    test('renders a plain string value', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: 'hello world' } });
        expect(wrapper.text()).toContain('hello world');
    });

    test('renders object via JSON.stringify', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: { x: 1 } } });
        expect(wrapper.text()).toContain('{"x":1}');
    });
});

describe('VizDefault — error rendering', () => {
    test('renders error text when error prop is set', () => {
        const wrapper = shallowMount(VizDefault, { props: { error: 'some error' } });
        expect(wrapper.text()).toContain('some error');
    });

    test('error span has text-red-600 class', () => {
        const wrapper = shallowMount(VizDefault, { props: { error: 'some error' } });
        expect(wrapper.find('span.text-red-600').exists()).toBe(true);
    });

    test('value is not shown when error is set', () => {
        const wrapper = shallowMount(VizDefault, { props: { value: 99, error: 'oops' } });
        expect(wrapper.text()).toContain('oops');
        expect(wrapper.text()).not.toContain('99');
    });
});

describe('VizDefault — list mode', () => {
    test('renders one div per output item', () => {
        const wrapper = shallowMount(VizDefault, {
            props: { isList: true, outputItems: ['a', 'b', 'c'] }
        });
        const items = wrapper.findAll('.font-mono');
        expect(items).toHaveLength(3);
    });

    test('renders the text of each item', () => {
        const wrapper = shallowMount(VizDefault, {
            props: { isList: true, outputItems: ['alpha', 'beta'] }
        });
        expect(wrapper.text()).toContain('alpha');
        expect(wrapper.text()).toContain('beta');
    });

    test('renders an empty list without errors', () => {
        const wrapper = shallowMount(VizDefault, {
            props: { isList: true, outputItems: [] }
        });
        expect(wrapper.element.tagName).toBe('DIV');
        expect(wrapper.findAll('.font-mono')).toHaveLength(0);
    });
});
