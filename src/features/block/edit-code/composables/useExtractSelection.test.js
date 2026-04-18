import { ref, nextTick } from 'vue';
import { describe, test, expect, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useExtractSelection } from './useExtractSelection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a useExtractSelection instance wired to a real CM6 EditorView.
 *
 * IMPORTANT: `updateListenerExtension` must be in the EditorState extensions
 * (not the EditorView constructor's `extensions` option) to fire on dispatch
 * in a jsdom environment. The composable is therefore called first to get the
 * extension, then a state carrying it is created, then the view is built.
 *
 * The editorView ref is assigned before the initial selection dispatch so the
 * listener can call `view.state.sliceDoc` when checking the char before the
 * selection start.
 */
function makeComposable(doc, selFrom, selTo, onExtract = null) {
    const editorView = ref(null);
    const composable = useExtractSelection(editorView, onExtract);

    const state = EditorState.create({
        doc,
        selection: { anchor: selFrom, head: selTo },
        extensions: [composable.updateListenerExtension]
    });

    const view = new EditorView({
        state,
        parent: document.createElement('div')
    });

    // Point the ref at the view before the first dispatch so the listener can
    // use view.state.sliceDoc when inspecting the char before the selection.
    editorView.value = view;

    // Trigger the update listener for the initial selection by dispatching a
    // no-op that sets the same selection (CM6 still fires the listener).
    view.dispatch({ selection: { anchor: selFrom, head: selTo } });

    return { composable, view, editorView };
}

// ---------------------------------------------------------------------------
// isValidExpression (tested indirectly via selectionInvalidReason)
// ---------------------------------------------------------------------------

describe('selectionInvalidReason — expression validity', () => {
    test('empty selection → no reason (null)', () => {
        const { composable } = makeComposable('hello world', 0, 0);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('valid expression "1 + 2" → no reason', () => {
        const { composable } = makeComposable('1 + 2', 0, 5);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('valid identifier expression "myVar" → no reason', () => {
        const { composable } = makeComposable('myVar', 0, 5);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('invalid expression "n >" → "Not a valid JS expression"', () => {
        const { composable } = makeComposable('n >', 0, 3);
        expect(composable.selectionInvalidReason.value).toBe('Not a valid JS expression');
    });

    test('incomplete function call "foo(" → "Not a valid JS expression"', () => {
        const { composable } = makeComposable('foo(', 0, 4);
        expect(composable.selectionInvalidReason.value).toBe('Not a valid JS expression');
    });

    test('valid complex expression "a.b + c * 2" → no reason', () => {
        const { composable } = makeComposable('a.b + c * 2', 0, 11);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('whitespace-only selection → "Not a valid JS expression"', () => {
        // isValidExpression trims text; empty after trim returns false
        const { composable } = makeComposable('   ', 0, 3);
        expect(composable.selectionInvalidReason.value).toBe('Not a valid JS expression');
    });
});

// ---------------------------------------------------------------------------
// selectionInvalidReason — context checks (char before selection)
// ---------------------------------------------------------------------------

describe('selectionInvalidReason — context: char before selection', () => {
    test('char before selection is "." → property name message', () => {
        // "obj.foo" — select "foo" starting at index 4; charBefore is '.'
        const { composable } = makeComposable('obj.foo', 4, 7);
        expect(composable.selectionInvalidReason.value).toBe(
            'Property names cannot be extracted — select the full expression including the object'
        );
    });

    test('char before selection is a word char (mid-identifier) → mid-identifier message', () => {
        // "length" — select "ength" starting at index 1; charBefore is 'l'
        const { composable } = makeComposable('length', 1, 6);
        expect(composable.selectionInvalidReason.value).toBe(
            'Selection starts inside an identifier — expand the selection to include the full word'
        );
    });

    test('char before selection is "_" (word char) → mid-identifier message', () => {
        // "_private" — select "private" starting at index 1; charBefore is '_'
        const { composable } = makeComposable('_private', 1, 8);
        expect(composable.selectionInvalidReason.value).toBe(
            'Selection starts inside an identifier — expand the selection to include the full word'
        );
    });

    test('char before selection is "$" (word char) → mid-identifier message', () => {
        const { composable } = makeComposable('$var', 1, 4);
        expect(composable.selectionInvalidReason.value).toBe(
            'Selection starts inside an identifier — expand the selection to include the full word'
        );
    });

    test('char before selection is "(" → falls through to expression check, valid expr → null', () => {
        // "foo(bar + 1)" — select "bar + 1" at [4, 11]; charBefore is '('
        const { composable } = makeComposable('foo(bar + 1)', 4, 11);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('char before selection is a space → falls through to expression check', () => {
        // "x + y" — select "y" at [4, 5]; charBefore is ' '
        const { composable } = makeComposable('x + y', 4, 5);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('selection starts at index 0 → context check skipped (guard is > 0), valid expr → null', () => {
        const { composable } = makeComposable('myExpr', 0, 6);
        expect(composable.selectionInvalidReason.value).toBeNull();
    });

    test('char before selection is "." — dot check wins even if selected text would also be invalid', () => {
        // "obj.>" — select ">" at [4, 5]; charBefore is '.', selected ">" is invalid JS
        const { composable } = makeComposable('obj.>', 4, 5);
        expect(composable.selectionInvalidReason.value).toBe(
            'Property names cannot be extracted — select the full expression including the object'
        );
    });
});

// ---------------------------------------------------------------------------
// extractSelection
// ---------------------------------------------------------------------------

describe('extractSelection', () => {
    test('does nothing when onExtract is null', () => {
        const { composable, view } = makeComposable('1 + 2', 0, 5, null);
        expect(composable.selectionIsValid.value).toBe(true);
        composable.extractSelection();
        expect(view.state.doc.toString()).toBe('1 + 2');
    });

    test('does nothing when there is no selection (cursor only)', () => {
        const onExtract = vi.fn().mockReturnValue('newBlock');
        const { composable, view } = makeComposable('1 + 2', 0, 0, onExtract);
        composable.extractSelection();
        expect(onExtract).not.toHaveBeenCalled();
        expect(view.state.doc.toString()).toBe('1 + 2');
    });

    test('does nothing when the selection is an invalid expression', () => {
        const onExtract = vi.fn().mockReturnValue('newBlock');
        const { composable, view } = makeComposable('n >', 0, 3, onExtract);
        expect(composable.selectionIsValid.value).toBe(false);
        composable.extractSelection();
        expect(onExtract).not.toHaveBeenCalled();
        expect(view.state.doc.toString()).toBe('n >');
    });

    test('does nothing when char before selection makes it invalid (dot check)', () => {
        const onExtract = vi.fn().mockReturnValue('newBlock');
        // "obj.foo" — select "foo"; dot before makes it invalid
        const { composable, view } = makeComposable('obj.foo', 4, 7, onExtract);
        expect(composable.selectionIsValid.value).toBe(false);
        composable.extractSelection();
        expect(onExtract).not.toHaveBeenCalled();
        expect(view.state.doc.toString()).toBe('obj.foo');
    });

    test('calls onExtract with the selected text when selection is valid', () => {
        const onExtract = vi.fn().mockReturnValue('extracted');
        const { composable } = makeComposable('1 + 2', 0, 5, onExtract);
        composable.extractSelection();
        expect(onExtract).toHaveBeenCalledWith('1 + 2');
    });

    test('replaces the selection with the new block name returned by onExtract', () => {
        const onExtract = vi.fn().mockReturnValue('myBlock');
        const { composable, view } = makeComposable('1 + 2', 0, 5, onExtract);
        composable.extractSelection();
        expect(view.state.doc.toString()).toBe('myBlock');
    });

    test('replaces only the selected range, leaving surrounding text intact', () => {
        const onExtract = vi.fn().mockReturnValue('extracted');
        // "x + (1 + 2) * 3" — select "1 + 2" at [5, 10]
        const { composable, view } = makeComposable('x + (1 + 2) * 3', 5, 10, onExtract);
        composable.extractSelection();
        expect(view.state.doc.toString()).toBe('x + (extracted) * 3');
    });

    test('positions cursor at end of the inserted name after dispatch', () => {
        const onExtract = vi.fn().mockReturnValue('myBlock');
        const { composable, view } = makeComposable('1 + 2', 0, 5, onExtract);
        composable.extractSelection();
        const cursor = view.state.selection.main;
        expect(cursor.from).toBe('myBlock'.length);
        expect(cursor.to).toBe('myBlock'.length);
    });

    test('does nothing when onExtract returns an empty string', () => {
        const onExtract = vi.fn().mockReturnValue('');
        const { composable, view } = makeComposable('1 + 2', 0, 5, onExtract);
        composable.extractSelection();
        expect(onExtract).toHaveBeenCalledWith('1 + 2');
        // dispatch is guarded by `if (!newBlockName)`, so doc is unchanged
        expect(view.state.doc.toString()).toBe('1 + 2');
    });

    test('does nothing when onExtract returns null', () => {
        const onExtract = vi.fn().mockReturnValue(null);
        const { composable, view } = makeComposable('1 + 2', 0, 5, onExtract);
        composable.extractSelection();
        expect(view.state.doc.toString()).toBe('1 + 2');
    });
});

// ---------------------------------------------------------------------------
// Derived state: hasSelection and selectionIsValid
// ---------------------------------------------------------------------------

describe('derived state', () => {
    test('hasSelection is false when no selection (cursor only)', () => {
        const { composable } = makeComposable('hello', 0, 0);
        expect(composable.hasSelection.value).toBe(false);
    });

    test('hasSelection is true when a range is selected', () => {
        const { composable } = makeComposable('hello', 0, 5);
        expect(composable.hasSelection.value).toBe(true);
    });

    test('selectionIsValid is true for a valid expression with no context issues', () => {
        const { composable } = makeComposable('a + b', 0, 5);
        expect(composable.selectionIsValid.value).toBe(true);
    });

    test('selectionIsValid is false for an invalid expression', () => {
        const { composable } = makeComposable('n >', 0, 3);
        expect(composable.selectionIsValid.value).toBe(false);
    });

    test('selectionIsValid is false when char before selection is "."', () => {
        const { composable } = makeComposable('obj.foo', 4, 7);
        expect(composable.selectionIsValid.value).toBe(false);
    });

    test('selectionText reflects the selected slice of the document', () => {
        const { composable } = makeComposable('hello world', 6, 11);
        expect(composable.selectionText.value).toBe('world');
    });

    test('selectionText is empty when no selection', () => {
        const { composable } = makeComposable('hello', 3, 3);
        expect(composable.selectionText.value).toBe('');
    });
});

// ---------------------------------------------------------------------------
// updateListenerExtension — integration: listener drives reactive state
// ---------------------------------------------------------------------------

describe('updateListenerExtension', () => {
    test('selectionText updates reactively when selection changes via dispatch', async () => {
        const { composable, view } = makeComposable('hello world', 0, 0);
        expect(composable.selectionText.value).toBe('');

        view.dispatch({ selection: { anchor: 0, head: 5 } });
        await nextTick();
        expect(composable.selectionText.value).toBe('hello');
    });

    test('selectionText clears when selection collapses to a cursor', async () => {
        const { composable, view } = makeComposable('hello world', 0, 5);
        expect(composable.selectionText.value).toBe('hello');

        view.dispatch({ selection: { anchor: 3, head: 3 } });
        await nextTick();
        expect(composable.selectionText.value).toBe('');
    });

    test('selectionText updates when a doc change is dispatched along with a selection', async () => {
        const { composable, view } = makeComposable('abc', 0, 3);
        expect(composable.selectionText.value).toBe('abc');

        view.dispatch({
            changes: { from: 0, to: 3, insert: 'xyz' },
            selection: { anchor: 0, head: 3 }
        });
        await nextTick();
        expect(composable.selectionText.value).toBe('xyz');
    });

    test('selectionInvalidReason updates reactively when selection moves to a dot-preceded position', async () => {
        // Start with a selection of the full expression; no reason yet
        const { composable, view } = makeComposable('obj.foo', 0, 7);
        expect(composable.selectionInvalidReason.value).toBeNull();

        // Now move to select only "foo" — charBefore becomes '.'
        view.dispatch({ selection: { anchor: 4, head: 7 } });
        await nextTick();
        expect(composable.selectionInvalidReason.value).toBe(
            'Property names cannot be extracted — select the full expression including the object'
        );
    });

    test('selectionText does not update on transactions that are neither selectionSet nor docChanged', async () => {
        // Dispatch a user-event annotation with no selection or doc change;
        // the guard `if (!update.selectionSet && !update.docChanged) return` should skip it.
        const { composable, view } = makeComposable('hello', 0, 5);
        const textBefore = composable.selectionText.value;

        // Dispatch a no-op (no changes, no selection spec) — CM6 creates a
        // transaction with no changes and keeps the existing selection.
        view.dispatch({ effects: [] });
        await nextTick();
        // selectionText should be unchanged because no selectionSet and no docChanged
        expect(composable.selectionText.value).toBe(textBefore);
    });
});
