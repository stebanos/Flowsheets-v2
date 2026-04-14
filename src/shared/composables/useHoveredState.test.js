import { describe, test, expect } from 'vitest';
import { useHoveredState } from './useHoveredState';

describe('useHoveredState', () => {
    test('hovered starts null', () => {
        const { hovered } = useHoveredState();
        expect(hovered.value).toBeNull();
    });

    test('setHovered sets the value', () => {
        const { hovered, setHovered } = useHoveredState();
        setHovered('block-1');
        expect(hovered.value).toBe('block-1');
    });

    test('setHovered with falsy value coerces to null', () => {
        const { hovered, setHovered } = useHoveredState();
        setHovered('block-1');
        setHovered('');
        expect(hovered.value).toBeNull();
    });

    test('clearHovered resets to null', () => {
        const { hovered, setHovered, clearHovered } = useHoveredState();
        setHovered('block-1');
        clearHovered();
        expect(hovered.value).toBeNull();
    });

    test('factory — each call returns an independent instance', () => {
        const a = useHoveredState();
        const b = useHoveredState();
        a.setHovered('block-1');
        expect(b.hovered.value).toBeNull();
    });
});
