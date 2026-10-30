import { createApp, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mockUpdateNote = vi.fn();
const mockBegin = vi.fn();
const mockEnd = vi.fn();

vi.mock('@/entities/note', () => ({
    useNoteStore: () => ({ updateNote: mockUpdateNote }),
    NOTE_MIN_SIZE: { width: 120, height: 80 }
}));

vi.mock('@/entities/history', () => ({
    useHistory: () => ({ beginGroup: mockBegin, endGroup: mockEnd })
}));

const { useNoteResize } = await import('./useNoteResize');

const mountedApps = [];

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    mountedApps.push(app);
    result.app = app;
    return result;
}

function makeNote() {
    return reactive({ id: 'n1', x: 0, y: 0, width: 200, height: 150, title: '', body: '' });
}

function leftDown(clientX, clientY) {
    return { button: 0, clientX, clientY };
}

beforeEach(() => {
    mockUpdateNote.mockClear();
    mockBegin.mockClear();
    mockEnd.mockClear();
});

afterEach(() => {
    // Unmount so a test that never fires mouseup leaves no window listeners behind.
    mountedApps.splice(0).forEach(app => app.unmount());
});

describe('useNoteResize', () => {
    test('mouse move updates width and height by drag delta', () => {
        const { startResize } = withSetup(() => useNoteResize(makeNote()));

        startResize(leftDown(100, 100));
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 120 }));

        expect(mockUpdateNote).toHaveBeenCalledWith('n1', { width: 230, height: 170 });
    });

    test('clamps to NOTE_MIN_SIZE', () => {
        const { startResize } = withSetup(() => useNoteResize(makeNote()));

        startResize(leftDown(100, 100));
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 })); // 200-100=100<120, 150-100=50<80

        expect(mockUpdateNote).toHaveBeenCalledWith('n1', { width: 120, height: 80 });
    });

    test('wraps one gesture in a single history group', () => {
        const { startResize } = withSetup(() => useNoteResize(makeNote()));

        startResize(leftDown(100, 100));
        expect(mockBegin).toHaveBeenCalledTimes(1);
        expect(mockEnd).not.toHaveBeenCalled();

        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 100 }));
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 100 }));
        expect(mockUpdateNote).toHaveBeenCalledTimes(2);
        expect(mockEnd).not.toHaveBeenCalled();

        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(mockBegin).toHaveBeenCalledTimes(1);
        expect(mockEnd).toHaveBeenCalledTimes(1);
        expect(mockBegin.mock.invocationCallOrder[0]).toBeLessThan(mockUpdateNote.mock.invocationCallOrder[0]);
        expect(mockUpdateNote.mock.invocationCallOrder[1]).toBeLessThan(mockEnd.mock.invocationCallOrder[0]);
    });

    test('isResizing is true during drag and false after mouseup', () => {
        const { startResize, isResizing } = withSetup(() => useNoteResize(makeNote()));

        expect(isResizing.value).toBe(false);
        startResize(leftDown(100, 100));
        expect(isResizing.value).toBe(true);

        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(isResizing.value).toBe(false);
    });

    test('ignores non-left button: no group, no listeners', () => {
        const add = vi.spyOn(window, 'addEventListener');
        const { startResize, isResizing } = withSetup(() => useNoteResize(makeNote()));

        startResize({ button: 2, clientX: 100, clientY: 100 });

        expect(isResizing.value).toBe(false);
        expect(mockBegin).not.toHaveBeenCalled();
        expect(add).not.toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(add).not.toHaveBeenCalledWith('mouseup', expect.any(Function));
        add.mockRestore();

        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 120 }));
        expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    test('unmount mid-drag removes the window listeners so later events do nothing', () => {
        const { startResize, app } = withSetup(() => useNoteResize(makeNote()));
        const remove = vi.spyOn(window, 'removeEventListener');

        startResize(leftDown(100, 100));
        app.unmount();
        mountedApps.splice(mountedApps.indexOf(app), 1);

        expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function));
        remove.mockRestore();

        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 120 }));
        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(mockUpdateNote).not.toHaveBeenCalled();
    });
});
