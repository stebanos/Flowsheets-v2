import { describe, test, expect, beforeEach } from 'vitest';
import { usePendingNameFocus } from './usePendingNameFocus';

// usePendingNameFocus is a singleton — reset between tests via consumeFocus
const { requestFocus, consumeFocus } = usePendingNameFocus();

beforeEach(() => {
    // drain any pending focus so tests start clean
    consumeFocus(null);
});

describe('requestFocus / consumeFocus', () => {
    test('consumeFocus returns true for the requested name', () => {
        requestFocus('block-1');
        expect(consumeFocus('block-1')).toBe(true);
    });

    test('consumeFocus returns false for a different name', () => {
        requestFocus('block-1');
        expect(consumeFocus('block-2')).toBe(false);
    });

    test('fire-once — second consumeFocus for the same name returns false', () => {
        requestFocus('block-1');
        consumeFocus('block-1');
        expect(consumeFocus('block-1')).toBe(false);
    });

    test('consumeFocus returns false when nothing was requested', () => {
        expect(consumeFocus('block-1')).toBe(false);
    });

    test('requestFocus overwrites a previous pending focus', () => {
        requestFocus('block-1');
        requestFocus('block-2');
        expect(consumeFocus('block-1')).toBe(false);
        expect(consumeFocus('block-2')).toBe(true);
    });
});
