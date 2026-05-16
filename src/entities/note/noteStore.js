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
        const newById = new Map(newNotes.map(n => [n.id, n]));
        for (let i = notes.length - 1; i >= 0; i--) {
            if (!newById.has(notes[i].id)) { notes.splice(i, 1); }
        }
        for (const existing of notes) {
            const next = newById.get(existing.id);
            for (const key of Object.keys(existing)) {
                if (!(key in next)) { delete existing[key]; }
            }
            Object.assign(existing, next);
            newById.delete(existing.id);
        }
        for (const note of newById.values()) { notes.push(note); }
    }

    return { notes, addNote, removeNote, replaceNotes, updateNote };
}
