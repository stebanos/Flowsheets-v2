import { describe, test, expect, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { useBlockStore } from '@/entities/block';
import BlockMenu from './BlockMenu.vue';

const { blocks, addBlock } = useBlockStore();

beforeEach(() => { blocks.splice(0); });

describe('BlockMenu — delete', () => {
    test('Delete command removes the block from the store', () => {
        addBlock({ id: '1', name: 'a', code: '1', visualizationType: 'default', vizOptions: {} });
        const wrapper = shallowMount(BlockMenu, {
            props: { block: blocks[0] }
        });
        const { menuItems } = wrapper.vm.$.setupState;
        menuItems.find(item => item.label === 'Delete').command();
        expect(blocks).toHaveLength(0);
    });
});
