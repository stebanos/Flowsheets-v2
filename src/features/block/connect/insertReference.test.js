import { describe, expect, it } from 'vitest';
import { insertReference } from './insertReference';

describe('insertReference', () => {
    describe('empty code', () => {
        it('sets empty code to the name', () => {
            expect(insertReference('', 'a', 0)).toEqual({ code: 'a', cursor: 1 });
        });

        it('replaces whitespace-only code with the name', () => {
            expect(insertReference('  \n\t', 'total', 2)).toEqual({ code: 'total', cursor: 5 });
        });

        it('sets empty code to the name when the cursor is unknown', () => {
            expect(insertReference('', 'a', null)).toEqual({ code: 'a', cursor: 1 });
        });
    });

    describe('word-boundary padding', () => {
        it('pads both sides when inserted mid-word', () => {
            expect(insertReference('xy', 'a', 1)).toEqual({ code: 'x a y', cursor: 3 });
        });

        it('pads the left side when the preceding char is a word char', () => {
            expect(insertReference('x+', 'a', 1)).toEqual({ code: 'x a+', cursor: 3 });
        });

        it('pads the right side when the following char is a word char', () => {
            expect(insertReference('+x', 'a', 1)).toEqual({ code: '+a x', cursor: 2 });
        });

        it('adds no padding next to operators', () => {
            expect(insertReference('1 + ', 'a', 4)).toEqual({ code: '1 + a', cursor: 5 });
        });

        it('adds no padding next to existing spaces', () => {
            expect(insertReference('x  y', 'a', 2)).toEqual({ code: 'x a y', cursor: 3 });
        });

        it('treats $ and _ as word chars', () => {
            expect(insertReference('$_', 'a', 1)).toEqual({ code: '$ a _', cursor: 3 });
        });

        it('treats digits as word chars', () => {
            expect(insertReference('12', 'a', 1)).toEqual({ code: '1 a 2', cursor: 3 });
        });
    });

    describe('document edges', () => {
        it('inserts at the start of the document', () => {
            expect(insertReference('x', 'a', 0)).toEqual({ code: 'a x', cursor: 1 });
        });

        it('inserts at the end of the document', () => {
            expect(insertReference('x', 'a', 1)).toEqual({ code: 'x a', cursor: 3 });
        });

        it('inserts at the start without padding before an operator', () => {
            expect(insertReference('(1)', 'a', 0)).toEqual({ code: 'a(1)', cursor: 1 });
        });
    });

    describe('unknown cursor (unfocused editor)', () => {
        it('inserts at the end of the document when cursor is null', () => {
            expect(insertReference('x + ', 'a', null)).toEqual({ code: 'x + a', cursor: 5 });
        });

        it('inserts at the end of the document when cursor is undefined', () => {
            expect(insertReference('x', 'a')).toEqual({ code: 'x a', cursor: 3 });
        });
    });

    describe('out-of-range cursor', () => {
        it('clamps a cursor past the end to the end of the document', () => {
            expect(insertReference('x', 'a', 99)).toEqual({ code: 'x a', cursor: 3 });
        });

        it('clamps a negative cursor to the start of the document', () => {
            expect(insertReference('x', 'a', -3)).toEqual({ code: 'a x', cursor: 1 });
        });
    });
});
