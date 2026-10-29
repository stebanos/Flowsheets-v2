import { beforeEach, describe, expect, it, vi } from 'vitest';

// The module is a singleton; resetModules gives each test a fresh state.
let useConnectDrag;

beforeEach(async () => {
    vi.resetModules();
    ({ useConnectDrag } = await import('./useConnectDrag'));
});

const source = { id: 'id-a', name: 'a' };

describe('useConnectDrag', () => {
    describe('initial state', () => {
        it('starts inactive with no source or target', () => {
            const { active, sourceId, sourceName, hoverTargetId } = useConnectDrag();
            expect(active.value).toBe(false);
            expect(sourceId.value).toBe(null);
            expect(sourceName.value).toBe(null);
            expect(hoverTargetId.value).toBe(null);
        });
    });

    describe('startConnect', () => {
        it('activates the drag and records the source and port position', () => {
            const { active, sourceId, sourceName, from, to, startConnect } = useConnectDrag();
            startConnect(source, { x: 10, y: 20 });
            expect(active.value).toBe(true);
            expect(sourceId.value).toBe('id-a');
            expect(sourceName.value).toBe('a');
            expect(from.value).toEqual({ x: 10, y: 20 });
            expect(to.value).toEqual({ x: 10, y: 20 });
        });

        it('shares state across callers (singleton)', () => {
            useConnectDrag().startConnect(source, { x: 0, y: 0 });
            expect(useConnectDrag().active.value).toBe(true);
        });
    });

    describe('updatePointer', () => {
        it('moves the wire end', () => {
            const { to, startConnect, updatePointer } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            updatePointer({ x: 50, y: 60 });
            expect(to.value).toEqual({ x: 50, y: 60 });
        });

        it('sets the hover target when one is passed', () => {
            const { hoverTargetId, startConnect, updatePointer } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            updatePointer({ x: 1, y: 1 }, 'id-b');
            expect(hoverTargetId.value).toBe('id-b');
        });

        it('leaves the hover target unchanged when none is passed', () => {
            const { hoverTargetId, setHoverTarget, startConnect, updatePointer } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            setHoverTarget('id-b');
            updatePointer({ x: 1, y: 1 });
            expect(hoverTargetId.value).toBe('id-b');
        });

        it('is ignored while inactive', () => {
            const { to, updatePointer } = useConnectDrag();
            updatePointer({ x: 5, y: 5 });
            expect(to.value).toEqual({ x: 0, y: 0 });
        });
    });

    describe('setHoverTarget / clearHoverTarget', () => {
        it('is ignored while inactive', () => {
            const { hoverTargetId, setHoverTarget } = useConnectDrag();
            setHoverTarget('id-b');
            expect(hoverTargetId.value).toBe(null);
        });

        it('clears only when the given id is the current target', () => {
            const { hoverTargetId, clearHoverTarget, setHoverTarget, startConnect } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            setHoverTarget('id-c');
            clearHoverTarget('id-b');
            expect(hoverTargetId.value).toBe('id-c');
            clearHoverTarget('id-c');
            expect(hoverTargetId.value).toBe(null);
        });
    });

    describe('drop', () => {
        it('returns the source name and target id and resets (happy path)', () => {
            const { active, hoverTargetId, sourceName, drop, setHoverTarget, startConnect, updatePointer } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            updatePointer({ x: 100, y: 100 });
            setHoverTarget('id-b');
            expect(drop()).toEqual({ sourceName: 'a', targetId: 'id-b' });
            expect(active.value).toBe(false);
            expect(sourceName.value).toBe(null);
            expect(hoverTargetId.value).toBe(null);
        });

        it('returns null on self-drop and resets', () => {
            const { active, drop, setHoverTarget, startConnect } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            setHoverTarget('id-a');
            expect(drop()).toBe(null);
            expect(active.value).toBe(false);
        });

        it('returns null when dropped on empty canvas', () => {
            const { active, drop, startConnect } = useConnectDrag();
            startConnect(source, { x: 0, y: 0 });
            expect(drop()).toBe(null);
            expect(active.value).toBe(false);
        });

        it('returns null when no drag is active', () => {
            const { drop } = useConnectDrag();
            expect(drop()).toBe(null);
        });
    });

    describe('cancel', () => {
        it('resets all drag state', () => {
            const { active, from, hoverTargetId, sourceId, sourceName, to, cancel, setHoverTarget, startConnect, updatePointer } = useConnectDrag();
            startConnect(source, { x: 3, y: 4 });
            updatePointer({ x: 9, y: 9 });
            setHoverTarget('id-b');
            cancel();
            expect(active.value).toBe(false);
            expect(sourceId.value).toBe(null);
            expect(sourceName.value).toBe(null);
            expect(hoverTargetId.value).toBe(null);
            expect(from.value).toEqual({ x: 0, y: 0 });
            expect(to.value).toEqual({ x: 0, y: 0 });
        });
    });

    describe('target registry', () => {
        it('calls the registered target insertReference with the source name', async () => {
            const { insertInto, registerTarget } = useConnectDrag();
            const insert = vi.fn().mockResolvedValue(undefined);
            registerTarget('id-b', insert);
            expect(await insertInto('id-b', 'a')).toBe(true);
            expect(insert).toHaveBeenCalledWith('a');
        });

        it('returns false for an unregistered target', async () => {
            const { insertInto } = useConnectDrag();
            expect(await insertInto('missing', 'a')).toBe(false);
        });

        it('no longer calls a target after unregisterTarget', async () => {
            const { insertInto, registerTarget, unregisterTarget } = useConnectDrag();
            const insert = vi.fn();
            registerTarget('id-b', insert);
            unregisterTarget('id-b');
            expect(await insertInto('id-b', 'a')).toBe(false);
            expect(insert).not.toHaveBeenCalled();
        });

        it('clears the hover target when that block unregisters mid-drag', () => {
            const { hoverTargetId, registerTarget, setHoverTarget, startConnect, unregisterTarget } = useConnectDrag();
            registerTarget('id-b', vi.fn());
            startConnect(source, { x: 0, y: 0 });
            setHoverTarget('id-b');
            unregisterTarget('id-b');
            expect(hoverTargetId.value).toBe(null);
        });

        it('cancels the drag when the source block unregisters mid-drag', () => {
            const { active, registerTarget, startConnect, unregisterTarget } = useConnectDrag();
            registerTarget('id-a', vi.fn());
            startConnect(source, { x: 0, y: 0 });
            unregisterTarget('id-a');
            expect(active.value).toBe(false);
        });
    });
});
