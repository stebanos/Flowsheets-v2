import { shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createBlock, setBeforeMutationHook, useBlockStore } from '@/entities/block';
import { CodeEditor } from '@/features/block/edit-code';
import { ParamWidgetBar } from '@/features/block/parameter';
import { VIZ_TYPES } from '@/features/block/visualize';
import ListCell from './ListCell.vue';

const mk = (overrides = {}) => createBlock({ id: 'b1', name: 'speed', x: 0, y: 0, width: 150, height: 96, code: '1 + 1', listPosition: 0, ...overrides });

let store;
let tags;

beforeEach(() => {
    store = useBlockStore();
    store.replaceBlocks([]);
    tags = [];
    setBeforeMutationHook(tag => tags.push(tag));
});

afterEach(() => {
    setBeforeMutationHook(null);
});

function mountCell({ block = mk(), evaluation = { value: 2 }, status = 'ok' } = {}) {
    store.replaceBlocks([block]);
    const live = store.blocks[0];
    const context = {
        getEvaluation: name => (name === live.name ? evaluation : undefined),
        getStatus: () => status
    };
    const wrapper = shallowMount(ListCell, {
        props: { block: live, context, blocks: store.blocks, setHovered: () => {}, clearHovered: () => {} }
    });
    return { wrapper, context, live };
}

describe('ListCell', () => {
    test('renders the block name as read-only text', () => {
        const { wrapper } = mountCell();
        expect(wrapper.find('.list-cell-name').text()).toBe('speed');
        expect(wrapper.find('.list-cell-header input').exists()).toBe(false);
    });

    test('viz branch receives the full output prop bundle', () => {
        const { wrapper, live } = mountCell({ evaluation: { value: [1, 'a'] } });
        const viz = wrapper.findComponent(VIZ_TYPES.default.component);
        expect(viz.exists()).toBe(true);
        expect(viz.props('value')).toEqual([1, 'a']);
        expect(viz.props('error')).toBeNull();
        expect(viz.props('block')).toStrictEqual(live);
        expect(viz.props('isList')).toBe(true);
        expect(viz.props('outputItems')).toEqual(['1', 'a']);
    });

    test('viz receives getEvaluation (declared by text-diff)', () => {
        const { wrapper, context } = mountCell({ block: mk({ visualizationType: 'text-diff' }) });
        expect(wrapper.findComponent(VIZ_TYPES['text-diff'].component).props('getEvaluation')).toBe(context.getEvaluation);
    });

    test('passes the evaluation error through', () => {
        const { wrapper } = mountCell({ evaluation: { value: undefined, error: 'boom' } });
        expect(wrapper.findComponent(VIZ_TYPES.default.component).props('error')).toBe('boom');
    });

    test('resolves the viz component from visualizationType', () => {
        const { wrapper } = mountCell({ block: mk({ visualizationType: 'json' }) });
        expect(wrapper.findComponent(VIZ_TYPES.json.component).exists()).toBe(true);
        expect(wrapper.findComponent(VIZ_TYPES.default.component).exists()).toBe(false);
    });

    test('blocked status renders the placeholder and no viz', () => {
        const { wrapper } = mountCell({ status: 'blocked' });
        expect(wrapper.text()).toContain('blocked — upstream error');
        expect(wrapper.findComponent(VIZ_TYPES.default.component).exists()).toBe(false);
    });

    test('param bar is present iff block.param', () => {
        expect(mountCell().wrapper.findComponent(ParamWidgetBar).exists()).toBe(false);
        const { wrapper } = mountCell({
            block: mk({ param: { widget: 'slider', min: 0, max: 1, step: 0.1 } }),
            evaluation: { value: 0.5 }
        });
        const bar = wrapper.findComponent(ParamWidgetBar);
        expect(bar.exists()).toBe(true);
        expect(bar.props('value')).toBe(0.5);
    });

    test('param bar gets undefined when the evaluation errored', () => {
        const { wrapper } = mountCell({
            block: mk({ param: { widget: 'slider' } }),
            evaluation: { value: 3, error: 'bad' }
        });
        expect(wrapper.findComponent(ParamWidgetBar).props('value')).toBeUndefined();
    });

    test('code editor is hidden by default and shown after the chevron click', async () => {
        const { wrapper } = mountCell();
        const toggle = wrapper.find('.list-cell-code-toggle');
        expect(wrapper.findComponent(CodeEditor).exists()).toBe(false);
        expect(toggle.attributes('aria-expanded')).toBe('false');
        expect(toggle.attributes('title')).toBe('Show code');
        await toggle.trigger('click');
        expect(wrapper.findComponent(CodeEditor).exists()).toBe(true);
        expect(toggle.attributes('aria-expanded')).toBe('true');
        expect(toggle.attributes('title')).toBe('Hide code');
    });

    test('expanding code does not touch block.editorCollapsed', async () => {
        const { wrapper, live } = mountCell();
        tags.length = 0;
        await wrapper.find('.list-cell-code-toggle').trigger('click');
        expect(live.editorCollapsed).toBe(false);
        expect(tags).toHaveLength(0);
    });

    test('code edits write through the store', async () => {
        const { wrapper, live } = mountCell();
        await wrapper.find('.list-cell-code-toggle').trigger('click');
        tags.length = 0;
        wrapper.findComponent(CodeEditor).vm.$emit('update:code', '40 + 2');
        expect(live.code).toBe('40 + 2');
        expect(tags).toEqual(['code:b1']);
    });

    test('header mousedown emits drag-start; chevron mousedown does not', async () => {
        const { wrapper } = mountCell();
        await wrapper.find('.list-cell-code-toggle').trigger('mousedown');
        expect(wrapper.emitted('drag-start')).toBeUndefined();
        await wrapper.find('.list-cell-header').trigger('mousedown');
        expect(wrapper.emitted('drag-start')).toHaveLength(1);
        expect(wrapper.emitted('drag-start')[0][0]).toBeInstanceOf(Event);
    });
});
