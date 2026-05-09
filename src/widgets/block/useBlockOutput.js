import { computed, ref } from 'vue';

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

export function useBlockOutput(block, { cellHeight, blockEval }) {
    const outputHeight = ref(block.outputHeight ?? 3 * cellHeight.value);

    const outputValue = computed(() => blockEval.value?.value);
    const isList = computed(() => Array.isArray(outputValue.value));
    const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

    const snappedOutputHeight = computed(() => outputHeight.value);
    const outputOverflowY = computed(() =>
        (block.visualizationType ?? 'default') !== 'default' ? 'hidden' : 'auto'
    );

    return { outputValue, isList, outputItems, outputOverflowY, snappedOutputHeight, outputHeight };
}
