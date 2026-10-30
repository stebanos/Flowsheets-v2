import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useListReorder } from './useListReorder';

// Cells 100px tall, stacked from y=0: midpoints at 50, 150, 250
function fakeCells(n) {
    return Array.from({ length: n }, (_, i) => ({
        getBoundingClientRect: () => ({ top: i * 100, height: 100, bottom: i * 100 + 100 })
    }));
}

function setup(ids = ['a', 'b', 'c']) {
    const items = ref(ids.map(id => ({ id })));
    const cells = fakeCells(ids.length);
    const moveTo = vi.fn();
    let api;
    const wrapper = mount(defineComponent({
        setup() {
            api = useListReorder(items, () => cells, moveTo);
            return () => h('div');
        }
    }));
    return { api, moveTo, wrapper };
}

const move = y => window.dispatchEvent(new MouseEvent('mousemove', { clientY: y }));
const up = () => window.dispatchEvent(new MouseEvent('mouseup'));
const down = () => new MouseEvent('mousedown', { button: 0 });

let mounted;
afterEach(() => { mounted?.unmount(); mounted = null; });

describe('useListReorder', () => {
    test('dragging the first cell below the last moves it to the end', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('a', down());
        expect(api.dragging.value).toBe('a');
        move(280);
        expect(api.dropIndex.value).toBe(3);
        up();
        expect(moveTo).toHaveBeenCalledOnce();
        expect(moveTo).toHaveBeenCalledWith('a', 2);
        expect(api.dragging.value).toBeNull();
        expect(api.dropIndex.value).toBeNull();
    });

    test('dragging the last cell above the first moves it to index 0', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('c', down());
        move(10);
        expect(api.dropIndex.value).toBe(0);
        up();
        expect(moveTo).toHaveBeenCalledWith('c', 0);
    });

    test('dropping between the 2nd and 3rd cell moves the first to index 1', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('a', down());
        move(160);
        expect(api.dropIndex.value).toBe(2);
        up();
        expect(moveTo).toHaveBeenCalledWith('a', 1);
    });

    test('a drop that keeps the order does not call moveTo', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('b', down());
        move(140);
        expect(api.dropIndex.value).toBeNull();
        move(60);
        expect(api.dropIndex.value).toBeNull();
        up();
        expect(moveTo).not.toHaveBeenCalled();
    });

    test('mouseup without movement does not call moveTo', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('a', down());
        up();
        expect(moveTo).not.toHaveBeenCalled();
    });

    test('listeners are removed after mouseup', () => {
        const { api, moveTo, wrapper } = setup();
        mounted = wrapper;
        const remove = vi.spyOn(window, 'removeEventListener');
        api.startDrag('a', down());
        move(280);
        up();
        expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function));
        move(10);
        up();
        expect(moveTo).toHaveBeenCalledOnce();
        expect(api.dropIndex.value).toBeNull();
        remove.mockRestore();
    });

    test('listeners are removed on unmount mid-drag', () => {
        const { api, moveTo, wrapper } = setup();
        api.startDrag('a', down());
        move(280);
        wrapper.unmount();
        up();
        expect(moveTo).not.toHaveBeenCalled();
        expect(api.dragging.value).toBeNull();
    });

    test('ignores drags with a single cell and non-primary buttons', () => {
        const single = setup(['a']);
        mounted = single.wrapper;
        single.api.startDrag('a', down());
        expect(single.api.dragging.value).toBeNull();
        single.wrapper.unmount();

        const { api, wrapper } = setup();
        mounted = wrapper;
        api.startDrag('a', new MouseEvent('mousedown', { button: 2 }));
        expect(api.dragging.value).toBeNull();
    });
});
