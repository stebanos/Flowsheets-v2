import { readonly, ref } from 'vue';

// Prevent Vite HMR from resetting module-level state (an in-flight drag and the target registry would be lost)
if (import.meta.hot) { import.meta.hot.decline(); }

const active = ref(false);
const sourceId = ref(null);
const sourceName = ref(null);
const from = ref({ x: 0, y: 0 });
const to = ref({ x: 0, y: 0 });
const hoverTargetId = ref(null);
const targets = new Map();

function reset() {
    active.value = false;
    sourceId.value = null;
    sourceName.value = null;
    from.value = { x: 0, y: 0 };
    to.value = { x: 0, y: 0 };
    hoverTargetId.value = null;
}

// Pure drag state machine for reference drags: no DOM listeners, no store writes.
// The page owns the window listeners; blocks register their insertion callbacks.
export function useConnectDrag() {
    function cancel() {
        reset();
    }

    function clearHoverTarget(id) {
        if (hoverTargetId.value === id) { hoverTargetId.value = null; }
    }

    function drop() {
        if (!active.value) { return null; }
        const targetId = hoverTargetId.value;
        const name = sourceName.value;
        const isSelf = targetId === sourceId.value;
        reset();
        if (!targetId || isSelf) { return null; }
        return { sourceName: name, targetId };
    }

    async function insertInto(targetId, name) {
        const insert = targets.get(targetId);
        if (!insert) { return false; }
        await insert(name);
        return true;
    }

    function registerTarget(id, insertReference) {
        targets.set(id, insertReference);
    }

    function setHoverTarget(id) {
        if (!active.value) { return; }
        hoverTargetId.value = id;
    }

    function startConnect(sourceBlock, portCanvasPos) {
        active.value = true;
        sourceId.value = sourceBlock.id;
        sourceName.value = sourceBlock.name;
        from.value = { ...portCanvasPos };
        to.value = { ...portCanvasPos };
        hoverTargetId.value = null;
    }

    function unregisterTarget(id) {
        targets.delete(id);
        if (!active.value) { return; }
        if (sourceId.value === id) { reset(); return; }
        clearHoverTarget(id);
    }

    function updatePointer(canvasPos, targetId) {
        if (!active.value) { return; }
        to.value = { ...canvasPos };
        if (targetId !== undefined) { hoverTargetId.value = targetId; }
    }

    return {
        active: readonly(active),
        from: readonly(from),
        hoverTargetId: readonly(hoverTargetId),
        sourceId: readonly(sourceId),
        sourceName: readonly(sourceName),
        to: readonly(to),
        cancel,
        clearHoverTarget,
        drop,
        insertInto,
        registerTarget,
        setHoverTarget,
        startConnect,
        unregisterTarget,
        updatePointer
    };
}
