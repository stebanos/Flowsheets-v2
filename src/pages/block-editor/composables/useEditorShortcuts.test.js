import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const blocks = [];
vi.mock('@/entities/block', () => ({ useBlockStore: () => ({ blocks }) }));

const history = { undo: vi.fn(), redo: vi.fn() };
vi.mock('@/entities/history', () => ({ useHistory: () => history }));

const cellWidth = ref(150);
const unitY = ref(24);
vi.mock('@/features/block/grid', () => ({ useCellDimensions: () => ({ cellWidth, unitY }) }));

const clipboard = { copySelected: vi.fn(), cutSelected: vi.fn(), pasteBlocks: vi.fn(), duplicateSelected: vi.fn() };
const deleteBlock = vi.fn();
vi.mock('@/features/block/manage', () => ({
    useBlockClipboard: () => clipboard,
    useDeleteBlock: () => ({ deleteBlock })
}));

const selectedNames = ref(new Set());
const selection = { selectedNames, selectAll: vi.fn(), setSelection: vi.fn(), clearSelection: vi.fn() };
const focusedBlockName = ref(null);
vi.mock('@/features/block/navigate', () => ({
    useBlockSelection: () => selection,
    useFocusedBlock: () => ({ focusedBlockName })
}));

const panX = ref(0);
const panY = ref(0);
vi.mock('@/features/canvas', () => ({ useCanvasPan: () => ({ panX, panY }) }));

const focusedNoteId = ref(null);
vi.mock('@/features/note', () => ({ useFocusedNote: () => ({ focusedNoteId }) }));

const { useEditorShortcuts } = await import('./useEditorShortcuts');

const isListMode = ref(false);
const canvasEl = ref(null);
const canvasMousePos = ref(null);
const connect = { active: ref(false), cancel: vi.fn() };

let shortcuts;
const Host = defineComponent({
    setup() {
        shortcuts = useEditorShortcuts({ isListMode, canvasEl, canvasMousePos, connect });
        return () => h('div');
    }
});

let wrapper;

function key(init) {
    const e = new KeyboardEvent('keydown', { cancelable: true, ...init });
    window.dispatchEvent(e);
    return e;
}

function keyup(init) {
    window.dispatchEvent(new KeyboardEvent('keyup', init));
}

function focusTextarea() {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    el.focus();
    return el;
}

beforeEach(() => {
    blocks.length = 0;
    blocks.push({ name: 'a' }, { name: 'b' }, { name: 'c' });
    selectedNames.value = new Set();
    focusedBlockName.value = null;
    focusedNoteId.value = null;
    isListMode.value = false;
    connect.active.value = false;
    canvasMousePos.value = { x: 7, y: 9 };
    clipboard.cutSelected.mockResolvedValue(true);
    clipboard.pasteBlocks.mockResolvedValue(['pasted']);
    clipboard.duplicateSelected.mockReturnValue(['dup']);
    wrapper = mount(Host);
});

afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = '';
    vi.clearAllMocks();
});

describe('useEditorShortcuts', () => {
    it('Cmd+Z undoes and Cmd+Shift+Z redoes', () => {
        const undo = key({ key: 'z', metaKey: true });
        expect(history.undo).toHaveBeenCalledTimes(1);
        expect(undo.defaultPrevented).toBe(true);
        key({ key: 'Z', metaKey: true, shiftKey: true });
        expect(history.redo).toHaveBeenCalledTimes(1);
        expect(history.undo).toHaveBeenCalledTimes(1);
    });

    it('Ctrl works as the command key', () => {
        key({ key: 'z', ctrlKey: true });
        expect(history.undo).toHaveBeenCalledTimes(1);
    });

    it('ignores keys while focus is in a textarea', () => {
        focusTextarea();
        key({ key: 'z', metaKey: true });
        key({ key: 'a', metaKey: true });
        key({ key: 'Delete' });
        expect(history.undo).not.toHaveBeenCalled();
        expect(selection.selectAll).not.toHaveBeenCalled();
        expect(deleteBlock).not.toHaveBeenCalled();
    });

    it('Esc while connecting cancels the drag even from a textarea', () => {
        focusTextarea();
        connect.active.value = true;
        const e = key({ key: 'Escape' });
        expect(connect.cancel).toHaveBeenCalledTimes(1);
        expect(e.defaultPrevented).toBe(true);
        expect(selection.clearSelection).not.toHaveBeenCalled();
    });

    it('Space from a textarea does not hold pan', () => {
        focusTextarea();
        key({ code: 'Space' });
        expect(shortcuts.isSpaceHeld.value).toBe(false);
    });

    it('in list mode undo still works but canvas shortcuts do nothing', () => {
        isListMode.value = true;
        key({ key: 'z', metaKey: true });
        expect(history.undo).toHaveBeenCalledTimes(1);
        key({ key: 'a', metaKey: true });
        expect(selection.selectAll).not.toHaveBeenCalled();
        key({ code: 'Space' });
        expect(shortcuts.isSpaceHeld.value).toBe(false);
    });

    it('Space sets isSpaceHeld, keyup clears it, repeats are ignored', () => {
        const e = key({ code: 'Space' });
        expect(shortcuts.isSpaceHeld.value).toBe(true);
        expect(e.defaultPrevented).toBe(true);
        const repeat = key({ code: 'Space', repeat: true });
        expect(repeat.defaultPrevented).toBe(false);
        keyup({ code: 'Space' });
        expect(shortcuts.isSpaceHeld.value).toBe(false);
    });

    it('Cmd+A selects all blocks', () => {
        const e = key({ key: 'a', metaKey: true });
        expect(selection.selectAll).toHaveBeenCalledWith(blocks);
        expect(e.defaultPrevented).toBe(true);
    });

    it('Cmd+C copies the selection', () => {
        selectedNames.value = new Set(['a', 'c']);
        key({ key: 'c', metaKey: true });
        expect(clipboard.copySelected).toHaveBeenCalledWith(blocks, ['a', 'c']);
    });

    it('Cmd+X cuts and clears the selection once the cut succeeded', async () => {
        selectedNames.value = new Set(['a']);
        key({ key: 'x', metaKey: true });
        expect(clipboard.cutSelected).toHaveBeenCalledWith(blocks, ['a']);
        await Promise.resolve();
        expect(selection.clearSelection).toHaveBeenCalledTimes(1);
    });

    it('Cmd+X leaves the selection when the cut failed', async () => {
        clipboard.cutSelected.mockResolvedValue(false);
        key({ key: 'x', metaKey: true });
        await Promise.resolve();
        expect(selection.clearSelection).not.toHaveBeenCalled();
    });

    it('Cmd+V pastes at the canvas mouse position and selects the new blocks', async () => {
        const el = {};
        canvasEl.value = el;
        key({ key: 'v', metaKey: true });
        expect(clipboard.pasteBlocks).toHaveBeenCalledWith({ canvasX: 7, canvasY: 9, canvasEl: el, panX, panY });
        await Promise.resolve();
        expect(selection.setSelection).toHaveBeenCalledWith(['pasted']);
    });

    it('Cmd+D duplicates with the cell dimensions and selects the copies', () => {
        selectedNames.value = new Set(['b']);
        const e = key({ key: 'd', metaKey: true });
        expect(clipboard.duplicateSelected).toHaveBeenCalledWith(blocks, ['b'], { cellWidth, unitY });
        expect(selection.setSelection).toHaveBeenCalledWith(['dup']);
        expect(e.defaultPrevented).toBe(true);
    });

    it('Esc clears the selection only when no block is focused', () => {
        focusedBlockName.value = 'a';
        key({ key: 'Escape' });
        expect(selection.clearSelection).not.toHaveBeenCalled();
        focusedBlockName.value = null;
        key({ key: 'Escape' });
        expect(selection.clearSelection).toHaveBeenCalledTimes(1);
    });

    it('Delete with a focused block or note does nothing', () => {
        selectedNames.value = new Set(['a']);
        focusedBlockName.value = 'a';
        key({ key: 'Delete' });
        focusedBlockName.value = null;
        focusedNoteId.value = 'n1';
        key({ key: 'Backspace' });
        expect(deleteBlock).not.toHaveBeenCalled();
        expect(selection.clearSelection).not.toHaveBeenCalled();
    });

    it('Delete with nothing focused deletes the selected blocks and clears the selection', () => {
        selectedNames.value = new Set(['a', 'c']);
        key({ key: 'Delete' });
        expect(selection.clearSelection).toHaveBeenCalledTimes(1);
        expect(deleteBlock.mock.calls.map(([b]) => b.name)).toEqual(['a', 'c']);
    });

    it('Delete with an empty selection does nothing', () => {
        key({ key: 'Backspace' });
        expect(deleteBlock).not.toHaveBeenCalled();
        expect(selection.clearSelection).not.toHaveBeenCalled();
    });

    it('unmount removes the listeners', () => {
        wrapper.unmount();
        key({ key: 'z', metaKey: true });
        key({ code: 'Space' });
        expect(history.undo).not.toHaveBeenCalled();
        expect(shortcuts.isSpaceHeld.value).toBe(false);
        wrapper = mount(Host);
    });
});
