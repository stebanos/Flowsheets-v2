import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBlockStore } from '@/entities/block';
import { useDrag } from './useDrag';

// Real store — no updateFn passed to useDrag so it wires up useBlockStore().updateBlock itself.
const { blocks, addBlock } = useBlockStore();
const identity = x => x;

beforeEach(() => { blocks.splice(0); });
afterEach(() => { window.dispatchEvent(new MouseEvent('mouseup')); });

describe('single-block drag', () => {
    it('updates block position in the store on mousemove', () => {
        addBlock({ id: '1', name: 'a', x: 100, y: 100, code: '' });
        const drag = useDrag(identity, identity);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));

        expect(blocks[0].x).toBe(150);
        expect(blocks[0].y).toBe(130);
    });

    it('stops updating the store after mouseup', () => {
        addBlock({ id: '1', name: 'a', x: 100, y: 100, code: '' });
        const drag = useDrag(identity, identity);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mouseup'));
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));

        expect(blocks[0].x).toBe(100);
        expect(blocks[0].y).toBe(100);
    });

    it('applies the snap function to the stored position', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        const snapTo50 = x => Math.floor(x / 50) * 50;
        const drag = useDrag(snapTo50, snapTo50);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 74, clientY: 74 }));

        expect(blocks[0].x).toBe(50);
        expect(blocks[0].y).toBe(50);
    });
});

describe('multi-block drag', () => {
    it('updates both primary and coparticipant positions in the store', () => {
        addBlock({ id: '1', name: 'a', x: 100, y: 100, code: '' });
        addBlock({ id: '2', name: 'b', x: 200, y: 200, code: '' });
        const drag = useDrag(identity, identity);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 }, [
            { id: '2', startX: 200, startY: 200 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));

        expect(blocks[0].x).toBe(150);
        expect(blocks[0].y).toBe(130);
        expect(blocks[1].x).toBe(250);
        expect(blocks[1].y).toBe(230);
    });

    it('preserves relative position between primary and coparticipant regardless of drag distance', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 100, y: 50, code: '' });
        const drag = useDrag(identity, identity);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 }, [
            { id: '2', startX: 100, startY: 50 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));

        expect(blocks[1].x - blocks[0].x).toBe(100);
        expect(blocks[1].y - blocks[0].y).toBe(50);
    });

    it('applies snap independently to each participant so positions may diverge', () => {
        addBlock({ id: '1', name: 'a', x: 0, y: 0, code: '' });
        addBlock({ id: '2', name: 'b', x: 205, y: 205, code: '' });
        const roundTo10 = x => Math.round(x / 10) * 10;
        const drag = useDrag(roundTo10, roundTo10);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 }, [
            { id: '2', startX: 205, startY: 205 }
        ]);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));

        expect(blocks[0].x).toBe(50);  // 0 + 50 = 50 → snapped to 50
        expect(blocks[1].x).toBe(260); // 205 + 50 = 255 → snapped to 260
    });

    it('does not move a former coparticipant in a subsequent drag after stop', () => {
        addBlock({ id: '1', name: 'a', x: 100, y: 100, code: '' });
        addBlock({ id: '2', name: 'b', x: 200, y: 200, code: '' });
        const drag = useDrag(identity, identity);

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 }, [
            { id: '2', startX: 200, startY: 200 }
        ]);
        window.dispatchEvent(new MouseEvent('mouseup'));

        drag.startDrag(blocks[0], { clientX: 0, clientY: 0 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 30 }));

        expect(blocks[0].x).toBe(150);
        expect(blocks[1].x).toBe(200); // coparticipant not moved
    });
});
