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
    test('after the limit elapses with no trailing call, the next call fires immediately', () => {
        const fn = vi.fn();
        const t = throttle(fn, 100);
        t(); // leading call at t=0
        vi.advanceTimersByTime(100);
        // No second call during the window, so no trailing fires
        t(); // should fire immediately because limit has passed
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
