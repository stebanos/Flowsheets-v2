import { getCurrentScope, onScopeDispose, ref } from 'vue';

/**
 * Owns a window `mousemove`/`mouseup` listener pair for a mouse drag and guarantees cleanup.
 *
 * API choice: callbacks are passed per `start(onMove, onUp)`, not once at creation — every
 * call site closes over the coordinates of the drag it is starting, so a fresh closure per
 * start is the natural shape. `mouseup` calls `onUp` and then `stop()`; `stop()` detaches and
 * is idempotent (safe to call from inside `onUp`). Calling `start` while a drag is active
 * detaches the previous pair first, so listeners never double up.
 *
 * Inside a component (or any effect scope) `stop()` runs automatically on dispose, so an
 * unmount mid-drag leaks nothing. Outside a scope (module-level singletons) it works the same
 * minus the auto-dispose.
 */
export function useWindowDrag() {
    const active = ref(false);

    let _onMove = null;
    let _onUp = null;

    function start(onMove, onUp) {
        stop();
        _onMove = onMove;
        _onUp = () => {
            onUp?.();
            stop();
        };
        active.value = true;
        window.addEventListener('mousemove', _onMove);
        window.addEventListener('mouseup', _onUp);
    }

    function stop() {
        if (!active.value) { return; }
        active.value = false;
        window.removeEventListener('mousemove', _onMove);
        window.removeEventListener('mouseup', _onUp);
        _onMove = null;
        _onUp = null;
    }

    if (getCurrentScope()) { onScopeDispose(stop); }

    return { active, start, stop };
}
