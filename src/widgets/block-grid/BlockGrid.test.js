import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { useCellDimensions } from '@/features/block/grid';
import BlockGrid from './BlockGrid.vue';

describe('BlockGrid', () => {
    test('sizes the grid pattern from the cell dimensions', () => {
        const { setCellDimensions } = useCellDimensions();
        setCellDimensions(150, 24);
        const wrapper = shallowMount(BlockGrid);
        const style = wrapper.element.style;
        expect(style.backgroundSize).toBe('150px 24px');
        expect(style.backgroundImage).toContain('linear-gradient');
        expect(style.backgroundImage).not.toContain('attr(');
    });

    test('offsets the pattern by the pan, wrapped into one cell', () => {
        const { setCellDimensions } = useCellDimensions();
        setCellDimensions(150, 24);
        const wrapper = shallowMount(BlockGrid, { props: { panX: -170, panY: 30 } });
        expect(wrapper.element.style.backgroundPosition).toBe('130px 6px');
    });
});
