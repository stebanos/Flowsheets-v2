import { ref, toRaw } from 'vue';
import { useNoteStore } from '@/entities/note';
import { useFocusedNote } from './useFocusedNote';

const undoPending = ref(null);
let timer = null;

const UNDO_TIMEOUT_MS = 20000;

export function useDeleteNote() {
    const { removeNote, addNote } = useNoteStore();
    const { clearNote } = useFocusedNote();

    function deleteNote(note) {
        const raw = toRaw(note);
        clearNote();
        removeNote(raw.id);
        undoPending.value = { note: { ...raw }, label: raw.title || 'Note' };
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => {
            undoPending.value = null;
            timer = null;
        }, UNDO_TIMEOUT_MS);
    }

    function undoDelete() {
        if (!undoPending.value) { return; }
        addNote(undoPending.value.note);
        undoPending.value = null;
        if (timer) { clearTimeout(timer); timer = null; }
    }

    function dismissUndo() {
        undoPending.value = null;
        if (timer) { clearTimeout(timer); timer = null; }
    }

    return { deleteNote, undoDelete, dismissUndo, undoPending };
}
