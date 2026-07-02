import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import VizBarChart from './VizBarChart.vue';

describe('VizBarChart', () => {
    test('renders error message when error prop is set', () => {
        const wrapper = shallowMount(VizBarChart, { props: { error: 'boom' } });
        expect(wrapper.text()).toContain('boom');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('shows fallback text when value is not coercible', () => {
        const wrapper = shallowMount(VizBarChart, { props: { value: 42 } });
        expect(wrapper.text()).toContain('expects an array of numbers');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('renders an svg when value is coercible', () => {
        const wrapper = shallowMount(VizBarChart, { props: { value: [5, 12, 3, 8] } });
        expect(wrapper.find('svg').exists()).toBe(true);
    });

    test('root element is a single div', () => {
        const wrapper = shallowMount(VizBarChart, { props: { value: [1, 2, 3] } });
        expect(wrapper.element.tagName).toBe('DIV');
    });
});
