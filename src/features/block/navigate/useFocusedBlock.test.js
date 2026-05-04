import { nextTick } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// The module is a singleton; resetModules gives each test a fresh ref/Map state.
let useFocusedBlock;

beforeEach(async () => {
    vi.resetModules();
    ({ useFocusedBlock } = await import('./useFocusedBlock'));
});

describe('useFocusedBlock', () => {
    describe('register / focusBlockWrapper', () => {
        it('calls focusWrapper and sets focusedBlockName', () => {
            const { register, focusBlockWrapper, focusedBlockName } = useFocusedBlock();
            const focusWrapper = vi.fn();
            register('a', focusWrapper, vi.fn());
            focusBlockWrapper('a');
            expect(focusWrapper).toHaveBeenCalledOnce();
            expect(focusedBlockName.value).toBe('a');
        });

        it('sets focusedBlockName even when name is absent from registry', () => {
            const { focusBlockWrapper, focusedBlockName } = useFocusedBlock();
            focusBlockWrapper('missing');
            expect(focusedBlockName.value).toBe('missing');
        });
    });

    describe('unregister', () => {
        it('prevents focusWrapper from being called after removal', () => {
            const { register, unregister, focusBlockWrapper } = useFocusedBlock();
            const focusWrapper = vi.fn();
            register('a', focusWrapper, vi.fn());
            unregister('a');
            focusBlockWrapper('a');
            expect(focusWrapper).not.toHaveBeenCalled();
        });
    });

    describe('selectBlock', () => {
        it('sets focusedBlockName without calling any registered focusWrapper', () => {
            const { register, selectBlock, focusedBlockName } = useFocusedBlock();
            const focusWrapper = vi.fn();
            register('a', focusWrapper, vi.fn());
            selectBlock('a');
            expect(focusedBlockName.value).toBe('a');
            expect(focusWrapper).not.toHaveBeenCalled();
        });
    });

    describe('registerCanvas / focusCanvas', () => {
        it('calls focus on the canvas element and clears focusedBlockName', () => {
            const canvas = { focus: vi.fn() };
            const { registerCanvas, focusCanvas, selectBlock, focusedBlockName } = useFocusedBlock();
            registerCanvas(canvas, null);
            selectBlock('a');
            focusCanvas();
            expect(canvas.focus).toHaveBeenCalledOnce();
            expect(focusedBlockName.value).toBeNull();
        });

        it('does not throw when no canvas is registered', () => {
            const { focusCanvas, focusedBlockName } = useFocusedBlock();
            expect(() => focusCanvas()).not.toThrow();
            expect(focusedBlockName.value).toBeNull();
        });
    });

    describe('announce', () => {
        it('writes text to the announcer element immediately', () => {
            const announcer = { textContent: '' };
            const { registerCanvas, announce } = useFocusedBlock();
            registerCanvas(null, announcer);
            announce('Wrapped to first block');
            expect(announcer.textContent).toBe('Wrapped to first block');
        });

        it('clears the announcer after nextTick so the same message can repeat', async () => {
            const announcer = { textContent: '' };
            const { registerCanvas, announce } = useFocusedBlock();
            registerCanvas(null, announcer);
            announce('Wrapped to first block');
            await nextTick();
            expect(announcer.textContent).toBe('');
        });

        it('is a no-op when no announcer is registered', () => {
            const { announce } = useFocusedBlock();
            expect(() => announce('hello')).not.toThrow();
        });
    });

    describe('wrapIndicator', () => {
        it('is false by default', () => {
            const { wrapIndicator } = useFocusedBlock();
            expect(wrapIndicator.value).toBe(false);
        });

        it('is a writable ref so Block.vue can clear it after the flash', () => {
            const { wrapIndicator } = useFocusedBlock();
            wrapIndicator.value = true;
            expect(wrapIndicator.value).toBe(true);
        });
    });
});
