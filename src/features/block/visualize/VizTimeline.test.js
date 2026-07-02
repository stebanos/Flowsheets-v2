import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import VizTimeline from './VizTimeline.vue';

describe('VizTimeline', () => {
    test('renders error message when error prop is set', () => {
        const wrapper = shallowMount(VizTimeline, { props: { error: 'boom' } });
        expect(wrapper.text()).toContain('boom');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('shows fallback text when value is not coercible', () => {
        const wrapper = shallowMount(VizTimeline, { props: { value: 42 } });
        expect(wrapper.text()).toContain('expects [date, value] pairs');
        expect(wrapper.find('svg').exists()).toBe(false);
    });

    test('renders an svg when value is coercible', () => {
        const wrapper = shallowMount(VizTimeline, {
            props: { value: [['2026-01-01', 10], ['2026-03-01', 25], ['2026-05-01', 18]] }
        });
        expect(wrapper.find('svg').exists()).toBe(true);
    });

    test('renders an svg for a single-point series', () => {
        const wrapper = shallowMount(VizTimeline, { props: { value: [['2026-01-01', 10]] } });
        expect(wrapper.find('svg').exists()).toBe(true);
    });

    test('root element is a single div', () => {
        const wrapper = shallowMount(VizTimeline, { props: { value: [['2026-01-01', 10]] } });
        expect(wrapper.element.tagName).toBe('DIV');
    });
});
