import { useCanvasPan } from './useCanvasPan';

/**
 * Converts client (viewport) coordinates to canvas coordinates: the canvas offset and
 * the current pan are removed, so the result is where the event lands in block space.
 */
export function useCanvasPoint(canvasEl) {
    const { panX, panY } = useCanvasPan();

    function toCanvasPoint(e) {
        const { left, top } = canvasEl.value.getBoundingClientRect();
        return { x: e.clientX - left - panX.value, y: e.clientY - top - panY.value };
    }

    return { toCanvasPoint };
}
