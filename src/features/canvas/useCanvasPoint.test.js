import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasPan } from './useCanvasPan';
import { useCanvasPoint } from './useCanvasPoint';

function canvasAt(left, top) {
    return ref({ getBoundingClientRect: () => ({ left, top }) });
}

describe('useCanvasPoint', () => {
    beforeEach(() => {
        useCanvasPan().setPan(0, 0);
    });

    it('subtracts the canvas offset from the client coordinates', () => {
        const { toCanvasPoint } = useCanvasPoint(canvasAt(100, 50));
        expect(toCanvasPoint({ clientX: 130, clientY: 80 })).toEqual({ x: 30, y: 30 });
    });

    it('removes the current pan', () => {
        useCanvasPan().setPan(-20, 15);
        const { toCanvasPoint } = useCanvasPoint(canvasAt(100, 50));
        expect(toCanvasPoint({ clientX: 130, clientY: 80 })).toEqual({ x: 50, y: 15 });
    });

    it('reads the pan at call time, not at creation', () => {
        const { toCanvasPoint } = useCanvasPoint(canvasAt(0, 0));
        useCanvasPan().setPan(10, 10);
        expect(toCanvasPoint({ clientX: 10, clientY: 10 })).toEqual({ x: 0, y: 0 });
    });

    it('measures the canvas on every call', () => {
        const rect = vi.fn(() => ({ left: 0, top: 0 }));
        const { toCanvasPoint } = useCanvasPoint(ref({ getBoundingClientRect: rect }));
        toCanvasPoint({ clientX: 1, clientY: 1 });
        toCanvasPoint({ clientX: 2, clientY: 2 });
        expect(rect).toHaveBeenCalledTimes(2);
    });
});
