import { ref, computed, watch } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useBlockDimensions(block, { cellWidth, cellHeight, unitX, snappedInputsPanelHeight, snappedOutputHeight, editorCollapsed = ref(false) }) {
    const { updateBlock } = useBlockStore();

    const rawEditorHeight = ref(block.userMinEditorHeight ?? cellHeight.value);
    const rawEditorWidth = ref(block.width ?? block.userMinWidth ?? cellWidth.value);

    const manualMinEditorHeight = ref(block.userMinEditorHeight ?? 0);
    const manualMinWidth = ref(block.userMinWidth ?? 0);

    let skipInitialWidthMeasurement = block.userMinWidth !== null;
    let skipInitialHeightMeasurement = block.userMinEditorHeight !== null;

    function handleContentWidth(w) {
        if (skipInitialWidthMeasurement) { skipInitialWidthMeasurement = false; return; }
        rawEditorWidth.value = w;
    }

    function handleContentHeight(h) {
        if (skipInitialHeightMeasurement) { skipInitialHeightMeasurement = false; return; }
        rawEditorHeight.value = h;
    }

    const snappedEditorHeight = computed(() => {
        if (editorCollapsed.value) { return cellHeight.value; }
        const contentHeight = Math.max(1, Math.ceil(rawEditorHeight.value / cellHeight.value)) * cellHeight.value;
        return Math.max(contentHeight, manualMinEditorHeight.value);
    });

    const snappedEditorWidth = computed(() => {
        const contentWidth = Math.max(cellWidth.value, Math.ceil(rawEditorWidth.value / unitX.value) * unitX.value);
        return Math.max(contentWidth, manualMinWidth.value);
    });

    const snappedBlockHeight = computed(() =>
        cellHeight.value + snappedEditorHeight.value + snappedInputsPanelHeight.value + snappedOutputHeight.value
    );

    watch(snappedBlockHeight, h => {
        updateBlock(block.id, { height: h });
    }, { immediate: true });

    watch(snappedEditorWidth, w => {
        updateBlock(block.id, { width: w });
    }, { immediate: true });

    // Sync external width/height changes (e.g. resize handle) back into raw refs.
    // Guard against our own write-back watches above to avoid circular updates.
    watch(() => block.width, w => {
        if (w !== snappedEditorWidth.value) {
            rawEditorWidth.value = w;
        }
    });

    watch(() => block.height, h => {
        if (h !== snappedBlockHeight.value) {
            rawEditorHeight.value = h - cellHeight.value - snappedInputsPanelHeight.value - snappedOutputHeight.value;
        }
    });

    return {
        rawEditorWidth,
        snappedEditorHeight,
        snappedEditorWidth,
        snappedBlockHeight,
        manualMinEditorHeight,
        manualMinWidth,
        handleContentWidth,
        handleContentHeight
    };
}
