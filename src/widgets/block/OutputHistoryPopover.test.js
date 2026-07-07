import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import OutputHistoryPopover from './OutputHistoryPopover.vue';

describe('OutputHistoryPopover — primitives', () => {
    test('renders one-line old → new for numbers', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: 2, current: 3 } });
        expect(wrapper.text()).toContain('2');
        expect(wrapper.text()).toContain('3');
        expect(wrapper.text()).toContain('→');
    });

    test('renders one-line old → new for booleans', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: true, current: false } });
        expect(wrapper.text()).toContain('true');
        expect(wrapper.text()).toContain('false');
    });

    test('renders one-line old → new for null/undefined', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: null, current: undefined } });
        expect(wrapper.text()).toContain('null');
        expect(wrapper.text()).toContain('undefined');
    });
});

describe('OutputHistoryPopover — strings, arrays, objects', () => {
    test('renders a line diff for strings', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: 'hello', current: 'world' } });
        expect(wrapper.text()).toContain('hello');
        expect(wrapper.text()).toContain('world');
    });

    test('renders a line diff for arrays', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: [1, 2, 3], current: [1, 2, 4] } });
        expect(wrapper.text()).toContain('3');
        expect(wrapper.text()).toContain('4');
    });

    test('renders a line diff for objects', () => {
        const wrapper = shallowMount(OutputHistoryPopover, { props: { previous: { a: 1 }, current: { a: 2 } } });
        expect(wrapper.text()).toContain('"a"');
    });
});

describe('OutputHistoryPopover — null-safe', () => {
    test('does not throw when previous is null', () => {
        expect(() => shallowMount(OutputHistoryPopover, { props: { previous: null, current: null } })).not.toThrow();
    });
});
