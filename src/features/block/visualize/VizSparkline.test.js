import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import VizSparkline from './VizSparkline.vue';

describe('VizSparkline', () => {
    test('renders error message when error prop is set', () => {
        const wrapper = shallowMount(VizSparkline, { props: { error: 'boom' } });
        expect(wrapper.text()).toContain('boom');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('shows fallback text when value is not coercible', () => {
        const wrapper = shallowMount(VizSparkline, { props: { value: 42 } });
        expect(wrapper.text()).toContain('expects numbers');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('renders an svg when value is coercible', () => {
        const wrapper = shallowMount(VizSparkline, { props: { value: [1, 3, 2, 5, 4, 6] } });
        expect(wrapper.find('svg').exists()).toBe(true);
    });

    test('root element is a single div', () => {
        const wrapper = shallowMount(VizSparkline, { props: { value: [1, 2, 3] } });
        expect(wrapper.element.tagName).toBe('DIV');
    });
});
