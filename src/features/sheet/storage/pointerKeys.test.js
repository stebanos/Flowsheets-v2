import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEY_ACTIVE_ID, KEY_OPEN_IDS, readActiveId, readOpenIds, writeActiveId, writeOpenIds } from './pointerKeys';

function makeFakeStorage() {
    const store = {};
    return {
        getItem:    (k)    => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
        setItem:    (k, v) => { store[k] = String(v); },
        removeItem: (k)    => { delete store[k]; },
        _store:     store
    };
}

let fakeStorage;

beforeEach(() => {
    fakeStorage = makeFakeStorage();
    vi.stubGlobal('localStorage', fakeStorage);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('active id', () => {
    it('returns null when nothing is stored', () => {
        expect(readActiveId()).toBeNull();
    });

    it('round-trips under the v2 key', () => {
        writeActiveId('sheet:local/a');
        expect(fakeStorage._store[KEY_ACTIVE_ID]).toBe('sheet:local/a');
        expect(readActiveId()).toBe('sheet:local/a');
    });
});

describe('open ids', () => {
    it('returns the fallback when nothing is stored', () => {
        expect(readOpenIds(['x'])).toEqual(['x']);
    });

    it('round-trips as JSON under the v2 key', () => {
        writeOpenIds(['a', 'b']);
        expect(fakeStorage._store[KEY_OPEN_IDS]).toBe('["a","b"]');
        expect(readOpenIds([])).toEqual(['a', 'b']);
    });

    it('returns the fallback when the stored value is not valid JSON', () => {
        fakeStorage._store[KEY_OPEN_IDS] = '{not json';
        expect(readOpenIds(['fallback'])).toEqual(['fallback']);
    });
});
