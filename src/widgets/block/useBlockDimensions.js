import { computed, ref, watch } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useBlockDimensions(block, { cellWidth, cellHeight, unitX, snappedInputsPanelHeight, snappedOutputHeight, editorCollapsed = ref(false) }) {
    const { updateBlock } = useBlockStore();

    const editorWidth = ref(block.width ?? cellWidth.value);
    const editorHeight = ref(block.editorHeight ?? 2 * cellHeight.value);

    // NOTE: 0 when collapsed (no preview, no height contribution)
    const snappedEditorHeight = computed(() => editorCollapsed.value ? 0 : editorHeight.value);
    const snappedEditorWidth = computed(() => editorWidth.value);
    const snappedBlockHeight = computed(() =>
        cellHeight.value + snappedEditorHeight.value + snappedInputsPanelHeight.value + snappedOutputHeight.value
    );

    watch(snappedBlockHeight, h => updateBlock(block.id, { height: h }), { immediate: true });
    watch(snappedEditorWidth, w => updateBlock(block.id, { width: w }), { immediate: true });

    return { snappedEditorHeight, snappedEditorWidth, snappedBlockHeight, editorHeight, editorWidth };
}
