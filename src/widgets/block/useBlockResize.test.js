import { createApp, ref } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockUpdateBlock = vi.fn();

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock: mockUpdateBlock })
}));

const { useBlockResize } = await import('./useBlockResize');

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

function makeDeps(overrides = {}) {
    return {
        snapX: (v) => v,
        snapY: (v) => v,
        cellHeight: ref(40),
        unitX: ref(50),
        editorHeight: ref(80),
        outputHeight: ref(120),
        editorWidth: ref(150),
        snappedEditorHeight: ref(80),
        snappedOutputHeight: ref(120),
        snappedEditorWidth: ref(150),
        ...overrides
    };
}

const props = { block: { id: 'b1' } };

beforeEach(() => { mockUpdateBlock.mockClear(); });

describe('handleStartResizeEditor', () => {
    test('mouse move updates editorHeight by drag delta', () => {
        const deps = makeDeps();
        const { handleStartResizeEditor } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeEditor({ clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientY: 130 }));

        expect(deps.editorHeight.value).toBe(110); // 80 + 30
    });

    test('mouse move clamps editorHeight to cellHeight minimum', () => {
        const deps = makeDeps();
        const { handleStartResizeEditor } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeEditor({ clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientY: 50 })); // 80 - 50 = 30 < 40

        expect(deps.editorHeight.value).toBe(40);
    });

    test('mouse up calls updateBlock with the final editorHeight', () => {
        const deps = makeDeps();
        const { handleStartResizeEditor } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeEditor({ clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientY: 120 }));
        window.dispatchEvent(new MouseEvent('mouseup'));

        expect(mockUpdateBlock).toHaveBeenCalledWith('b1', { editorHeight: 100 }); // 80 + 20
    });

    test('isResizingLocal is true during drag and false after mouseup', () => {
        const deps = makeDeps();
        const { handleStartResizeEditor, isResizingLocal } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeEditor({ clientY: 100 });
        expect(isResizingLocal.value).toBe(true);

        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(isResizingLocal.value).toBe(false);
    });
});

describe('handleStartResizeOutput', () => {
    test('mouse move updates outputHeight by vertical delta', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 130 }));

        expect(deps.outputHeight.value).toBe(150); // 120 + 30
    });

    test('mouse move updates editorWidth by horizontal delta', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 100 }));

        expect(deps.editorWidth.value).toBe(200); // 150 + 50
    });

    test('mouse move clamps outputHeight to 2 * cellHeight minimum', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 10 })); // 120 - 90 = 30 < 80

        expect(deps.outputHeight.value).toBe(80); // 2 * cellHeight(40)
    });

    test('mouse move clamps editorWidth to unitX minimum', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 100 })); // 150 - 150 = 0 < 50

        expect(deps.editorWidth.value).toBe(50); // unitX
    });

    test('mouse up calls updateBlock with outputHeight and width', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 220, clientY: 110 }));
        window.dispatchEvent(new MouseEvent('mouseup'));

        expect(mockUpdateBlock).toHaveBeenCalledWith('b1', { outputHeight: 130, width: 170 }); // 120+10, 150+20
    });

    test('isResizingLocal is true during drag and false after mouseup', () => {
        const deps = makeDeps();
        const { handleStartResizeOutput, isResizingLocal } = withSetup(() => useBlockResize(props, deps));

        handleStartResizeOutput({ clientX: 200, clientY: 100 });
        expect(isResizingLocal.value).toBe(true);

        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(isResizingLocal.value).toBe(false);
    });
});
