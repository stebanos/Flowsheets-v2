import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock: vi.fn() })
}));

const { useDrag } = await import('./useDrag');

function makeBlock(id = 'b1', x = 100, y = 100) {
    return { id, x, y };
}

describe('single-block drag (no coparticipants)', () => {
    let updateFn;
    let drag;

    beforeEach(() => {
        updateFn = vi.fn();
        drag = useDrag(x => x, y => y, updateFn);
    });

    afterEach(() => {
        window.dispatchEvent(new MouseEvent('mouseup'));
    });

    it('calls updateFn with snapped position on mousemove', () => {
        drag.startDrag(makeBlock(), { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));
        expect(updateFn).toHaveBeenCalledWith('b1', { x: 150, y: 130 });
    });

    it('removes window listeners on mouseup so subsequent moves are ignored', () => {
        drag.startDrag(makeBlock(), { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mouseup'));
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));
        expect(updateFn).not.toHaveBeenCalled();
    });
});

describe('multi-block drag (with coparticipants)', () => {
    let updateFn;
    let drag;

    beforeEach(() => {
        updateFn = vi.fn();
        drag = useDrag(x => x, y => y, updateFn);
    });

    afterEach(() => {
        window.dispatchEvent(new MouseEvent('mouseup'));
    });

    it('updates each coparticipant with the same delta on mousemove', () => {
        drag.startDrag(makeBlock('primary', 100, 100), { clientX: 0, clientY: 0 }, [
            { id: 'cp1', startX: 200, startY: 200 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));
        expect(updateFn).toHaveBeenCalledWith('cp1', { x: 250, y: 230 });
    });

    it('updates both primary block and all coparticipants on each mousemove', () => {
        drag.startDrag(makeBlock('primary', 100, 100), { clientX: 0, clientY: 0 }, [
            { id: 'cp1', startX: 200, startY: 200 },
            { id: 'cp2', startX: 300, startY: 300 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));
        expect(updateFn).toHaveBeenCalledTimes(3);
    });

    it('applies snapX/snapY independently to each coparticipant', () => {
        const roundTo10 = x => Math.round(x / 10) * 10;
        const snapDrag = useDrag(roundTo10, roundTo10, updateFn);
        snapDrag.startDrag(makeBlock('primary', 100, 100), { clientX: 0, clientY: 0 }, [
            { id: 'cp1', startX: 205, startY: 205 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        // 205 + 50 = 255 → rounded to nearest 10 = 260
        expect(updateFn).toHaveBeenCalledWith('cp1', { x: 260, y: 260 });
        window.dispatchEvent(new MouseEvent('mouseup'));
    });

    it('resets coparticipants after stopDrag so a subsequent drag has no stale participants', () => {
        drag.startDrag(makeBlock('primary', 100, 100), { clientX: 0, clientY: 0 }, [
            { id: 'cp1', startX: 200, startY: 200 }
        ]);
        window.dispatchEvent(new MouseEvent('mouseup'));
        drag.startDrag(makeBlock('primary', 100, 100), { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));
        expect(updateFn).toHaveBeenCalledTimes(1);
        expect(updateFn).toHaveBeenCalledWith('primary', { x: 150, y: 130 });
    });
});
