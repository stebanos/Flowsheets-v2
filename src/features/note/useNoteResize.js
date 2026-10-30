import { ref } from 'vue';
import { useWindowDrag } from '@/shared/composables';
import { useHistory } from '@/entities/history';
import { NOTE_MIN_SIZE, useNoteStore } from '@/entities/note';

/**
 * Corner-handle resize for a canvas note. One history group per gesture, so a
 * resize undoes as a single step.
 */
export function useNoteResize(note) {
    const { updateNote } = useNoteStore();
    const { beginGroup, endGroup } = useHistory();
    const drag = useWindowDrag();

    const isResizing = ref(false);

    function startResize(event) {
        if (event.button !== 0) { return; }
        const startX = event.clientX;
        const startY = event.clientY;
        const startW = note.width;
        const startH = note.height;
        isResizing.value = true;
        beginGroup();
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            updateNote(note.id, {
                width: Math.max(NOTE_MIN_SIZE.width, startW + dx),
                height: Math.max(NOTE_MIN_SIZE.height, startH + dy)
            });
        };
        const onUp = () => {
            isResizing.value = false;
            endGroup();
        };
        drag.start(onMove, onUp);
    }

    return { isResizing, startResize };
}
