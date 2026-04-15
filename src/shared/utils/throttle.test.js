import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import throttle from './throttle';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('throttle — leading call', () => {
    test('fires immediately on the first call', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('passes arguments through on the leading call', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t(1, 2, 3);
        expect(fn).toHaveBeenCalledWith(1, 2, 3);
    });
});

describe('throttle — trailing call', () => {
    test('a second call within the limit does not fire immediately', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t();
        t();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('the trailing call fires once the limit elapses', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t();
        t();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('rapid calls during the limit result in only one trailing call', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t();
        t();
        t();
        t();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

describe('throttle — cooldown reset', () => {
    // After the leading call, lastRan is set to a non-zero timestamp.
    // Subsequent calls always go through the setTimeout branch even after
    // the limit has elapsed — the function only fires synchronously on the
    // very first call (when lastRan is undefined). After the cooldown the
    // trailing call fires with delay ~0, so it still requires timer advancement.
    test('after cooldown, a second call fires once timers are advanced', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t(); // leading call at t=0
        vi.advanceTimersByTime(100);
        t(); // schedules a timeout with delay ≈ 0
        vi.advanceTimersByTime(1); // flush the pending timeout
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
