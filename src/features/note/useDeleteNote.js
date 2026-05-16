import { ref, toRaw } from 'vue';
import { useNoteStore } from '@/entities/note';
import { useFocusedNote } from './useFocusedNote';

const _pendingLabel = ref(null); // { label } — shown in toast; cleared on next action

export function useDeleteNote() {
    const { removeNote } = useNoteStore();
    const { clearNote } = useFocusedNote();

    function deleteNote(note) {
        const raw = toRaw(note);
        clearNote();
        removeNote(raw.id);
        _pendingLabel.value = { label: raw.title || 'Note' };
    }

    function dismissUndo() {
        _pendingLabel.value = null;
    }

    return {
        deleteNote,
        dismissUndo,
        undoPending: _pendingLabel
    };
}
