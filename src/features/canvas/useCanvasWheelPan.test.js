import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasPan } from './useCanvasPan';
import { useCanvasWheelPan } from './useCanvasWheelPan';

let canvas;
let canvasEl;

function wheel({ target = canvas, deltaX = 0, deltaY = 0, deltaMode = 0, shiftKey = false } = {}) {
    return { target, deltaX, deltaY, deltaMode, shiftKey, preventDefault: vi.fn() };
}

// a child of the canvas that overflows vertically and sits at `scrollTop`
function scrollable({ scrollTop = 0, scrollHeight = 200, clientHeight = 100 } = {}) {
    const el = document.createElement('div');
    el.style.overflowY = 'auto';
    Object.defineProperties(el, {
        scrollHeight: { value: scrollHeight },
        clientHeight: { value: clientHeight }
    });
    el.scrollTop = scrollTop;
    canvas.appendChild(el);
    return el;
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    canvas = document.createElement('div');
    document.body.appendChild(canvas);
    canvasEl = ref(canvas);
    useCanvasPan().setPan(0, 0);
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('useCanvasWheelPan', () => {
    it('pans the canvas against the wheel delta', () => {
        const { onWheel } = useCanvasWheelPan(canvasEl);
        const { panX, panY } = useCanvasPan();
        const e = wheel({ deltaX: 3, deltaY: 7 });
        onWheel(e);
        expect(panX.value).toBe(-3);
        expect(panY.value).toBe(-7);
        expect(e.preventDefault).toHaveBeenCalled();
    });

    it('returns without panning when focus is in an input', () => {
        const input = document.createElement('input');
        canvas.appendChild(input);
        input.focus();
        const { onWheel } = useCanvasWheelPan(canvasEl);
        const e = wheel({ deltaY: 7 });
        onWheel(e);
        expect(useCanvasPan().panY.value).toBe(0);
        expect(e.preventDefault).not.toHaveBeenCalled();
    });

    it('lets a scrollable ancestor scroll when it still can in the wheel direction', () => {
        const el = scrollable({ scrollTop: 0 });
        const child = document.createElement('span');
        el.appendChild(child);
        const { onWheel } = useCanvasWheelPan(canvasEl);
        const e = wheel({ target: child, deltaY: 7 });
        onWheel(e);
        expect(useCanvasPan().panY.value).toBe(0);
        expect(e.preventDefault).not.toHaveBeenCalled();
    });

    it('pans when the scrollable ancestor is already at the end in the wheel direction', () => {
        const el = scrollable({ scrollTop: 100 });
        const { onWheel } = useCanvasWheelPan(canvasEl);
        onWheel(wheel({ target: el, deltaY: 7 }));
        expect(useCanvasPan().panY.value).toBe(-7);
    });

    it('skips the ancestor check within 500 ms of a pan', () => {
        const { onWheel } = useCanvasWheelPan(canvasEl);
        onWheel(wheel({ deltaY: 1 }));
        const el = scrollable({ scrollTop: 0 });
        vi.setSystemTime(100_000 + 499);
        onWheel(wheel({ target: el, deltaY: 7 }));
        expect(useCanvasPan().panY.value).toBe(-8);
    });

    it('checks the ancestor again once 500 ms have passed', () => {
        const { onWheel } = useCanvasWheelPan(canvasEl);
        onWheel(wheel({ deltaY: 1 }));
        const el = scrollable({ scrollTop: 0 });
        vi.setSystemTime(100_000 + 500);
        onWheel(wheel({ target: el, deltaY: 7 }));
        expect(useCanvasPan().panY.value).toBe(-1);
    });

    it('multiplies line-mode deltas by 40', () => {
        const { onWheel } = useCanvasWheelPan(canvasEl);
        onWheel(wheel({ deltaX: 1, deltaY: 2, deltaMode: 1 }));
        expect(useCanvasPan().panX.value).toBe(-40);
        expect(useCanvasPan().panY.value).toBe(-80);
    });

    it('with shift pans horizontally by deltaX, falling back to deltaY', () => {
        const { onWheel } = useCanvasWheelPan(canvasEl);
        const { panX, panY } = useCanvasPan();
        onWheel(wheel({ deltaX: 5, deltaY: 9, shiftKey: true }));
        expect(panX.value).toBe(-5);
        expect(panY.value).toBe(0);
        onWheel(wheel({ deltaY: 9, shiftKey: true }));
        expect(panX.value).toBe(-14);
        expect(panY.value).toBe(0);
    });
});
