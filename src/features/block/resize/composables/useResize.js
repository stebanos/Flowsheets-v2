import { reactive } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useResize(snapX, snapY, cellWidth, cellHeight) {
    const { updateBlock } = useBlockStore();

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

        updateBlock(resizeState.block.id, {
            // Minimum 1 full column; snap to sub-grid units (same as drag).
            width: Math.max(cellWidth.value, snapX(resizeState.startWidth + dx)),
            height: Math.max(3 * cellHeight.value, snapY(resizeState.startHeight + dy))
        });
    }

    function stopResize() {
        resizeState.block = null;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    }

    return {
        startResize
    };
}
