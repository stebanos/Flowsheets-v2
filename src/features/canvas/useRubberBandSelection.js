import { ref } from 'vue';

export function useRubberBandSelection() {
    const isSelecting = ref(false);
    const rect = ref(null);

    function startRubberBand(canvasX, canvasY) {
        isSelecting.value = true;
        rect.value = { x1: canvasX, y1: canvasY, x2: canvasX, y2: canvasY };
    }

    function updateRubberBand(canvasX, canvasY) {
        if (!rect.value) { return; }
        rect.value = { ...rect.value, x2: canvasX, y2: canvasY };
    }

    function finishRubberBand(blocks, setSelectionFn, clearSelectionFn) {
        if (!rect.value) { isSelecting.value = false; return; }

        const { x1, y1, x2, y2 } = rect.value;
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);

        if (dx < 4 && dy < 4) {
            clearSelectionFn();
        } else {
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);

            const matching = blocks
                .filter(b => {
                    const bx1 = b.x;
                    const by1 = b.y;
                    const bx2 = b.x + b.width;
                    const by2 = b.y + (b.editorHeight ?? 48) + (b.outputHeight ?? 72);
                    return bx1 < maxX && bx2 > minX && by1 < maxY && by2 > minY;
                })
                .map(b => b.name);

            setSelectionFn(matching);
        }

        isSelecting.value = false;
        rect.value = null;
    }

    function cancelRubberBand() {
        isSelecting.value = false;
        rect.value = null;
    }

    return { isSelecting, rect, startRubberBand, updateRubberBand, finishRubberBand, cancelRubberBand };
}
