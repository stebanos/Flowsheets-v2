import { beforeEach, describe, expect, test, vi } from 'vitest';

// useHistory is a module-level singleton. We reset it by re-importing on each test.
let useHistory;

beforeEach(async () => {
    vi.resetModules();
    ({ useHistory } = await import('./useHistory'));
});

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(data = {}) {
    return { blocks: [], notes: [], view: { panX: 0, panY: 0 }, ...data };
}

// ── basic push / canUndo / canRedo ────────────────────────────────────────────

describe('push → canUndo / canRedo', () => {
    test('before any push: canUndo false, canRedo false', () => {
        const history = useHistory();
        history.setActiveSheet('s1');
        expect(history.canUndo.value).toBe(false);
        expect(history.canRedo.value).toBe(false);
    });

    test('after one push: canUndo true, canRedo false', () => {
        const history = useHistory();
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        expect(history.canUndo.value).toBe(true);
        expect(history.canRedo.value).toBe(false);
    });
});

// ── undo walks back correctly ─────────────────────────────────────────────────
//
// Model: push(snapshot) stores the PRE-mutation state. undo() pops the last
// entry and restores it (= the state just before the last mutation).

describe('undo', () => {
    test('undo restores the most recently pushed snapshot', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');

        // Simulate: before M1, state=S0 → push(S0). After M1, state=S1.
        // Before M2, state=S1 → push(S1). After M2, state=S2.
        // Undo M2: restore S1 (the state before M2).
        const S0 = makeSnapshot({ view: { panX: 0, panY: 0 } });
        const S1 = makeSnapshot({ view: { panX: 10, panY: 0 } });
        history.push(S0, null); // before M1
        history.push(S1, null); // before M2

        history.undo(); // restore S1 (state before M2)
        expect(restored).toHaveLength(1);
        expect(restored[0]).toEqual(S1);
    });

    test('undo × 2 walks back two steps', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');

        const S0 = makeSnapshot({ view: { panX: 0, panY: 0 } });
        const S1 = makeSnapshot({ view: { panX: 10, panY: 0 } });
        const S2 = makeSnapshot({ view: { panX: 20, panY: 0 } });
        history.push(S0, null);
        history.push(S1, null);
        history.push(S2, null);

        history.undo(); // restore S2 (state before last mutation)
        history.undo(); // restore S1 (state before M2)
        expect(restored[0]).toEqual(S2);
        expect(restored[1]).toEqual(S1);
    });

    test('undo when stack empty is a no-op', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');
        history.undo();
        expect(restored).toHaveLength(0);
    });

    test('after undo: canRedo becomes true', () => {
        const history = useHistory({ restoreSnapshot: () => {} });
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        history.undo();
        expect(history.canRedo.value).toBe(true);
    });

    test('after undoing all entries: canUndo becomes false', () => {
        const history = useHistory({ restoreSnapshot: () => {} });
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        history.push(makeSnapshot(), null);
        history.undo();
        history.undo();
        expect(history.canUndo.value).toBe(false);
    });
});

// ── redo ──────────────────────────────────────────────────────────────────────

describe('redo', () => {
    test('redo restores the undone snapshot', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');

        const S1 = makeSnapshot({ view: { panX: 10, panY: 0 } });
        const S2 = makeSnapshot({ view: { panX: 20, panY: 0 } });
        history.push(S1, null);
        history.push(S2, null);

        history.undo();   // pop S2, restore S2
        history.redo();   // re-restore: restores the redo entry (S2 or something)
        // After redo, restored[1] should be S2
        expect(restored[1]).toEqual(S2);
    });

    test('redo when future empty is a no-op', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        history.redo();
        expect(restored).toHaveLength(0);
    });

    test('canRedo is false after redo exhausts the future', () => {
        const history = useHistory({ restoreSnapshot: () => {} });
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        history.undo();
        expect(history.canRedo.value).toBe(true);
        history.redo();
        expect(history.canRedo.value).toBe(false);
    });
});

// ── undo then push clears future ──────────────────────────────────────────────

describe('undo then push clears future', () => {
    test('pushing after undo clears the redo stack', () => {
        const history = useHistory({ restoreSnapshot: () => {} });
        history.setActiveSheet('s1');

        history.push(makeSnapshot(), null);
        history.push(makeSnapshot(), null);
        history.undo();

        expect(history.canRedo.value).toBe(true);
        history.push(makeSnapshot(), null);
        expect(history.canRedo.value).toBe(false);
    });
});

// ── coalescing ────────────────────────────────────────────────────────────────

describe('coalescing', () => {
    test('same-tag push keeps the original pre-image (no-op after first push)', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');

        const S0 = makeSnapshot({ view: { panX: 0, panY: 0 } });  // pre-keystroke-1 state
        const S1 = makeSnapshot({ view: { panX: 10, panY: 0 } }); // pre-keystroke-2 state (ignored)
        history.push(S0, 'code:b1');
        history.push(S1, 'code:b1'); // same tag → no-op, S0 stays as the pre-image

        // One undo restores S0 (the original pre-image)
        history.undo();
        expect(history.canUndo.value).toBe(false);
        expect(restored[0]).toEqual(S0);
    });

    test('different-tag push appends a new entry', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (snap) => restored.push(snap) });
        history.setActiveSheet('s1');

        const S0 = makeSnapshot({ view: { panX: 0, panY: 0 } });
        const S1 = makeSnapshot({ view: { panX: 10, panY: 0 } });
        history.push(S0, 'code:b1');
        history.push(S1, 'code:b2'); // different tag → appends

        // Two separate entries: undo → undo
        history.undo(); // pop S1, restore S1
        expect(history.canUndo.value).toBe(true); // S0 still in past
        expect(restored[0]).toEqual(S1);

        history.undo(); // pop S0, restore S0
        expect(history.canUndo.value).toBe(false);
        expect(restored[1]).toEqual(S0);
    });

    test('null tag always appends (no coalescing)', () => {
        const history = useHistory({ restoreSnapshot: () => {} });
        history.setActiveSheet('s1');

        history.push(makeSnapshot(), null);
        history.push(makeSnapshot(), null);
        history.push(makeSnapshot(), null);

        history.undo();
        expect(history.canUndo.value).toBe(true); // 2 more entries remain
        history.undo();
        history.undo();
        expect(history.canUndo.value).toBe(false);
    });
});

// ── suppress ──────────────────────────────────────────────────────────────────

describe('suppress', () => {
    test('mutations inside suppress do not push', () => {
        const history = useHistory({ captureSnapshot: () => makeSnapshot() });
        history.setActiveSheet('s1');

        history.suppress(() => {
            history._triggerCapture('some-tag');
            history._triggerCapture('another-tag');
        });

        expect(history.canUndo.value).toBe(false);
    });

    test('suppress uses a reference counter — nested suppress is safe', () => {
        const history = useHistory({ captureSnapshot: () => makeSnapshot() });
        history.setActiveSheet('s1');

        history.suppress(() => {
            history.suppress(() => {
                history._triggerCapture('tag');
            });
            // still suppressed here — depth is still 1
            history._triggerCapture('tag');
        });

        // After suppress fully exits — now depth = 0, captures should work
        expect(history.canUndo.value).toBe(false); // nothing pushed inside suppress

        history._triggerCapture('tag');
        expect(history.canUndo.value).toBe(true);
    });

    test('after suppress completes, normal pushes work again', () => {
        const history = useHistory({ captureSnapshot: () => makeSnapshot() });
        history.setActiveSheet('s1');

        history.suppress(() => {
            history._triggerCapture('tag');
        });
        history._triggerCapture('tag');
        expect(history.canUndo.value).toBe(true);
    });
});

// ── beginGroup / endGroup ─────────────────────────────────────────────────────

describe('beginGroup / endGroup', () => {
    test('multiple triggers inside a group produce one history entry', () => {
        const restored = [];
        const history = useHistory({
            captureSnapshot: () => makeSnapshot(),
            restoreSnapshot: (s) => restored.push(s)
        });
        history.setActiveSheet('s1');

        history.beginGroup();
        history._triggerCapture('tag1'); // suppressed (inside group)
        history._triggerCapture('tag2'); // suppressed
        history.endGroup(); // pushes single entry (the beginGroup snapshot)

        expect(history.canUndo.value).toBe(true);
        history.undo();
        expect(history.canUndo.value).toBe(false);
        expect(restored).toHaveLength(1);
    });

    test('triggers outside a group push normally — two separate entries', () => {
        const restored = [];
        const history = useHistory({
            captureSnapshot: () => makeSnapshot(),
            restoreSnapshot: (s) => restored.push(s)
        });
        history.setActiveSheet('s1');

        history._triggerCapture('tag1');
        history._triggerCapture('tag2'); // null tag (no coalescing for _triggerCapture)

        history.undo();
        history.undo();
        expect(history.canUndo.value).toBe(false);
        expect(restored).toHaveLength(2);
    });
});

// ── MAX_SIZE ──────────────────────────────────────────────────────────────────

describe('MAX_SIZE', () => {
    test('oldest entries are trimmed when exceeding MAX_SIZE (100)', () => {
        const restored = [];
        const history = useHistory({ restoreSnapshot: (s) => restored.push(s) });
        history.setActiveSheet('s1');

        // Push 105 distinct entries (null tag = no coalescing)
        for (let i = 0; i < 105; i++) {
            history.push(makeSnapshot({ view: { panX: i, panY: 0 } }), null);
        }

        let count = 0;
        while (history.canUndo.value) {
            history.undo();
            count++;
            if (count > 110) { break; } // safety
        }
        expect(count).toBe(100);
    });
});

// ── closeSheet ────────────────────────────────────────────────────────────────

describe('closeSheet', () => {
    test('closeSheet removes that sheet stack', () => {
        const history = useHistory();
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        expect(history.canUndo.value).toBe(true);

        history.closeSheet('s1');
        expect(history.canUndo.value).toBe(false);
    });

    test('closing a different sheet does not affect active sheet', () => {
        const history = useHistory();
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);

        history.closeSheet('s2'); // s2 was never open
        expect(history.canUndo.value).toBe(true);
    });
});

// ── per-sheet independence ─────────────────────────────────────────────────────

describe('per-sheet stacks', () => {
    test('switching active sheet shows that sheet stack', () => {
        const history = useHistory();
        history.setActiveSheet('s1');
        history.push(makeSnapshot(), null);
        history.push(makeSnapshot(), null);

        history.setActiveSheet('s2');
        expect(history.canUndo.value).toBe(false);

        history.setActiveSheet('s1');
        expect(history.canUndo.value).toBe(true);
    });
});
