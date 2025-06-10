import { reactive } from 'vue';
import { useCellDimensions } from './useCellDimensions';

export function useResize() {
    const { cellWidth, cellHeight, snapX, snapY } = useCellDimensions();

    const resizeState = reactive({
        block: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
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

        resizeState.block.width = snapX(resizeState.startWidth + dx);
        resizeState.block.height = snapY(resizeState.startHeight + dy);

        if (resizeState.block.width < cellWidth.value) {
            resizeState.block.width = cellWidth.value;
        }
        if (resizeState.block.height < cellHeight.value) {
            resizeState.block.height = cellHeight.value;
        }
    }

    function stopResize() {
        resizeState.block = null;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    }

    return {
        startResize,
        onResize,
        stopResize,
    };
}