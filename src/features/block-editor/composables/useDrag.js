import { reactive } from 'vue';
import { useCellDimensions } from '.';

export function useDrag() {
    const { snapX, snapY } = useCellDimensions();

    const dragState = reactive({
        block: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0
    });

    function startDrag(block, event) {
        dragState.block = block;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.startLeft = block.x;
        dragState.startTop = block.y;

        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDrag(event) {
        if (!dragState.block) return;

        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        dragState.block.x = snapX(dragState.startLeft + dx);
        dragState.block.y = snapY(dragState.startTop + dy);
    }

    function stopDrag() {
        dragState.block = null;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    return {
        startDrag,
        onDrag,
        stopDrag,
    };
}
