import { reactive } from 'vue';
import { useCellDimensions } from '.';

export function useResize() {
    const { cellWidth, cellHeight, snapY } = useCellDimensions();

    const resizeState = reactive({
        block: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0
    });

    function startResize(block, event) {
        resizeState.block = block;
        resizeState.startX = event.clientX;
        resizeState.startY = event.clientY;
        resizeState.startWidth = block.width;
        resizeState.startHeight = block.height;

        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', stopResize);
    }

    function onResize(event) {
        if (!resizeState.block) return;

        const dx = event.clientX - resizeState.startX;
        const dy = event.clientY - resizeState.startY;

        // Snap width to full columns (cellWidth), not sub-grid units.
        // Sub-grid snapping misaligns with snappedEditorWidth in Block.vue
        // and causes oscillation between the two snap grids on every frame.
        const cols = Math.max(1, Math.round((resizeState.startWidth + dx) / cellWidth.value));
        resizeState.block.width = cols * cellWidth.value;
        resizeState.block.height = Math.max(cellHeight.value, snapY(resizeState.startHeight + dy));
    }

    function stopResize() {
        resizeState.block = null;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    }

    return {
        startResize,
        onResize,
        stopResize
    };
}
