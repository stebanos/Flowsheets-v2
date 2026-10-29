import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ParamWidgetBar from './ParamWidgetBar.vue';

const updateBlock = vi.fn();

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock })
}));

// jsdom has no matchMedia; PrimeVue Select binds an orientation listener on mount
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

beforeEach(() => { updateBlock.mockClear(); });

function makeBlock(param, code = '0') {
    return { id: 'b1', name: 'speed', code, param };
}

function mountBar(param, value, code) {
    return mount(ParamWidgetBar, {
        props: { block: makeBlock(param, code), value },
        global: { plugins: [PrimeVue] }
    });
}

describe('ParamWidgetBar — rendering', () => {
    test('slider renders the evaluated value', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1, step: 0.01 }, 0.5, '0.5');
        const slider = wrapper.findComponent({ name: 'Slider' });
        expect(slider.props('modelValue')).toBe(0.5);
        expect(slider.props('min')).toBe(0);
        expect(slider.props('max')).toBe(1);
        expect(slider.props('step')).toBe(0.01);
    });

    test('slider clamps an out-of-range value for display without writing', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1, step: 0.1 }, 7, '7');
        expect(wrapper.findComponent({ name: 'Slider' }).props('modelValue')).toBe(1);
        expect(updateBlock).not.toHaveBeenCalled();
    });

    test('follows the evaluated value when it changes (manual code edit underneath)', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1, step: 0.1 }, 0.5, '0.5');
        await wrapper.setProps({ value: 0.9 });
        expect(wrapper.findComponent({ name: 'Slider' }).props('modelValue')).toBe(0.9);
    });

    test('toggle renders the evaluated boolean', () => {
        const wrapper = mountBar({ widget: 'toggle' }, true, 'true');
        expect(wrapper.findComponent({ name: 'ToggleSwitch' }).props('modelValue')).toBe(true);
    });

    test('text renders the evaluated string', () => {
        const wrapper = mountBar({ widget: 'text' }, 'hi', '"hi"');
        expect(wrapper.findComponent({ name: 'InputText' }).props('modelValue')).toBe('hi');
    });

    test('color passes bare hex to the picker', () => {
        const wrapper = mountBar({ widget: 'color' }, '#ff0000', '"#ff0000"');
        expect(wrapper.findComponent({ name: 'ColorPicker' }).props('modelValue')).toBe('ff0000');
    });

    test('options renders the selected option and the option list', () => {
        const wrapper = mountBar({ widget: 'options', options: ['a', 'b'] }, 'b', '"b"');
        const select = wrapper.findComponent({ name: 'Select' });
        expect(select.props('modelValue')).toBe('b');
        expect(select.props('options')).toEqual(['a', 'b']);
    });

    test('options value not in the list shows the placeholder (null model)', () => {
        const wrapper = mountBar({ widget: 'options', options: ['a', 'b'] }, 'zzz', '"zzz"');
        expect(wrapper.findComponent({ name: 'Select' }).props('modelValue')).toBeNull();
    });

    test('undefined value shows the "no value" state and writes nothing', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, undefined, 'missing');
        expect(wrapper.text()).toContain('no value');
        expect(wrapper.find('.param-no-value').exists()).toBe(true);
        expect(updateBlock).not.toHaveBeenCalled();
    });

    test('a defined value has no "no value" state', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        expect(wrapper.text()).not.toContain('no value');
    });
});

describe('ParamWidgetBar — write-back literals', () => {
    test('slider writes a numeric literal', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1, step: 0.01 }, 0.5, '0.5');
        wrapper.findComponent({ name: 'Slider' }).vm.$emit('update:modelValue', 0.75);
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: '0.75' }, expect.any(String));
    });

    test('toggle writes true / false', () => {
        const wrapper = mountBar({ widget: 'toggle' }, false, 'false');
        wrapper.findComponent({ name: 'ToggleSwitch' }).vm.$emit('update:modelValue', true);
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: 'true' }, expect.any(String));
    });

    test('text writes a JSON string literal', () => {
        const wrapper = mountBar({ widget: 'text' }, 'hi', '"hi"');
        wrapper.findComponent({ name: 'InputText' }).vm.$emit('update:modelValue', 'say "yo"');
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: '"say \\"yo\\""' }, expect.any(String));
    });

    test('color writes a #rrggbb string literal', () => {
        const wrapper = mountBar({ widget: 'color' }, '#ff0000', '"#ff0000"');
        wrapper.findComponent({ name: 'ColorPicker' }).vm.$emit('update:modelValue', '00ff00');
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: '"#00ff00"' }, expect.any(String));
    });

    test('options writes the selected string literal', () => {
        const wrapper = mountBar({ widget: 'options', options: ['a', 'b'] }, 'a', '"a"');
        wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'b');
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: '"b"' }, expect.any(String));
    });

    test('a write that produces the current code is skipped', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        wrapper.findComponent({ name: 'Slider' }).vm.$emit('update:modelValue', 0.5);
        expect(updateBlock).not.toHaveBeenCalled();
    });

    test('a block with dependencies is overwritten by a literal on first interaction', () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 10 }, 4, 'other * 2');
        wrapper.findComponent({ name: 'Slider' }).vm.$emit('update:modelValue', 6);
        expect(updateBlock).toHaveBeenCalledWith('b1', { code: '6' }, expect.any(String));
    });
});

describe('ParamWidgetBar — per-gesture undo tag', () => {
    function sliderWrites(wrapper, ...values) {
        const slider = wrapper.findComponent({ name: 'Slider' });
        for (const v of values) { slider.vm.$emit('update:modelValue', v); }
    }

    test('tag is scoped to the block id', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        await wrapper.find('.param-widget-bar').trigger('pointerdown');
        sliderWrites(wrapper, 0.6);
        expect(updateBlock.mock.calls[0][2]).toMatch(/^param:b1:\d+$/);
    });

    test('two writes within one gesture share a tag', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        await wrapper.find('.param-widget-bar').trigger('pointerdown');
        sliderWrites(wrapper, 0.6, 0.7);
        expect(updateBlock).toHaveBeenCalledTimes(2);
        expect(updateBlock.mock.calls[0][2]).toBe(updateBlock.mock.calls[1][2]);
    });

    test('a new pointer-down produces a new tag', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        const bar = wrapper.find('.param-widget-bar');
        await bar.trigger('pointerdown');
        sliderWrites(wrapper, 0.6);
        await bar.trigger('pointerdown');
        sliderWrites(wrapper, 0.7);
        expect(updateBlock.mock.calls[0][2]).not.toBe(updateBlock.mock.calls[1][2]);
    });

    test('nothing is written on pointer-up', async () => {
        const wrapper = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        const bar = wrapper.find('.param-widget-bar');
        await bar.trigger('pointerdown');
        sliderWrites(wrapper, 0.6);
        await bar.trigger('pointerup');
        await bar.trigger('mouseup');
        expect(updateBlock).toHaveBeenCalledTimes(1);
    });

    test('tags stay unique across remounts', async () => {
        const first = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        await first.find('.param-widget-bar').trigger('pointerdown');
        sliderWrites(first, 0.6);
        first.unmount();
        const second = mountBar({ widget: 'slider', min: 0, max: 1 }, 0.5, '0.5');
        await second.find('.param-widget-bar').trigger('pointerdown');
        sliderWrites(second, 0.6);
        expect(updateBlock.mock.calls[0][2]).not.toBe(updateBlock.mock.calls[1][2]);
    });
});
