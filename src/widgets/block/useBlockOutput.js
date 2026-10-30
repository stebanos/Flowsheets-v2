import { computed, ref, watch } from 'vue';
import { getVizDef } from '@/features/block/visualize';

export function useBlockOutput(block, { cellHeight }) {
    const outputHeight = ref(block.outputHeight ?? 3 * cellHeight.value);

    const snappedOutputHeight = computed(() => outputHeight.value);
    const outputOverflowY = computed(() =>
        getVizDef(block.visualizationType).fillsContainer ? 'hidden' : 'auto'
    );

    // the store is the source of truth: follow it so undo/redo and snapshot restores show up
    watch(() => block.outputHeight, h => { if (h != null) { outputHeight.value = h; } });

    return { outputOverflowY, snappedOutputHeight, outputHeight };
}
