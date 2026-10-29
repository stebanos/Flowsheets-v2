import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ParamConfigPopover from './ParamConfigPopover.vue';

const updateBlock = vi.fn();

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock })
}));

// jsdom has no matchMedia; PrimeVue Select binds an orientation listener on mount
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

beforeEach(() => { updateBlock.mockClear(); });

function mountPopover(blockOverrides = {}, props = {}) {
    return mount(ParamConfigPopover, {
        props: { block: { id: 'b1', name: 'speed', code: '0.5', param: null, ...blockOverrides }, ...props },
        global: { plugins: [PrimeVue] }
    });
}

async function setWidget(wrapper, widget) {
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', widget);
    await wrapper.vm.$nextTick();
}

async function setField(wrapper, key, value) {
    await wrapper.find(`[data-field="${key}"]`).setValue(value);
}

describe('ParamConfigPopover — deps warning', () => {
    test('shows the warning when the block has dependencies', () => {
        const wrapper = mountPopover({}, { hasDependencies: true });
        expect(wrapper.find('.param-deps-warning').exists()).toBe(true);
        expect(wrapper.text()).toContain('replace this block\'s code');
    });

    test('no warning when the block has no dependencies', () => {
        const wrapper = mountPopover({}, { hasDependencies: false });
        expect(wrapper.find('.param-deps-warning').exists()).toBe(false);
    });
});

describe('ParamConfigPopover — fields per widget type', () => {
    test('slider (default) shows min / max / step', () => {
        const wrapper = mountPopover();
        expect(wrapper.find('[data-field="min"]').exists()).toBe(true);
        expect(wrapper.find('[data-field="max"]').exists()).toBe(true);
        expect(wrapper.find('[data-field="step"]').exists()).toBe(true);
        expect(wrapper.find('[data-field="options"]').exists()).toBe(false);
    });

    test('options shows the options list', async () => {
        const wrapper = mountPopover();
        await setWidget(wrapper, 'options');
        expect(wrapper.find('[data-field="options"]').exists()).toBe(true);
        expect(wrapper.find('[data-field="min"]').exists()).toBe(false);
    });

    test('toggle has no extra fields', async () => {
        const wrapper = mountPopover();
        await setWidget(wrapper, 'toggle');
        expect(wrapper.findAll('[data-field]')).toHaveLength(0);
    });

    test('editing prefills from the existing param', () => {
        const wrapper = mountPopover({ param: { widget: 'slider', min: 2, max: 8, step: 0.5 } });
        expect(wrapper.find('[data-field="min"]').element.value).toBe('2');
        expect(wrapper.find('[data-field="max"]').element.value).toBe('8');
        expect(wrapper.find('[data-field="step"]').element.value).toBe('0.5');
    });
});

describe('ParamConfigPopover — save', () => {
    test('slider save writes param + editorCollapsed in one call', async () => {
        const wrapper = mountPopover();
        await setField(wrapper, 'min', '0');
        await setField(wrapper, 'max', '1');
        await setField(wrapper, 'step', '0.01');
        await wrapper.find('.param-save').trigger('click');
        expect(updateBlock).toHaveBeenCalledTimes(1);
        expect(updateBlock).toHaveBeenCalledWith('b1', {
            param: { widget: 'slider', min: 0, max: 1, step: 0.01 },
            editorCollapsed: true
        });
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    test('options save writes the trimmed, non-empty lines', async () => {
        const wrapper = mountPopover();
        await setWidget(wrapper, 'options');
        await setField(wrapper, 'options', ' red \n\ngreen\n');
        await wrapper.find('.param-save').trigger('click');
        expect(updateBlock).toHaveBeenCalledWith('b1', {
            param: { widget: 'options', options: ['red', 'green'] },
            editorCollapsed: true
        });
    });

    test('toggle save writes just the widget', async () => {
        const wrapper = mountPopover();
        await setWidget(wrapper, 'toggle');
        await wrapper.find('.param-save').trigger('click');
        expect(updateBlock).toHaveBeenCalledWith('b1', { param: { widget: 'toggle' }, editorCollapsed: true });
    });

    test('invalid slider range disables save', async () => {
        const wrapper = mountPopover();
        await setField(wrapper, 'min', '5');
        await setField(wrapper, 'max', '1');
        await wrapper.find('.param-save').trigger('click');
        expect(updateBlock).not.toHaveBeenCalled();
    });

    test('empty options list disables save', async () => {
        const wrapper = mountPopover();
        await setWidget(wrapper, 'options');
        await setField(wrapper, 'options', '  \n');
        await wrapper.find('.param-save').trigger('click');
        expect(updateBlock).not.toHaveBeenCalled();
    });
});

describe('ParamConfigPopover — remove / cancel', () => {
    test('remove is only offered when editing an existing param', () => {
        expect(mountPopover().find('.param-remove').exists()).toBe(false);
        expect(mountPopover({ param: { widget: 'toggle' } }).find('.param-remove').exists()).toBe(true);
    });

    test('remove writes param: null and restores the editor', async () => {
        const wrapper = mountPopover({ param: { widget: 'toggle' } });
        await wrapper.find('.param-remove').trigger('click');
        expect(updateBlock).toHaveBeenCalledWith('b1', { param: null, editorCollapsed: false });
        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    test('cancel closes without writing', async () => {
        const wrapper = mountPopover();
        await wrapper.find('.param-cancel').trigger('click');
        expect(updateBlock).not.toHaveBeenCalled();
        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
