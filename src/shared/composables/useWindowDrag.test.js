import { effectScope } from 'vue';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useWindowDrag } from './useWindowDrag';

const move = (x = 0, y = 0) => window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
const up = () => window.dispatchEvent(new MouseEvent('mouseup'));

let add;
let remove;
afterEach(() => {
    add?.mockRestore();
    remove?.mockRestore();
    add = remove = null;
});

describe('useWindowDrag', () => {
    test('start attaches a window mousemove/mouseup pair and sets active', () => {
        add = vi.spyOn(window, 'addEventListener');
        const drag = useWindowDrag();
        expect(drag.active.value).toBe(false);
        drag.start(() => {}, () => {});
        expect(drag.active.value).toBe(true);
        expect(add).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(add).toHaveBeenCalledWith('mouseup', expect.any(Function));
        drag.stop();
    });

    test('forwards mousemove events to onMove', () => {
        const onMove = vi.fn();
        const drag = useWindowDrag();
        drag.start(onMove, () => {});
        move(10, 20);
        expect(onMove).toHaveBeenCalledOnce();
        expect(onMove.mock.calls[0][0].clientX).toBe(10);
        drag.stop();
    });

    test('mouseup calls onUp then detaches', () => {
        const onMove = vi.fn();
        const onUp = vi.fn();
        const drag = useWindowDrag();
        drag.start(onMove, onUp);
        up();
        expect(onUp).toHaveBeenCalledOnce();
        expect(drag.active.value).toBe(false);
        move();
        up();
        expect(onMove).not.toHaveBeenCalled();
        expect(onUp).toHaveBeenCalledOnce();
    });

    test('onUp can call stop itself without breaking', () => {
        const drag = useWindowDrag();
        const onUp = vi.fn(() => drag.stop());
        drag.start(() => {}, onUp);
        up();
        expect(onUp).toHaveBeenCalledOnce();
        expect(drag.active.value).toBe(false);
    });

    test('stop is idempotent', () => {
        remove = vi.spyOn(window, 'removeEventListener');
        const drag = useWindowDrag();
        drag.stop();
        expect(remove).not.toHaveBeenCalled();
        drag.start(() => {}, () => {});
        drag.stop();
        drag.stop();
        expect(remove).toHaveBeenCalledTimes(2);
        expect(drag.active.value).toBe(false);
    });

    test('restarting while active detaches the previous pair first', () => {
        const first = vi.fn();
        const second = vi.fn();
        const drag = useWindowDrag();
        drag.start(first, () => {});
        drag.start(second, () => {});
        move();
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
        drag.stop();
    });

    test('disposing the owning effectScope stops an active drag', () => {
        const onMove = vi.fn();
        const scope = effectScope();
        const drag = scope.run(() => useWindowDrag());
        drag.start(onMove, () => {});
        scope.stop();
        expect(drag.active.value).toBe(false);
        move();
        expect(onMove).not.toHaveBeenCalled();
    });

    test('works with no active scope (module-level use)', () => {
        const onMove = vi.fn();
        const drag = useWindowDrag();
        drag.start(onMove, () => {});
        move();
        expect(onMove).toHaveBeenCalledOnce();
        up();
        expect(drag.active.value).toBe(false);
    });
});
