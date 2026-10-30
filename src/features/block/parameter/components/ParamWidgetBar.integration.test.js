/**
 * Integration: ParamWidgetBar writes through the real blockStore into the real history,
 * so tag coalescing is exercised end-to-end (one drag = one undo step).
 */
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let ParamWidgetBar, useHistory, useBlockStore, serializeSheet, deserializeSheet, blockModule;

beforeEach(async () => {
    vi.resetModules();
    ({ useHistory } = await import('@/entities/history'));
    ({ useBlockStore } = await import('@/entities/block'));
    ({ serializeSheet, deserializeSheet } = await import('@/shared/lib/persistence'));
    blockModule = await import('@/entities/block/blockStore');
    ParamWidgetBar = (await import('./ParamWidgetBar.vue')).default;
});

function setup() {
    const { blocks, addBlock, replaceBlocks } = useBlockStore();
    const history = useHistory({
        captureSnapshot: () => serializeSheet(blocks, {}, 'test', { panX: 0, panY: 0 }, []),
        restoreSnapshot: (snap) => replaceBlocks(deserializeSheet(snap).blocks)
    });
    history.setActiveSheet('param-sheet');
    blockModule.setBeforeMutationHook(history.captureIfOpen);
    history.suppress(() => {
        blocks.splice(0);
        addBlock({
            id: 'b1', name: 'speed', code: '0.5', x: 0, y: 0, width: 150, editorHeight: 48, outputHeight: 72,
            inputModes: {}, visualizationType: 'default', vizOptions: {}, editorCollapsed: true,
            param: { widget: 'slider', min: 0, max: 1, step: 0.1 }
        });
    });
    const wrapper = mount(ParamWidgetBar, {
        props: { block: blocks[0], value: 0.5 },
        global: { plugins: [PrimeVue] }
    });
    const bar = wrapper.find('.param-widget-bar');
    const slider = wrapper.findComponent({ name: 'Slider' });
    return { blocks, history, bar, slider };
}

describe('ParamWidgetBar + history', () => {
    test('a whole drag is one undo step', async () => {
        const { blocks, history, bar, slider } = setup();
        await bar.trigger('pointerdown');
        slider.vm.$emit('update:modelValue', 0.6);
        slider.vm.$emit('update:modelValue', 0.7);
        slider.vm.$emit('update:modelValue', 0.8);
        expect(blocks[0].code).toBe('0.8');

        history.undo();
        expect(blocks[0].code).toBe('0.5');
    });

    test('two consecutive drags are two undo steps', async () => {
        const { blocks, history, bar, slider } = setup();
        await bar.trigger('pointerdown');
        slider.vm.$emit('update:modelValue', 0.6);
        slider.vm.$emit('update:modelValue', 0.7);
        await bar.trigger('pointerdown');
        slider.vm.$emit('update:modelValue', 0.9);
        slider.vm.$emit('update:modelValue', 1);

        history.undo();
        expect(blocks[0].code).toBe('0.7');
        history.undo();
        expect(blocks[0].code).toBe('0.5');
    });
});
