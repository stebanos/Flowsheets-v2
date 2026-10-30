import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveScheduler } from './saveScheduler';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function makeScheduler(overrides = {}) {
    const save = vi.fn();
    const scheduler = createSaveScheduler({ save, isBlocked: () => false, ...overrides });
    return { save, scheduler };
}

describe('createSaveScheduler', () => {
    it('starts idle', () => {
        const { scheduler } = makeScheduler();
        expect(scheduler.status.value).toBe('idle');
    });

    it('coalesces two schedules into one save after the delay', () => {
        const { save, scheduler } = makeScheduler();

        scheduler.schedule();
        vi.advanceTimersByTime(300);
        scheduler.schedule();
        expect(scheduler.status.value).toBe('saving');

        vi.advanceTimersByTime(499);
        expect(save).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('honours a custom delay', () => {
        const { save, scheduler } = makeScheduler({ delayMs: 50 });

        scheduler.schedule();
        vi.advanceTimersByTime(50);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('flush cancels the pending timer and saves now', () => {
        const { save, scheduler } = makeScheduler();

        scheduler.schedule();
        scheduler.flush();
        expect(save).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('flush saves even when nothing is scheduled', () => {
        const { save, scheduler } = makeScheduler();

        scheduler.flush();
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('a blocked schedule neither arms the timer nor changes status', () => {
        const { save, scheduler } = makeScheduler({ isBlocked: () => true });

        scheduler.schedule();
        expect(scheduler.status.value).toBe('idle');

        vi.advanceTimersByTime(1000);
        expect(save).not.toHaveBeenCalled();
    });
});
