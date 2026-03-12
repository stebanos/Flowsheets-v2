import { describe, test, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { useBlockStore } from '@/entities/block';
import BlockMenu from './BlockMenu.vue';

const { blocks, addBlock } = useBlockStore();

beforeEach(() => { blocks.splice(0); });

describe('BlockMenu — delete', () => {
    test('Delete command removes the block from the store', () => {
        addBlock({ id: '1', name: 'a', code: '1' });
        const wrapper = mount(BlockMenu, {
            props: { block: blocks[0] },
            global: { stubs: { PButton: true, PMenu: true } }
        });
        const { menuItems } = wrapper.vm.$.setupState;
        menuItems.find(item => item.label === 'Delete').command();
        expect(blocks).toHaveLength(0);
    });
});
