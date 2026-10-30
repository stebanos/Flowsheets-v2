import { onBeforeUnmount, ref } from 'vue';

/**
 * Vertical drag-to-reorder for the list view. `dropIndex` is the insertion gap (0..n) the
 * dragged cell would land in, or null when the drop would not change the order.
 */
export function useListReorder(items, getCellElements, moveTo) {
    const dragging = ref(null);
    const dropIndex = ref(null);

    function _fromIndex() {
        return items.value.findIndex(b => b.id === dragging.value);
    }

    function _gapAt(clientY) {
        const els = getCellElements();
        let gap = 0;
        for (const el of els) {
            const { top, height } = el.getBoundingClientRect();
            if (clientY > top + height / 2) { gap += 1; }
        }
        return gap;
    }

    function _onMove(e) {
        const from = _fromIndex();
        if (from === -1) { return; }
        const gap = _gapAt(e.clientY);
        dropIndex.value = gap === from || gap === from + 1 ? null : gap;
    }

    function _onUp() {
        const id = dragging.value;
        const gap = dropIndex.value;
        const from = _fromIndex();
        _stop();
        if (gap === null || from === -1) { return; }
        moveTo(id, gap > from ? gap - 1 : gap);
    }

    function _stop() {
        dragging.value = null;
        dropIndex.value = null;
        window.removeEventListener('mousemove', _onMove);
        window.removeEventListener('mouseup', _onUp);
    }

    function startDrag(id, event) {
        if (event?.button !== undefined && event.button !== 0) { return; }
        if (items.value.length < 2) { return; }
        event?.preventDefault?.();
        dragging.value = id;
        dropIndex.value = null;
        window.addEventListener('mousemove', _onMove);
        window.addEventListener('mouseup', _onUp);
    }

    onBeforeUnmount(_stop);

    return { dragging, dropIndex, startDrag };
}
