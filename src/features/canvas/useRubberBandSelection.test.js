import { describe, it, expect, vi } from 'vitest';
import { useRubberBandSelection } from './useRubberBandSelection';

function block(name, x, y, w, h) {
    return { name, x, y, width: w, editorHeight: h, outputHeight: 0 };
}

describe('useRubberBandSelection', () => {
    describe('startRubberBand', () => {
        it('sets isSelecting to true', () => {
            const { isSelecting, startRubberBand } = useRubberBandSelection();
            startRubberBand(10, 20);
            expect(isSelecting.value).toBe(true);
        });

        it('initialises rect with both corners at the given point', () => {
            const { rect, startRubberBand } = useRubberBandSelection();
            startRubberBand(10, 20);
            expect(rect.value).toEqual({ x1: 10, y1: 20, x2: 10, y2: 20 });
        });
    });

    describe('updateRubberBand', () => {
        it('updates x2 and y2 while preserving x1 and y1', () => {
            const { rect, startRubberBand, updateRubberBand } = useRubberBandSelection();
            startRubberBand(10, 20);
            updateRubberBand(50, 80);
            expect(rect.value).toEqual({ x1: 10, y1: 20, x2: 50, y2: 80 });
        });
    });

    describe('finishRubberBand — sub-threshold', () => {
        it('calls clearSelectionFn and not setSelectionFn when drag < 4px in both axes', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            const clear = vi.fn();
            startRubberBand(10, 20);
            updateRubberBand(13, 23);
            finishRubberBand([], set, clear);
            expect(clear).toHaveBeenCalledOnce();
            expect(set).not.toHaveBeenCalled();
        });

        it('calls setSelectionFn when x >= 4 even if y < 4', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            const clear = vi.fn();
            startRubberBand(10, 20);
            updateRubberBand(14, 23);
            finishRubberBand([], set, clear);
            expect(set).toHaveBeenCalledOnce();
            expect(clear).not.toHaveBeenCalled();
        });
    });

    describe('finishRubberBand — overlap', () => {
        it('includes blocks fully inside the rect', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            startRubberBand(0, 0);
            updateRubberBand(200, 200);
            finishRubberBand([block('a', 10, 10, 50, 50)], set, vi.fn());
            expect(set).toHaveBeenCalledWith(['a']);
        });

        it('includes blocks that partially overlap the rect', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            startRubberBand(50, 50);
            updateRubberBand(150, 150);
            // block starts at 100,100 so it partially overlaps
            finishRubberBand([block('a', 100, 100, 100, 100)], set, vi.fn());
            expect(set).toHaveBeenCalledWith(['a']);
        });

        it('excludes blocks entirely outside the rect', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            startRubberBand(0, 0);
            updateRubberBand(50, 50);
            finishRubberBand([block('a', 100, 100, 50, 50)], set, vi.fn());
            expect(set).toHaveBeenCalledWith([]);
        });

        it('works when rect is drawn right-to-left / bottom-to-top', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            startRubberBand(200, 200);
            updateRubberBand(0, 0);
            finishRubberBand([block('a', 10, 10, 50, 50)], set, vi.fn());
            expect(set).toHaveBeenCalledWith(['a']);
        });

        it('calls setSelectionFn with empty array when no blocks overlap but drag is valid', () => {
            const { startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            const set = vi.fn();
            startRubberBand(0, 0);
            updateRubberBand(100, 100);
            finishRubberBand([], set, vi.fn());
            expect(set).toHaveBeenCalledWith([]);
        });

        it('sets isSelecting to false and rect to null after finish', () => {
            const { isSelecting, rect, startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
            startRubberBand(0, 0);
            updateRubberBand(100, 100);
            finishRubberBand([], vi.fn(), vi.fn());
            expect(isSelecting.value).toBe(false);
            expect(rect.value).toBeNull();
        });
    });

    describe('cancelRubberBand', () => {
        it('sets isSelecting to false and rect to null without calling any callbacks', () => {
            const { isSelecting, rect, startRubberBand, cancelRubberBand } = useRubberBandSelection();
            startRubberBand(10, 20);
            cancelRubberBand();
            expect(isSelecting.value).toBe(false);
            expect(rect.value).toBeNull();
        });
    });
});
