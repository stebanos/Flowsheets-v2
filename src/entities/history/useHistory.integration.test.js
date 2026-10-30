/**
 * Integration tests for useHistory wired to real blockStore / noteStore.
 *
 * Each test re-imports all modules fresh via vi.resetModules() to avoid
 * singleton state leaking between tests.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

let useHistory, useBlockStore, useNoteStore, serializeSheet, deserializeSheet;
let blockModule, noteModule;

beforeEach(async () => {
    vi.resetModules();

    ({ useHistory } = await import('./useHistory'));
    ({ useBlockStore } = await import('@/entities/block'));
    ({ useNoteStore } = await import('@/entities/note'));
    ({ serializeSheet, deserializeSheet } = await import('@/shared/lib/persistence'));

    blockModule = await import('@/entities/block/blockStore');
    noteModule = await import('@/entities/note/noteStore');
});

function setup() {
    const { blocks, replaceBlocks } = useBlockStore();
    const { notes, replaceNotes } = useNoteStore();

    const history = useHistory({
        captureSnapshot: () => serializeSheet(blocks, {}, 'test', { panX: 0, panY: 0 }, notes),
        restoreSnapshot: (snap) => {
            const { blocks: lb, notes: ln } = deserializeSheet(snap);
            replaceBlocks(lb);
            replaceNotes(ln);
        }
    });
    history.setActiveSheet('test-sheet');

    blockModule.setBeforeMutationHook(history.captureIfOpen);
    noteModule.setBeforeMutationHook(history.captureIfOpen);

    // Reset store state suppressed so no history entries are created
    history.suppress(() => {
        blocks.splice(0);
        notes.splice(0);
    });

    return { history, blocks, notes, ...useBlockStore(), ...useNoteStore() };
}

function makeBlock(id, name, code, extra = {}) {
    return {
        id,
        name,
        code,
        x: 0, y: 0,
        width: 150,
        editorHeight: 48,
        outputHeight: 72,
        inputModes: {},
        visualizationType: 'default',
        vizOptions: {},
        editorCollapsed: false,
        ...extra
    };
}

// ── rename block — single undo entry restores all referencing blocks ──────────

describe('rename block', () => {
    test('single group undo restores all referencing blocks code', () => {
        const { history, blocks, addBlock, updateBlock } = setup();

        history.suppress(() => {
            addBlock(makeBlock('1', 'a', '1'));
            addBlock(makeBlock('2', 'b', 'a + 1'));
        });

        // Simulate rename cascade inside a group
        history.beginGroup();
        updateBlock('1', { name: 'x' });
        updateBlock('2', { code: 'x + 1' });
        history.endGroup();

        expect(blocks.find(b => b.id === '1').name).toBe('x');
        expect(blocks.find(b => b.id === '2').code).toBe('x + 1');

        // One undo restores both blocks to pre-rename state
        history.undo();

        expect(blocks.find(b => b.id === '1').name).toBe('a');
        expect(blocks.find(b => b.id === '2').code).toBe('a + 1');
        // No more undos (the group was the only history entry — blocks were suppressed)
        expect(history.canUndo.value).toBe(false);
    });
});

// ── drag — one undo entry per gesture ────────────────────────────────────────

describe('drag', () => {
    test('one undo entry per drag gesture via beginGroup/endGroup', () => {
        const { history, blocks, addBlock, updateBlock } = setup();

        history.suppress(() => { addBlock(makeBlock('1', 'a', '', { x: 0 })); });

        // Simulate drag: many mousemove events between beginGroup/endGroup
        history.beginGroup();
        updateBlock('1', { x: 10 });
        updateBlock('1', { x: 20 });
        updateBlock('1', { x: 30 });
        history.endGroup();

        expect(blocks[0].x).toBe(30);

        // One undo restores to pre-drag position
        history.undo();
        expect(blocks[0].x).toBe(0);
        expect(history.canUndo.value).toBe(false); // single entry
    });
});

// ── code edit — one undo entry per contiguous session ─────────────────────────

describe('code edit', () => {
    test('one undo entry per contiguous editing session via coalescing', () => {
        const { history, blocks, addBlock, updateBlock } = setup();

        history.suppress(() => { addBlock(makeBlock('1', 'a', '1')); });

        // Simulate typing: each keystroke fires updateBlock with same tag
        updateBlock('1', { code: '12' }, 'code:1');
        updateBlock('1', { code: '123' }, 'code:1');
        updateBlock('1', { code: '1234' }, 'code:1');

        expect(blocks[0].code).toBe('1234');

        // One undo restores to original (coalescing collapses all keystrokes)
        history.undo();
        expect(blocks[0].code).toBe('1');
        expect(history.canUndo.value).toBe(false);
    });
});

// ── cut + paste undone individually ──────────────────────────────────────────

describe('cut + paste', () => {
    test('cut and paste are separate undo entries', () => {
        const { history, blocks, addBlock, removeBlock } = setup();

        history.suppress(() => { addBlock(makeBlock('1', 'a', '1')); });

        // Cut = group remove
        history.beginGroup();
        removeBlock('1');
        history.endGroup();

        expect(blocks).toHaveLength(0);

        // Paste = group add
        history.beginGroup();
        addBlock(makeBlock('2', 'b', '2'));
        history.endGroup();

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('b');

        // Undo paste: removes 'b'
        history.undo();
        expect(blocks).toHaveLength(0);

        // Undo cut: restores 'a'
        history.undo();
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('a');
    });
});
