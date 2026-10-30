import { describe, expect, test } from 'vitest';
import { getVizDef, VIZ_PROPS, VIZ_TYPES } from './viz-types';

describe('VIZ_TYPES', () => {
    test('every entry has both behaviour flags', () => {
        for (const [key, def] of Object.entries(VIZ_TYPES)) {
            expect(typeof def.inMenu, `${key}.inMenu`).toBe('boolean');
            expect(typeof def.fillsContainer, `${key}.fillsContainer`).toBe('boolean');
        }
    });

    test('every component declares the shared VIZ_PROPS contract', () => {
        for (const [key, def] of Object.entries(VIZ_TYPES)) {
            expect(def.component.props, `${key}.component.props`).toBe(VIZ_PROPS);
        }
    });

    test('default grows with its content; custom is kept out of the flat menu', () => {
        expect(VIZ_TYPES.default.fillsContainer).toBe(false);
        expect(VIZ_TYPES.default.inMenu).toBe(true);
        expect(VIZ_TYPES.custom.inMenu).toBe(false);
    });
});

describe('getVizDef', () => {
    test('returns the entry for a known type', () => {
        expect(getVizDef('html')).toBe(VIZ_TYPES.html);
    });

    test('falls back to default for undefined', () => {
        expect(getVizDef(undefined)).toBe(VIZ_TYPES.default);
    });

    test('falls back to default for an unknown key', () => {
        expect(getVizDef('nope')).toBe(VIZ_TYPES.default);
    });
});
