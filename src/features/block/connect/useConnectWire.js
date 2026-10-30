import { computed, watch } from 'vue';
import { useWindowDrag } from '@/shared/composables';
import { useHistory } from '@/entities/history';
import { useConnectDrag } from './useConnectDrag';

// Bezier from the source port to the pointer; the handle is half the horizontal distance, at least 30px
export function wirePath(from, to) {
    const { x: x1, y: y1 } = from;
    const { x: x2, y: y2 } = to;
    const dx = Math.max(Math.abs(x2 - x1) / 2, 30);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/**
 * Drives a reference drag from the window: tracks the pointer in canvas coordinates while the
 * drag is active and, on release, inserts the reference inside one history group.
 * `connect` cannot import `features/canvas`, so the coordinate transform is injected.
 */
export function useConnectWire({ toCanvasPoint }) {
    const { active, from, to, cancel, drop, insertInto, updatePointer } = useConnectDrag();
    const history = useHistory();
    const windowDrag = useWindowDrag();

    const path = computed(() => wirePath(from.value, to.value));

    function _onMove(e) {
        updatePointer(toCanvasPoint(e));
    }

    async function _onUp() {
        const result = drop();
        if (!result) { return; }
        history.beginGroup();
        try {
            await insertInto(result.targetId, result.sourceName);
        } finally {
            history.endGroup();
        }
    }

    watch(active, (isActive) => {
        if (isActive) {
            windowDrag.start(_onMove, _onUp);
            return;
        }
        windowDrag.stop();
    });

    return { active, to, wirePath: path, cancel };
}
