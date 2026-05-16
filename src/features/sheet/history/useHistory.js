import { computed, reactive, ref } from 'vue';

const MAX_SIZE = 100;

// ── module-level singleton state ─────────────────────────────────────────────
//
// Per-sheet history stacks:
//   past:   reactive array of snapshots (index 0 = oldest, past[-1] = most recent pre-image)
//   future: reactive array (index 0 = most recent future, for redo)
//   lastTag: string|null   tag of the last push (for coalescing)
//
// Undo model:
//   push(S) stores a checkpoint — the state captured BEFORE a mutation.
//   undo: pop past[-1]; if past still has entries, restore new past[-1];
//         otherwise restore the popped snapshot.
//   redo: push captured current onto past, restore the future entry.

const _stacks = reactive(new Map());
const _activeSheetId = ref(null);

// suppress depth counter — nested suppress() calls are safe
let _suppressDepth = 0;

// group: snapshot taken at beginGroup; further captures suppressed until endGroup
let _groupDepth = 0;
let _groupSnapshot = null;

// snapshot provider/restorer — injected once at init or by tests
let _captureSnapshot = null;
let _restoreSnapshot = null;

// ── helpers ───────────────────────────────────────────────────────────────────

function _getStack(sheetId) {
    if (!_stacks.has(sheetId)) {
        _stacks.set(sheetId, { past: [], future: [], lastTag: null });
    }
    return _stacks.get(sheetId);
}

function _activeStack() {
    if (!_activeSheetId.value) { return null; }
    return _getStack(_activeSheetId.value);
}

function _doPush(snapshot, tag) {
    const stack = _activeStack();
    if (!stack) { return; }

    stack.future.splice(0);

    if (tag !== null && stack.past.length > 0 && stack.lastTag === tag) {
        // Coalescing: same tag → keep original pre-image (no-op)
        return;
    }

    const entry = { ...snapshot, _tag: tag };
    stack.past.push(entry);
    stack.lastTag = tag;

    if (stack.past.length > MAX_SIZE) {
        stack.past.splice(0, stack.past.length - MAX_SIZE);
    }
}

function _stripTag(entry) {
    const { _tag, ...snap } = entry;
    return snap;
}

/**
 * Called by store mutation hooks before each mutation.
 * Checks suppress/group state before capturing and pushing.
 */
function captureIfOpen(tag) {
    if (_suppressDepth > 0) { return; }
    if (_groupDepth > 0) { return; }
    if (!_activeSheetId.value) { return; }
    if (!_captureSnapshot) { return; }
    const snapshot = _captureSnapshot();
    if (snapshot !== null && snapshot !== undefined) {
        _doPush(snapshot, tag);
    }
}

// ── composable ───────────────────────────────────────────────────────────────

/**
 * Wire up snapshot capture/restore and register store hooks.
 * Called once from the app layer (BlockEditorPage).
 *
 * @param {Function} captureSnapshot - () => serialized sheet snapshot
 * @param {Function} restoreSnapshot - (snapshot) => restores blocks/notes/pan
 */
export async function initHistory(captureSnapshot, restoreSnapshot) {
    _captureSnapshot = captureSnapshot;
    _restoreSnapshot = restoreSnapshot;

    // Import and register mutation hooks at runtime to avoid breaking tests
    // that mock @/entities/block or @/entities/note without these exports.
    const { setBeforeMutationHook } = await import('@/entities/block');
    const { setBeforeMutationHook: setNoteMutationHook } = await import('@/entities/note');
    setBeforeMutationHook(captureIfOpen);
    setNoteMutationHook(captureIfOpen);
}

export function useHistory(opts = {}) {
    // Allow test injection of snapshot helpers
    if (opts.captureSnapshot !== undefined) { _captureSnapshot = opts.captureSnapshot; }
    if (opts.restoreSnapshot !== undefined) { _restoreSnapshot = opts.restoreSnapshot; }

    const canUndo = computed(() => {
        const id = _activeSheetId.value;
        if (!id) { return false; }
        const stack = _stacks.get(id);
        return stack ? stack.past.length > 0 : false;
    });

    const canRedo = computed(() => {
        const id = _activeSheetId.value;
        if (!id) { return false; }
        const stack = _stacks.get(id);
        return stack ? stack.future.length > 0 : false;
    });

    function setActiveSheet(id) {
        _activeSheetId.value = id;
    }

    function push(snapshot, tag) {
        _doPush(snapshot, tag);
    }

    function undo() {
        const stack = _activeStack();
        if (!stack || stack.past.length === 0) { return; }

        const entry = stack.past.pop();

        const current = _captureSnapshot ? _captureSnapshot() : null;
        if (current) {
            stack.future.unshift({ ...current, _tag: entry._tag });
        } else {
            stack.future.unshift(entry);
        }
        stack.lastTag = null;

        // Restore the popped snapshot (the state just before the undone action)
        if (_restoreSnapshot) {
            _suppressDepth++;
            try { _restoreSnapshot(_stripTag(entry)); } finally { _suppressDepth--; }
        }
    }

    function redo() {
        const stack = _activeStack();
        if (!stack || stack.future.length === 0) { return; }

        const entry = stack.future.shift();

        const current = _captureSnapshot ? _captureSnapshot() : null;
        if (current) {
            stack.past.push({ ...current, _tag: entry._tag });
        } else {
            stack.past.push(entry);
        }
        stack.lastTag = null;

        if (_restoreSnapshot) {
            _suppressDepth++;
            try { _restoreSnapshot(_stripTag(entry)); } finally { _suppressDepth--; }
        }
    }

    function suppress(fn) {
        _suppressDepth++;
        try {
            fn();
        } finally {
            _suppressDepth--;
        }
    }

    function beginGroup() {
        if (_groupDepth === 0) {
            _groupSnapshot = _captureSnapshot ? _captureSnapshot() : null;
        }
        _groupDepth++;
    }

    function endGroup() {
        if (_groupDepth <= 0) { return; }
        _groupDepth--;
        if (_groupDepth === 0 && _groupSnapshot !== null) {
            _doPush(_groupSnapshot, null);
            _groupSnapshot = null;
        }
    }

    function closeSheet(sheetId) {
        _stacks.delete(sheetId);
    }

    return {
        canUndo,
        canRedo,
        push,
        undo,
        redo,
        suppress,
        beginGroup,
        endGroup,
        closeSheet,
        setActiveSheet,
        captureIfOpen,
        // test access
        _triggerCapture: captureIfOpen
    };
}
