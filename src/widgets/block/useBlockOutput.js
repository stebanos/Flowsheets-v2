import { ref, computed } from 'vue';

const MAX_OUTPUT_ROWS = 15;

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

export function useBlockOutput(block, { cellHeight, blockEval }) {
    const rawOutputHeight = ref(cellHeight.value);
    const manualMinOutputHeight = ref(block.userMinOutputHeight ?? 0);

    const outputValue = computed(() => blockEval.value?.value);
    const isList = computed(() => Array.isArray(outputValue.value));
    const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

    const snappedOutputHeight = computed(() => {
        const vizType = block.visualizationType ?? 'default';
        let autoHeight;
        if (vizType === 'default' && isList.value) {
            autoHeight = Math.max(1, Math.min(outputItems.value.length, MAX_OUTPUT_ROWS)) * cellHeight.value;
        } else {
            const minRows = vizType !== 'default' ? 3 : 1;
            const rows = Math.max(minRows, Math.ceil(rawOutputHeight.value / cellHeight.value));
            autoHeight = Math.min(rows, MAX_OUTPUT_ROWS) * cellHeight.value;
        }
        return Math.max(autoHeight, manualMinOutputHeight.value);
    });

    const outputOverflowY = computed(() => {
        const vizType = block.visualizationType ?? 'default';
        if (vizType !== 'default') { return 'hidden'; }
        if (isList.value) { return outputItems.value.length > MAX_OUTPUT_ROWS ? 'auto' : 'hidden'; }
        return rawOutputHeight.value > MAX_OUTPUT_ROWS * cellHeight.value ? 'auto' : 'hidden';
    });

    return { outputValue, isList, outputItems, outputOverflowY, snappedOutputHeight, rawOutputHeight, manualMinOutputHeight };
}
