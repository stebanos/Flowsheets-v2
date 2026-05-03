import { createApp, ref, nextTick } from 'vue';
import { describe, test, expect, beforeEach } from 'vitest';
import { useBlockDimensions } from './useBlockDimensions';
import { useBlockStore } from '@/entities/block';

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

const { blocks, addBlock } = useBlockStore();

beforeEach(() => { blocks.splice(0); });

function makeDeps(overrides = {}) {
    return {
        cellWidth: ref(100),
        cellHeight: ref(40),
        unitX: ref(100),
        snappedInputsPanelHeight: ref(0),
        snappedOutputHeight: ref(40),
        editorCollapsed: ref(false),
        ...overrides
    };
}

describe('useBlockDimensions', () => {
    test('rawEditorWidth change snaps snappedEditorWidth to next grid unit', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, userMinWidth: null, userMinEditorHeight: null });
        const block = blocks[0];
        const { snappedEditorWidth, handleContentWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        handleContentWidth(250);
        await nextTick();

        expect(snappedEditorWidth.value).toBe(300); // ceil(250/100)*100 = 300
    });

    test('external block.width change updates rawEditorWidth', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, userMinWidth: null, userMinEditorHeight: null });
        const block = blocks[0];
        const { rawEditorWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        block.width = 350;
        await nextTick();

        expect(rawEditorWidth.value).toBe(350);
    });

    test('external block.width equal to snapped value does not update rawEditorWidth', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, userMinWidth: null, userMinEditorHeight: null });
        const block = blocks[0];
        const { rawEditorWidth, snappedEditorWidth, handleContentWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        // After this, rawEditorWidth=250, snappedEditorWidth=300, write-back sets block.width=300.
        // The block.width watcher sees 300===300 and guards — rawEditorWidth must stay 250.
        handleContentWidth(250);
        await nextTick();

        expect(rawEditorWidth.value).toBe(250);
        expect(snappedEditorWidth.value).toBe(300);
    });

    test('handleContentWidth is skipped on first call when block.userMinWidth is set', async () => {
        addBlock({ id: 'b1', name: 'a', width: 300, height: 160, userMinWidth: 300, userMinEditorHeight: null });
        const block = blocks[0];
        const { snappedEditorWidth, handleContentWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        const before = snappedEditorWidth.value;
        handleContentWidth(500); // would push snappedEditorWidth to 500 if not skipped
        await nextTick();

        expect(snappedEditorWidth.value).toBe(before);
    });

    test('handleContentWidth is not skipped on first call when block.userMinWidth is null', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, userMinWidth: null, userMinEditorHeight: null });
        const block = blocks[0];
        const { snappedEditorWidth, handleContentWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        handleContentWidth(350);
        await nextTick();

        expect(snappedEditorWidth.value).toBe(400); // ceil(350/100)*100 = 400
    });

    test('snappedEditorHeight equals cellHeight when editorCollapsed is true, ignoring content and manual minimum', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 480, userMinWidth: null, userMinEditorHeight: 200 });
        const block = blocks[0];
        const editorCollapsed = ref(true);
        const { snappedEditorHeight } = withSetup(() => useBlockDimensions(block, makeDeps({ editorCollapsed })));

        // userMinEditorHeight=200 and content height would both exceed cellHeight(40),
        // but collapsed state must override both and return exactly one row
        expect(snappedEditorHeight.value).toBe(40);
    });
});
