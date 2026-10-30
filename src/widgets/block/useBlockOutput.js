import { computed, ref, watch } from 'vue';
import { formatValue } from '@/shared/lib/format-value';

export function useBlockOutput(block, { cellHeight, blockEval }) {
    const outputHeight = ref(block.outputHeight ?? 3 * cellHeight.value);

    const outputValue = computed(() => blockEval.value?.value);
    const isList = computed(() => Array.isArray(outputValue.value));
    const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

    const snappedOutputHeight = computed(() => outputHeight.value);
    const outputOverflowY = computed(() =>
        (block.visualizationType ?? 'default') !== 'default' ? 'hidden' : 'auto'
    );

    // the store is the source of truth: follow it so undo/redo and snapshot restores show up
    watch(() => block.outputHeight, h => { if (h != null) { outputHeight.value = h; } });

    return { outputValue, isList, outputItems, outputOverflowY, snappedOutputHeight, outputHeight };
}
