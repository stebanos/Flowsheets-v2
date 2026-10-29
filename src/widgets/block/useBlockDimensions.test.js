import { createApp, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useHistory } from '@/features/sheet/history';
import { useBlockDimensions } from './useBlockDimensions';

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

const { blocks, addBlock, updateBlock } = useBlockStore();
const { suppress } = useHistory();

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
    test('snappedEditorWidth returns editorWidth directly', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const { snappedEditorWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        expect(snappedEditorWidth.value).toBe(200);
    });

    test('snappedEditorHeight returns editorHeight directly when not collapsed', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const { snappedEditorHeight } = withSetup(() => useBlockDimensions(block, makeDeps()));

        expect(snappedEditorHeight.value).toBe(80);
    });

    test('snappedEditorHeight is 0 when editorCollapsed is true', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const editorCollapsed = ref(true);
        const { snappedEditorHeight } = withSetup(() => useBlockDimensions(block, makeDeps({ editorCollapsed })));

        expect(snappedEditorHeight.value).toBe(0);
    });

    test('snappedBlockHeight sums header + editor + inputs panel + output', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const deps = makeDeps({ snappedOutputHeight: ref(120) });
        const { snappedBlockHeight } = withSetup(() => useBlockDimensions(block, deps));

        // cellHeight(40) + editorHeight(80) + inputsPanel(0) + outputHeight(120) = 240
        expect(snappedBlockHeight.value).toBe(240);
    });

    test('snappedBlockHeight excludes editor height when collapsed', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const deps = makeDeps({ snappedOutputHeight: ref(120), editorCollapsed: ref(true) });
        const { snappedBlockHeight } = withSetup(() => useBlockDimensions(block, deps));

        // cellHeight(40) + 0 + inputsPanel(0) + outputHeight(120) = 160
        expect(snappedBlockHeight.value).toBe(160);
    });

    test('snappedBlockHeight includes the param bar height', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const deps = makeDeps({ snappedOutputHeight: ref(120), editorCollapsed: ref(true), snappedParamBarHeight: ref(40) });
        const { snappedBlockHeight } = withSetup(() => useBlockDimensions(block, deps));

        // cellHeight(40) + paramBar(40) + 0 + inputsPanel(0) + outputHeight(120) = 200
        expect(snappedBlockHeight.value).toBe(200);
    });

    test('falls back to 2*cellHeight when block.editorHeight is missing', () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160 });
        const block = blocks[0];
        const { editorHeight } = withSetup(() => useBlockDimensions(block, makeDeps()));

        expect(editorHeight.value).toBe(80); // 2 * cellHeight(40)
    });

    test('write-back watch updates block.width immediately', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        withSetup(() => useBlockDimensions(block, makeDeps()));
        await nextTick();

        expect(block.width).toBe(200);
    });

    test('editorHeight follows the store when the block is restored (undo/redo)', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const { editorHeight, snappedBlockHeight } = withSetup(() => useBlockDimensions(block, makeDeps()));

        editorHeight.value = 160;
        updateBlock('b1', { editorHeight: 160 }); // what the resize handle does on mouseup
        await nextTick();
        suppress(() => updateBlock('b1', { editorHeight: 80 })); // snapshot restore
        await nextTick();

        expect(editorHeight.value).toBe(80);
        expect(snappedBlockHeight.value).toBe(160); // 40 + 80 + 0 + 40
    });

    test('editorWidth follows the store when the block is restored (undo/redo)', async () => {
        addBlock({ id: 'b1', name: 'a', width: 200, height: 160, editorHeight: 80, outputHeight: 120 });
        const block = blocks[0];
        const { editorWidth } = withSetup(() => useBlockDimensions(block, makeDeps()));

        editorWidth.value = 300;
        await nextTick();
        suppress(() => updateBlock('b1', { width: 200 }));
        await nextTick();

        expect(editorWidth.value).toBe(200);
    });
});
