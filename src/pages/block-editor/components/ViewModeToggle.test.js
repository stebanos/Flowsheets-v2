import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ViewModeToggle from './ViewModeToggle.vue';

describe('ViewModeToggle', () => {
    test('marks the active mode with aria-pressed', () => {
        const wrapper = mount(ViewModeToggle, { props: { modelValue: 'list' } });
        const [canvas, list] = wrapper.findAll('button');
        expect(canvas.text()).toBe('Canvas');
        expect(canvas.attributes('aria-pressed')).toBe('false');
        expect(list.attributes('aria-pressed')).toBe('true');
    });

    test('emits update:modelValue on click', async () => {
        const wrapper = mount(ViewModeToggle, { props: { modelValue: 'canvas' } });
        await wrapper.findAll('button')[1].trigger('click');
        expect(wrapper.emitted('update:modelValue')).toEqual([['list']]);
    });
});
