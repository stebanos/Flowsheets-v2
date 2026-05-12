import { readonly, ref } from 'vue';

const focusedNoteId = ref(null);

export function useFocusedNote() {
    function selectNote(id) { focusedNoteId.value = id; }
    function clearNote() { focusedNoteId.value = null; }

    return { focusedNoteId: readonly(focusedNoteId), selectNote, clearNote };
}
