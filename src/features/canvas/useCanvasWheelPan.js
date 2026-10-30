import { useCanvasPan } from './useCanvasPan';

const SCROLL_RESUME_MS = 500;
const LINE_PX = 40;

/**
 * Decides whether a wheel event scrolls an inner element or pans the canvas. Once the canvas
 * has panned, wheel events keep panning for SCROLL_RESUME_MS without re-checking the ancestors,
 * so a pan does not hand off to a block output the pointer happens to cross.
 */
export function useCanvasWheelPan(canvasEl) {
    const { panByDelta } = useCanvasPan();
    let _lastScrollTime = 0;

    function _findScrollableAncestor(el) {
        while (el && el !== canvasEl.value) {
            const oy = getComputedStyle(el).overflowY;
            if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) { return el; }
            el = el.parentElement;
        }
        return null;
    }

    function onWheel(event) {
        const now = Date.now();
        const isMidScroll = (now - _lastScrollTime) < SCROLL_RESUME_MS;

        if (!isMidScroll) {
            const active = document.activeElement;
            const tag = active?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || active?.isContentEditable) { return; }

            const scrollable = _findScrollableAncestor(event.target);
            if (scrollable) {
                const canScrollDown = event.deltaY > 0 && scrollable.scrollTop < scrollable.scrollHeight - scrollable.clientHeight;
                const canScrollUp = event.deltaY < 0 && scrollable.scrollTop > 0;
                if (canScrollDown || canScrollUp) { return; }
            }
        }

        event.preventDefault();
        _lastScrollTime = now;

        const factor = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? window.innerHeight : 1;
        const dx = event.deltaX * factor;
        const dy = event.deltaY * factor;

        if (event.shiftKey) {
            panByDelta(-(dx || dy), 0);
        } else {
            panByDelta(-dx, -dy);
        }
    }

    return { onWheel };
}
