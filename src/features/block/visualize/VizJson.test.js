import { describe, test, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import VizJson from './VizJson.vue';

describe('VizJson — number', () => {
    test('shows error for number value', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 2 } });
        expect(wrapper.text()).toContain('JSON viz requires an object or array');
        expect(wrapper.text()).toContain('number');
    });
});

describe('VizJson — array', () => {
    test('renders array as pretty-printed JSON', () => {
        const wrapper = shallowMount(VizJson, { props: { value: [1, 2] } });
        expect(wrapper.text()).toContain('[\n  1,\n  2\n]');
    });
});

describe('VizJson — object', () => {
    test('renders object as pretty-printed JSON', () => {
        const wrapper = shallowMount(VizJson, { props: { value: { a: 1 } } });
        expect(wrapper.text()).toContain('{\n  "a": 1\n}');
    });
});

describe('VizJson — null', () => {
    test('renders null as the string "null"', () => {
        const wrapper = shallowMount(VizJson, { props: { value: null } });
        expect(wrapper.text()).toContain('null');
    });
});

describe('VizJson — string value', () => {
    test('shows error for string value', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 'hello' } });
        expect(wrapper.text()).toContain('JSON viz requires an object or array');
        expect(wrapper.text()).toContain('string');
    });
});

describe('VizJson — boolean value', () => {
    test('shows error for boolean value', () => {
        const wrapper = shallowMount(VizJson, { props: { value: true } });
        expect(wrapper.text()).toContain('JSON viz requires an object or array');
        expect(wrapper.text()).toContain('boolean');
    });
});

describe('VizJson — error prop', () => {
    test('renders the error string instead of the value', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 42, error: 'ReferenceError: x is not defined' } });
        expect(wrapper.text()).toContain('ReferenceError: x is not defined');
    });

    test('error prop takes precedence over primitive error', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 99, error: 'oops' } });
        expect(wrapper.text()).toContain('oops');
        expect(wrapper.text()).not.toContain('JSON viz requires');
    });

    test('pre element has text-red-600 class when error prop is set', () => {
        const wrapper = shallowMount(VizJson, { props: { value: null, error: 'oops' } });
        expect(wrapper.find('pre').classes()).toContain('text-red-600');
    });

    test('pre element has text-red-600 class when value is primitive', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 42 } });
        expect(wrapper.find('pre').classes()).toContain('text-red-600');
    });

    test('pre element does not have text-red-600 class for object value', () => {
        const wrapper = shallowMount(VizJson, { props: { value: { a: 1 } } });
        expect(wrapper.find('pre').classes()).not.toContain('text-red-600');
    });
});

describe('VizJson — renders inside a pre element', () => {
    test('output is wrapped in a pre tag', () => {
        const wrapper = shallowMount(VizJson, { props: { value: 1 } });
        expect(wrapper.find('pre').exists()).toBe(true);
    });
});
