import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLSStrategy } from './useLSStrategy';

const KEY_CATALOGUE = 'flowsheets.v2.catalogue';
const KEY_SHEET     = (id) => `flowsheets.v2.sheet.${id}`;

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

describe('loadCatalogue', () => {
    it('returns [] when the key is missing', async () => {
        await expect(useLSStrategy().loadCatalogue()).resolves.toEqual([]);
    });

    it('returns the stored array', async () => {
        const entries = [{ id: 'a', name: 'A' }];
        fakeStorage.setItem(KEY_CATALOGUE, JSON.stringify(entries));
        await expect(useLSStrategy().loadCatalogue()).resolves.toEqual(entries);
    });

    it('rejects on invalid JSON', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, 'not json');
        await expect(useLSStrategy().loadCatalogue()).rejects.toThrow();
    });

    it('rejects when the stored value is not an array', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, '{"id":"a"}');
        await expect(useLSStrategy().loadCatalogue()).rejects.toThrow();
    });
});

describe('catalogue writers', () => {
    it('writeSheet does not replace a corrupt catalogue', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, 'not json');
        await expect(useLSStrategy().writeSheet('a', 'A', { blocks: [], customVizes: {} })).rejects.toThrow();
        expect(fakeStorage.getItem(KEY_CATALOGUE)).toBe('not json');
    });

    it('renameSheet does not replace a corrupt catalogue', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, 'not json');
        await expect(useLSStrategy().renameSheet('a', 'B')).rejects.toThrow();
        expect(fakeStorage.getItem(KEY_CATALOGUE)).toBe('not json');
    });

    it('deleteSheet does not replace a corrupt catalogue', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, 'not json');
        await expect(useLSStrategy().deleteSheet('a')).rejects.toThrow();
        expect(fakeStorage.getItem(KEY_CATALOGUE)).toBe('not json');
    });

    it('initSheet does not replace a corrupt catalogue', async () => {
        fakeStorage.setItem(KEY_CATALOGUE, 'not json');
        await expect(useLSStrategy().initSheet('a', 'A')).rejects.toThrow();
        expect(fakeStorage.getItem(KEY_CATALOGUE)).toBe('not json');
    });
});

describe('sheet shape', () => {
    it('readSheet returns an empty sheet with customVizes {} when the sheet is missing', async () => {
        const sheet = await useLSStrategy().readSheet('missing');
        expect(sheet.blocks).toEqual([]);
        expect(sheet.customVizes).toEqual({});
        expect(Array.isArray(sheet.customVizes)).toBe(false);
    });

    it('readSheet rejects on corrupt sheet data', async () => {
        fakeStorage.setItem(KEY_SHEET('a'), 'not json');
        await expect(useLSStrategy().readSheet('a')).rejects.toThrow();
    });

    it('initSheet writes customVizes {}', async () => {
        await useLSStrategy().initSheet('a', 'A');
        const stored = JSON.parse(fakeStorage.getItem(KEY_SHEET('a')));
        expect(stored.blocks).toEqual([]);
        expect(stored.customVizes).toEqual({});
        expect(Array.isArray(stored.customVizes)).toBe(false);
        expect(JSON.parse(fakeStorage.getItem(KEY_CATALOGUE)).map(s => s.id)).toEqual(['a']);
    });
});
