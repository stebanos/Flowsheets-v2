import { reactive } from 'vue';

const notes = reactive([]);

let _beforeMutation = null;

export function setBeforeMutationHook(fn) {
    _beforeMutation = fn;
}

export function useNoteStore() {
    function addNote(note, tag) {
        _beforeMutation?.(tag ?? null);
        notes.push(note);
    }

    function removeNote(id, tag) {
        const idx = notes.findIndex(n => n.id === id);
        if (idx !== -1) {
            _beforeMutation?.(tag ?? null);
            notes.splice(idx, 1);
        }
    }

    function updateNote(id, patch, tag) {
        const note = notes.find(n => n.id === id);
        if (note) {
            _beforeMutation?.(tag ?? null);
            Object.assign(note, patch);
        }
    }

    function replaceNotes(newNotes, tag) {
        _beforeMutation?.(tag ?? null);
        notes.splice(0, notes.length);
        for (const note of newNotes) { notes.push(note); }
    }

    return { notes, addNote, removeNote, replaceNotes, updateNote };
}
