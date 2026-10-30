import { onMounted, onUnmounted, ref } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useHistory } from '@/entities/history';
import { useCellDimensions } from '@/features/block/grid';
import { useBlockClipboard, useDeleteBlock } from '@/features/block/manage';
import { useBlockSelection, useFocusedBlock } from '@/features/block/navigate';
import { useCanvasPan } from '@/features/canvas';
import { useFocusedNote } from '@/features/note';

/**
 * Window-level keyboard shortcuts for the editor: undo/redo, Esc cancels a connect drag,
 * Space holds pan, Cmd+A/C/X/V/D, Esc clears the selection, Delete/Backspace deletes it.
 * Spans several feature slices, which is why it lives with the page rather than in a feature.
 */
export function useEditorShortcuts({ isListMode, canvasEl, canvasMousePos, connect }) {
    const { blocks } = useBlockStore();
    const history = useHistory();
    const { cellWidth, unitY } = useCellDimensions();
    const { copySelected, cutSelected, pasteBlocks, duplicateSelected } = useBlockClipboard();
    const { deleteBlock } = useDeleteBlock();
    const { selectedNames, selectAll, setSelection, clearSelection } = useBlockSelection();
    const { focusedBlockName } = useFocusedBlock();
    const { focusedNoteId } = useFocusedNote();
    const { panX, panY } = useCanvasPan();

    const isSpaceHeld = ref(false);

    function _onKeydown(e) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const inInput = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;

        // above the inInput return: focus may still sit in a (contentEditable) CodeMirror editor mid-drag
        if (e.key === 'Escape' && connect.active.value) { connect.cancel(); e.preventDefault(); return; }

        if (e.code !== 'Space' && inInput) { return; }

        const cmd = e.metaKey || e.ctrlKey;

        if (cmd && e.shiftKey && e.key === 'Z') { history.redo(); e.preventDefault(); return; }
        if (cmd && !e.shiftKey && e.key === 'z') { history.undo(); e.preventDefault(); return; }

        // everything below is canvas-scoped: in list mode the selection and canvas are not on screen
        if (isListMode.value) { return; }

        if (e.code === 'Space') {
            if (e.repeat || inInput) { return; }
            isSpaceHeld.value = true;
            e.preventDefault();
            return;
        }

        if (cmd && e.key === 'a') { selectAll(blocks); e.preventDefault(); return; }
        if (cmd && e.key === 'c') { copySelected(blocks, [...selectedNames.value]); return; }
        if (cmd && e.key === 'x') {
            cutSelected(blocks, [...selectedNames.value]).then(ok => { if (ok) { clearSelection(); } });
            return;
        }
        if (cmd && e.key === 'v') {
            pasteBlocks({ canvasX: canvasMousePos.value?.x, canvasY: canvasMousePos.value?.y, canvasEl: canvasEl.value, panX, panY })
                .then(newNames => { if (newNames) { setSelection(newNames); } });
            return;
        }
        if (cmd && e.key === 'd') {
            const newNames = duplicateSelected(blocks, [...selectedNames.value], { cellWidth, unitY });
            if (newNames) { setSelection(newNames); }
            e.preventDefault();
            return;
        }
        if (e.key === 'Escape' && focusedBlockName.value === null) { clearSelection(); return; }
        if ((e.key === 'Delete' || e.key === 'Backspace') && focusedBlockName.value === null && focusedNoteId.value === null && selectedNames.value.size > 0) {
            const toDelete = blocks.filter(b => selectedNames.value.has(b.name));
            clearSelection();
            for (const b of toDelete) { deleteBlock(b); }
        }
    }

    function _onKeyup(e) {
        if (e.code === 'Space') { isSpaceHeld.value = false; }
    }

    onMounted(() => {
        window.addEventListener('keydown', _onKeydown);
        window.addEventListener('keyup', _onKeyup);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', _onKeydown);
        window.removeEventListener('keyup', _onKeyup);
    });

    return { isSpaceHeld };
}
