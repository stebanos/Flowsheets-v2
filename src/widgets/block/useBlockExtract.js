import { nextTick, toRaw } from 'vue';
import { useCellDimensions, usePendingNameFocus } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useBlockManager } from '@/features/block/manage';

export function useBlockExtract(block, getEvaluation, snappedEditorWidth, cellWidth) {
    const { updateBlock } = useBlockStore();
    const { createBlock } = useBlockManager();
    const { unitY } = useCellDimensions();
    const { requestFocus } = usePendingNameFocus();

    function outputsEqual(a, b) {
        if (a === b) { return true; }
        try { return JSON.stringify(toRaw(a)) === JSON.stringify(toRaw(b)); } catch { return false; }
    }

    function onExtract(selectedText) {
        const evalResult = getEvaluation(block.name);
        const outputBefore = evalResult?.error ? null : toRaw(evalResult?.value);
        const x = block.x + snappedEditorWidth.value + cellWidth.value;
        const y = block.y;
        const newName = createBlock({ x, y }, null, selectedText, cellWidth, unitY);
        updateBlock(block.id, { inputModes: { ...block.inputModes, [newName]: 'each' } });
        requestFocus(newName);

        nextTick(() => {
            const evalAfter = getEvaluation(block.name);
            const outputAfter = evalAfter?.error ? null : toRaw(evalAfter?.value);
            if (!outputsEqual(outputBefore, outputAfter)) {
                updateBlock(block.id, { inputModes: { ...block.inputModes, [newName]: 'all' } });
            }
        });

        return newName;
    }

    return { onExtract };
}
