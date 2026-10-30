import { effectScope, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const history = { beginGroup: vi.fn(), endGroup: vi.fn() };
vi.mock('@/entities/history', () => ({ useHistory: () => history }));

const drag = {
    active: ref(false),
    from: ref({ x: 0, y: 0 }),
    to: ref({ x: 0, y: 0 }),
    cancel: vi.fn(),
    drop: vi.fn(),
    insertInto: vi.fn(),
    updatePointer: vi.fn()
};
vi.mock('./useConnectDrag', () => ({ useConnectDrag: () => drag }));

const { useConnectWire, wirePath } = await import('./useConnectWire');

const toCanvasPoint = vi.fn(e => ({ x: e.clientX - 10, y: e.clientY - 20 }));
const calls = [];
let scope;

// each instance lives in its own scope so its watcher and window drag are disposed between tests
function mountWire() {
    scope = effectScope();
    return scope.run(() => useConnectWire({ toCanvasPoint }));
}

beforeEach(() => {
    drag.active.value = false;
    drag.from.value = { x: 0, y: 0 };
    drag.to.value = { x: 0, y: 0 };
    calls.length = 0;
    history.beginGroup.mockImplementation(() => calls.push('begin'));
    history.endGroup.mockImplementation(() => calls.push('end'));
    drag.insertInto.mockImplementation(async () => { calls.push('insert'); return true; });
    drag.drop.mockReturnValue(null);
});

afterEach(() => {
    scope?.stop();
    scope = null;
    vi.clearAllMocks();
});

describe('wirePath', () => {
    it('uses half the horizontal distance as the bezier handle', () => {
        expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 50 })).toBe('M 0 0 C 100 0, 100 50, 200 50');
    });

    it('clamps the handle to a 30px minimum', () => {
        expect(wirePath({ x: 0, y: 0 }, { x: 20, y: 50 })).toBe('M 0 0 C 30 0, -10 50, 20 50');
    });

    it('measures the distance in absolute terms when the target is to the left', () => {
        expect(wirePath({ x: 200, y: 0 }, { x: 0, y: 50 })).toBe('M 200 0 C 300 0, -100 50, 0 50');
    });
});

describe('useConnectWire', () => {
    it('exposes the drag state and a reactive wire path', async () => {
        const wire = mountWire();
        expect(wire.active).toBe(drag.active);
        expect(wire.to).toBe(drag.to);
        expect(wire.cancel).toBe(drag.cancel);
        drag.from.value = { x: 0, y: 0 };
        drag.to.value = { x: 200, y: 50 };
        await nextTick();
        expect(wire.wirePath.value).toBe('M 0 0 C 100 0, 100 50, 200 50');
    });

    it('does not listen on the window while inactive', () => {
        mountWire();
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 60 }));
        expect(drag.updatePointer).not.toHaveBeenCalled();
    });

    it('starts the window drag when active and tracks the pointer through the injected transform', async () => {
        mountWire();
        drag.active.value = true;
        await nextTick();
        const e = new MouseEvent('mousemove', { clientX: 50, clientY: 60 });
        window.dispatchEvent(e);
        expect(toCanvasPoint).toHaveBeenCalledWith(e);
        expect(drag.updatePointer).toHaveBeenCalledWith({ x: 40, y: 40 });
    });

    it('stops the window drag when active turns false', async () => {
        mountWire();
        drag.active.value = true;
        await nextTick();
        drag.active.value = false;
        await nextTick();
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 60 }));
        expect(drag.updatePointer).not.toHaveBeenCalled();
    });

    it('on mouseup inserts the dropped reference inside a history group', async () => {
        drag.drop.mockReturnValue({ targetId: 'b2', sourceName: 'a' });
        mountWire();
        drag.active.value = true;
        await nextTick();
        window.dispatchEvent(new MouseEvent('mouseup'));
        await Promise.resolve();
        await Promise.resolve();
        expect(drag.drop).toHaveBeenCalledTimes(1);
        expect(drag.insertInto).toHaveBeenCalledWith('b2', 'a');
        expect(calls).toEqual(['begin', 'insert', 'end']);
    });

    it('on mouseup without a drop result touches neither history nor insertInto', async () => {
        mountWire();
        drag.active.value = true;
        await nextTick();
        window.dispatchEvent(new MouseEvent('mouseup'));
        await Promise.resolve();
        expect(drag.insertInto).not.toHaveBeenCalled();
        expect(history.beginGroup).not.toHaveBeenCalled();
        expect(history.endGroup).not.toHaveBeenCalled();
    });

});
