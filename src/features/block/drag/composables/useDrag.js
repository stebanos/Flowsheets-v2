import { reactive } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useDrag(snapX, snapY, updateFn) {
    const _updateFn = updateFn ?? useBlockStore().updateBlock;

    const dragState = reactive({
        block: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        coparticipants: []
    });

    function startDrag(block, event, coparticipants = []) {
        dragState.block = block;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.startLeft = block.x;
        dragState.startTop = block.y;
        dragState.coparticipants = coparticipants;

        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDrag(event) {
        if (!dragState.block) return;

        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        _updateFn(dragState.block.id, {
            x: snapX(dragState.startLeft + dx),
            y: snapY(dragState.startTop + dy)
        });

        for (const cp of dragState.coparticipants) {
            _updateFn(cp.id, {
                x: snapX(cp.startX + dx),
                y: snapY(cp.startY + dy)
            });
        }
    }

    function stopDrag() {
        dragState.block = null;
        dragState.coparticipants = [];
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    return {
        startDrag,
        stopDrag
    };
}
