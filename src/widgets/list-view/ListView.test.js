import { shallowMount } from '@vue/test-utils';
import { beforeEach, describe, expect, test } from 'vitest';
import { createBlock, useBlockStore } from '@/entities/block';
import ListCell from './ListCell.vue';
import ListView from './ListView.vue';

const mk = (id, listPosition = null) => createBlock({ id, name: id, x: 0, y: 0, width: 150, height: 96, listPosition });

let store;

beforeEach(() => {
    store = useBlockStore();
    store.replaceBlocks([]);
});

function mountView() {
    const context = { getEvaluation: () => undefined, getStatus: () => 'ok' };
    return shallowMount(ListView, {
        props: { context, blocks: store.blocks, setHovered: () => {}, clearHovered: () => {} }
    });
}

describe('ListView', () => {
    test('shows the empty state when no block is included', () => {
        store.replaceBlocks([mk('a'), mk('b')]);
        const wrapper = mountView();
        expect(wrapper.text()).toContain('No blocks included yet');
        expect(wrapper.text()).toContain('⊞');
        expect(wrapper.findAllComponents(ListCell)).toHaveLength(0);
    });

    test('renders included blocks in listPosition order, skipping excluded ones', () => {
        store.replaceBlocks([mk('a', 2), mk('b'), mk('c', 0), mk('d', 1)]);
        const wrapper = mountView();
        const names = wrapper.findAllComponents(ListCell).map(c => c.props('block').name);
        expect(names).toEqual(['c', 'd', 'a']);
        expect(wrapper.text()).not.toContain('No blocks included yet');
        expect(wrapper.findAll('[data-list-cell]')).toHaveLength(3);
    });

    test('a header drag-start dims the dragged cell', async () => {
        store.replaceBlocks([mk('a', 0), mk('b', 1)]);
        const wrapper = mountView();
        wrapper.findAllComponents(ListCell)[1].vm.$emit('drag-start', new MouseEvent('mousedown', { button: 0 }));
        await wrapper.vm.$nextTick();
        const cells = wrapper.findAll('[data-list-cell]');
        expect(cells[1].classes()).toContain('opacity-50');
        expect(cells[0].classes()).not.toContain('opacity-50');
        window.dispatchEvent(new MouseEvent('mouseup'));
    });
});
