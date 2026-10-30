import { describe, expect, test } from 'vitest';
import { createNote, NOTE_DEFAULTS } from './noteDefaults';

describe('createNote', () => {
    test('fills in defaults when called without arguments', () => {
        const note = createNote();
        expect(note).toEqual({
            id: expect.any(String),
            x: 0,
            y: 0,
            width: NOTE_DEFAULTS.width,
            height: NOTE_DEFAULTS.height,
            title: '',
            body: ''
        });
    });

    test('overrides win over defaults', () => {
        const note = createNote({ id: 'n1', x: 10, y: 20, width: 300, title: 'T', body: 'B' });
        expect(note).toEqual({ id: 'n1', x: 10, y: 20, width: 300, height: NOTE_DEFAULTS.height, title: 'T', body: 'B' });
    });

    test('each call gets a fresh id', () => {
        expect(createNote().id).not.toBe(createNote().id);
    });
});
