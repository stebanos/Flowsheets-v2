import { toRaw } from 'vue';
import { useNoteStore } from '@/entities/note';
import { useFocusedNote } from './useFocusedNote';

export function useDeleteNote() {
    const { removeNote } = useNoteStore();
    const { clearNote } = useFocusedNote();

    function deleteNote(note) {
        const raw = toRaw(note);
        clearNote();
        removeNote(raw.id);
    }

    return { deleteNote };
}
