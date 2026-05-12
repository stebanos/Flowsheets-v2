import { reactive } from 'vue';

const notes = reactive([]);

export function useNoteStore() {
    function addNote(note) { notes.push(note); }

    function removeNote(id) {
        const idx = notes.findIndex(n => n.id === id);
        if (idx !== -1) { notes.splice(idx, 1); }
    }

    function updateNote(id, patch) {
        const note = notes.find(n => n.id === id);
        if (note) { Object.assign(note, patch); }
    }

    function replaceNotes(newNotes) {
        notes.splice(0, notes.length);
        for (const note of newNotes) { notes.push(note); }
    }

    return { notes, addNote, removeNote, replaceNotes, updateNote };
}
