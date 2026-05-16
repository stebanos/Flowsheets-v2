import { beforeEach, describe, expect, test } from 'vitest';
import { useNoteStore } from './noteStore';

const { notes, addNote, replaceNotes } = useNoteStore();

beforeEach(() => {
    notes.splice(0);
});

describe('replaceNotes', () => {
    test('replaces all notes with the new set', () => {
        addNote({ id: '1', body: 'a' });
        addNote({ id: '2', body: 'b' });
        replaceNotes([{ id: '3', body: 'c' }]);
        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe('3');
    });

    test('clears all notes when called with an empty array', () => {
        addNote({ id: '1', body: 'a' });
        replaceNotes([]);
        expect(notes).toHaveLength(0);
    });

    test('updates existing note in-place, preserving object reference', () => {
        addNote({ id: '1', body: 'before' });
        const ref = notes[0];
        replaceNotes([{ id: '1', body: 'after' }]);
        expect(notes[0]).toBe(ref);
        expect(ref.body).toBe('after');
    });
});
