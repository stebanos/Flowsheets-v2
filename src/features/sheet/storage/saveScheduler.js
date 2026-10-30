import { ref } from 'vue';

// Debounces saves. `status` flips to 'saving' when a save is armed; `save` itself
// settles it to 'idle' or 'error' because only the saver knows what went wrong.
export function createSaveScheduler({ save, isBlocked, delayMs = 500 }) {
    const status = ref('idle');  // 'idle' | 'saving' | 'error'

    let timer = null;

    function _clearTimer() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function flush() {
        _clearTimer();
        save();
    }

    function schedule() {
        if (isBlocked()) { return; }
        _clearTimer();
        status.value = 'saving';
        timer = setTimeout(() => {
            timer = null;
            save();
        }, delayMs);
    }

    return { status, flush, schedule };
}
