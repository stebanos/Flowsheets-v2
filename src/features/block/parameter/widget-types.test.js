import { describe, expect, test } from 'vitest';
import { WIDGET_TYPES } from './widget-types';

const entries = Object.entries(WIDGET_TYPES);

describe('WIDGET_TYPES — shape', () => {
    test.each(entries)('%s has label, configFields, toCode and fromCode', (_, def) => {
        expect(typeof def.label).toBe('string');
        expect(Array.isArray(def.configFields)).toBe(true);
        expect(typeof def.toCode).toBe('function');
        expect(typeof def.fromCode).toBe('function');
    });
});
