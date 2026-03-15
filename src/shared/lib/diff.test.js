import { describe, test, expect } from 'vitest';
import { diffLines, diffChars } from './diff';

// ---------------------------------------------------------------------------
// diffChars
// ---------------------------------------------------------------------------

describe('diffChars — identical strings', () => {
    test('returns a single eq span with the full text', () => {
        const spans = diffChars('hello', 'hello');
        expect(spans).toEqual([{ type: 'eq', text: 'h' }, { type: 'eq', text: 'e' }, { type: 'eq', text: 'l' }, { type: 'eq', text: 'l' }, { type: 'eq', text: 'o' }]);
        // Every span must be eq — nothing deleted or added
        expect(spans.every(s => s.type === 'eq')).toBe(true);
    });
});

describe('diffChars — completely different strings', () => {
    test('returns a del span followed by an add span', () => {
        const spans = diffChars('abc', 'xyz');
        const types = spans.map(s => s.type);
        expect(types).toContain('del');
        expect(types).toContain('add');
        expect(types).not.toContain('eq');
        const delText = spans.filter(s => s.type === 'del').map(s => s.text).join('');
        const addText = spans.filter(s => s.type === 'add').map(s => s.text).join('');
        expect(delText).toBe('abc');
        expect(addText).toBe('xyz');
    });
});

describe('diffChars — prefix match', () => {
    test("'abc' vs 'abx' → eq 'ab', del 'c', add 'x'", () => {
        const spans = diffChars('abc', 'abx');
        const eqText = spans.filter(s => s.type === 'eq').map(s => s.text).join('');
        const delText = spans.filter(s => s.type === 'del').map(s => s.text).join('');
        const addText = spans.filter(s => s.type === 'add').map(s => s.text).join('');
        expect(eqText).toBe('ab');
        expect(delText).toBe('c');
        expect(addText).toBe('x');
    });
});

describe('diffChars — empty strings', () => {
    test('two empty strings → empty spans array', () => {
        expect(diffChars('', '')).toEqual([]);
    });

    test('empty old string → single add span', () => {
        const spans = diffChars('', 'hello');
        expect(spans).toEqual([{ type: 'add', text: 'hello' }]);
    });

    test('empty new string → single del span', () => {
        const spans = diffChars('hello', '');
        expect(spans).toEqual([{ type: 'del', text: 'hello' }]);
    });
});

describe('diffChars — long string fallback', () => {
    test('strings totaling > 2000 chars that are equal → single eq span', () => {
        const s = 'x'.repeat(1001);
        const spans = diffChars(s, s);
        expect(spans).toEqual([{ type: 'eq', text: s }]);
    });

    test('strings totaling > 2000 chars that differ → del + add spans', () => {
        const a = 'a'.repeat(1001);
        const b = 'b'.repeat(1001);
        const spans = diffChars(a, b);
        expect(spans).toEqual([{ type: 'del', text: a }, { type: 'add', text: b }]);
    });
});

// ---------------------------------------------------------------------------
// diffLines
// ---------------------------------------------------------------------------

describe('diffLines — identical strings', () => {
    test('single-line identical → one eq row', () => {
        const rows = diffLines('hello', 'hello');
        expect(rows).toEqual([{ type: 'eq', text: 'hello', spans: null }]);
    });

    test('multi-line identical → all eq rows', () => {
        const rows = diffLines('a\nb\nc', 'a\nb\nc');
        expect(rows.every(r => r.type === 'eq')).toBe(true);
        expect(rows.map(r => r.text)).toEqual(['a', 'b', 'c']);
    });
});

describe('diffLines — additions only', () => {
    test('newStr has extra lines → add rows with spans: null', () => {
        const rows = diffLines('a', 'a\nb\nc');
        const addRows = rows.filter(r => r.type === 'add');
        expect(addRows).toHaveLength(2);
        expect(addRows.map(r => r.text)).toEqual(['b', 'c']);
        addRows.forEach(r => expect(r.spans).toBeNull());
    });
});

describe('diffLines — deletions only', () => {
    test('oldStr has extra lines → del rows with spans: null', () => {
        const rows = diffLines('a\nb\nc', 'a');
        const delRows = rows.filter(r => r.type === 'del');
        expect(delRows).toHaveLength(2);
        expect(delRows.map(r => r.text)).toEqual(['b', 'c']);
        delRows.forEach(r => expect(r.spans).toBeNull());
    });
});

describe('diffLines — changed lines (adjacent del+add pairs)', () => {
    test('single changed line → one del row and one add row, both with non-null spans', () => {
        const rows = diffLines('hello world', 'hello earth');
        const delRow = rows.find(r => r.type === 'del');
        const addRow = rows.find(r => r.type === 'add');
        expect(delRow).toBeTruthy();
        expect(addRow).toBeTruthy();
        expect(delRow.spans).not.toBeNull();
        expect(addRow.spans).not.toBeNull();
    });

    test('del row spans contain no add-type entries', () => {
        const rows = diffLines('hello world', 'hello earth');
        const delRow = rows.find(r => r.type === 'del');
        delRow.spans.forEach(s => expect(s.type).not.toBe('add'));
    });

    test('add row spans contain no del-type entries', () => {
        const rows = diffLines('hello world', 'hello earth');
        const addRow = rows.find(r => r.type === 'add');
        addRow.spans.forEach(s => expect(s.type).not.toBe('del'));
    });

    test('spans reconstruct the original line text', () => {
        const rows = diffLines('hello world', 'hello earth');
        const delRow = rows.find(r => r.type === 'del');
        const addRow = rows.find(r => r.type === 'add');
        const delReconstructed = delRow.spans.map(s => s.text).join('');
        const addReconstructed = addRow.spans.map(s => s.text).join('');
        expect(delReconstructed).toBe('hello world');
        expect(addReconstructed).toBe('hello earth');
    });
});

describe('diffLines — unequal del/add counts (no char-level pairing)', () => {
    test('3 old lines vs 1 new line: all dels then all adds, all spans: null', () => {
        const rows = diffLines('line1\nline2\nline3', 'lineA');
        const delRows = rows.filter(r => r.type === 'del');
        const addRows = rows.filter(r => r.type === 'add');
        expect(delRows).toHaveLength(3);
        expect(addRows).toHaveLength(1);
        // Unequal counts → no character-level diff, all spans null
        delRows.forEach(r => expect(r.spans).toBeNull());
        addRows.forEach(r => expect(r.spans).toBeNull());
        // All dels come before all adds in the output
        const delIndices = rows.map((r, i) => r.type === 'del' ? i : -1).filter(i => i >= 0);
        const addIndices = rows.map((r, i) => r.type === 'add' ? i : -1).filter(i => i >= 0);
        expect(Math.max(...delIndices)).toBeLessThan(Math.min(...addIndices));
    });

    test('1 old line vs 3 new lines: all dels before all adds, all spans: null', () => {
        const rows = diffLines('lineA', 'line1\nline2\nline3');
        const delRows = rows.filter(r => r.type === 'del');
        const addRows = rows.filter(r => r.type === 'add');
        expect(delRows).toHaveLength(1);
        expect(addRows).toHaveLength(3);
        delRows.forEach(r => expect(r.spans).toBeNull());
        addRows.forEach(r => expect(r.spans).toBeNull());
        const delIndices = rows.map((r, i) => r.type === 'del' ? i : -1).filter(i => i >= 0);
        const addIndices = rows.map((r, i) => r.type === 'add' ? i : -1).filter(i => i >= 0);
        expect(Math.max(...delIndices)).toBeLessThan(Math.min(...addIndices));
    });
});

describe('diffLines — empty strings', () => {
    test('both empty → single eq row with empty text', () => {
        const rows = diffLines('', '');
        expect(rows).toEqual([{ type: 'eq', text: '', spans: null }]);
    });

    test('empty old, non-empty new (2 lines) → 1 del and 2 adds, all spans: null (unequal counts)', () => {
        // ''.split('\n') yields [''], so there is 1 del and 2 adds — unequal, no char-level pairing.
        const rows = diffLines('', 'a\nb');
        const delRows = rows.filter(r => r.type === 'del');
        const addRows = rows.filter(r => r.type === 'add');
        expect(delRows).toHaveLength(1);
        expect(delRows[0].text).toBe('');
        expect(delRows[0].spans).toBeNull();
        expect(addRows).toHaveLength(2);
        expect(addRows.map(r => r.text)).toEqual(['a', 'b']);
        addRows.forEach(r => expect(r.spans).toBeNull());
    });

    test('non-empty old (2 lines), empty new → 2 dels and 1 add, all spans: null (unequal counts)', () => {
        // ''.split('\n') yields [''], so there is 1 add and 2 dels — unequal, no char-level pairing.
        const rows = diffLines('a\nb', '');
        const delRows = rows.filter(r => r.type === 'del');
        const addRows = rows.filter(r => r.type === 'add');
        expect(delRows).toHaveLength(2);
        expect(delRows.map(r => r.text)).toEqual(['a', 'b']);
        delRows.forEach(r => expect(r.spans).toBeNull());
        expect(addRows).toHaveLength(1);
        expect(addRows[0].text).toBe('');
        expect(addRows[0].spans).toBeNull();
    });
});

describe('diffLines — row structure', () => {
    test('every row has type, text, and spans properties', () => {
        const rows = diffLines('a\nb', 'a\nc');
        rows.forEach(r => {
            expect(r).toHaveProperty('type');
            expect(r).toHaveProperty('text');
            expect(r).toHaveProperty('spans');
        });
    });

    test('eq rows always have spans: null', () => {
        const rows = diffLines('a\nb\nc', 'a\nx\nc');
        rows.filter(r => r.type === 'eq').forEach(r => expect(r.spans).toBeNull());
    });
});
