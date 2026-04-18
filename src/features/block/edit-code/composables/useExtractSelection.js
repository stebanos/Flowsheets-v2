import { ref, computed } from 'vue';
import { EditorView } from '@codemirror/view';
import { parseExpressionAt } from 'acorn';

function isValidExpression(text) {
    if (!text || !text.trim()) { return false; }
    try {
        parseExpressionAt(text.trim(), 0, { ecmaVersion: 'latest' });
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {import('vue').ComputedRef} editorView - ref to the CM6 EditorView
 * @param {Function|null} onExtract - called with (selectedText, charAfter); must return the new block name
 */
export function useExtractSelection(editorView, onExtract) {
    const selectionText = ref('');
    const selectionFrom = ref(0);

    const hasSelection = computed(() => selectionText.value.length > 0);

    const selectionInvalidReason = computed(() => {
        if (!selectionText.value) { return null; }
        const view = editorView.value;
        if (view && selectionFrom.value > 0) {
            const charBefore = view.state.sliceDoc(selectionFrom.value - 1, selectionFrom.value);
            if (charBefore === '.') { return 'Property names cannot be extracted — select the full expression including the object'; }
            if (/[a-zA-Z0-9_$]/.test(charBefore)) { return 'Selection starts inside an identifier — expand the selection to include the full word'; }
        }
        if (!isValidExpression(selectionText.value)) { return 'Not a valid JS expression'; }
        return null;
    });

    const selectionIsValid = computed(() => selectionInvalidReason.value === null);

    const updateListenerExtension = EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) { return; }
        const state = update.state;
        const { from, to } = state.selection.main;
        selectionFrom.value = from;
        selectionText.value = from === to ? '' : state.sliceDoc(from, to);
    });

    function extractSelection() {
        if (!onExtract || !hasSelection.value || !selectionIsValid.value) { return; }
        const view = editorView.value;
        if (!view) { return; }

        const { from, to } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        const newBlockName = onExtract(text);
        if (!newBlockName) { return; }

        view.dispatch({
            changes: { from, to, insert: newBlockName },
            selection: { anchor: from + newBlockName.length }
        });
    }

    return {
        hasSelection,
        selectionIsValid,
        selectionInvalidReason,
        selectionText,
        extractSelection,
        updateListenerExtension
    };
}
