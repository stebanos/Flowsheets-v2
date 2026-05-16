import { reactive, ref } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useHistory } from '@/features/sheet/history';

export function useDrag(snapX, snapY, updateFn) {
    const _updateFn = updateFn ?? useBlockStore().updateBlock;
    const { beginGroup, endGroup } = useHistory();

    const isDragging = ref(false);

    const dragState = reactive({
        block: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        coparticipants: []
    });

    function startDrag(block, event, coparticipants = []) {
        isDragging.value = true;
        dragState.block = block;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.startLeft = block.x;
        dragState.startTop = block.y;
        dragState.coparticipants = coparticipants;

        beginGroup();
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
        isDragging.value = false;
        dragState.block = null;
        dragState.coparticipants = [];
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        endGroup();
    }

    return {
        isDragging,
        startDrag,
        stopDrag
    };
}
