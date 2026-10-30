import { describe, expect, test } from 'vitest';
import { WIDGET_TYPES } from './widget-types';

const entries = Object.entries(WIDGET_TYPES);

describe('WIDGET_TYPES — shape', () => {
    test.each(entries)('%s has label, configFields, toCode, fromCode and validate', (_, def) => {
        expect(typeof def.label).toBe('string');
        expect(Array.isArray(def.configFields)).toBe(true);
        expect(typeof def.toCode).toBe('function');
        expect(typeof def.fromCode).toBe('function');
        expect(typeof def.validate).toBe('function');
    });
});

describe('WIDGET_TYPES — validate', () => {
    test('slider accepts a finite ascending range with a positive step', () => {
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 0, max: 1, step: 0.1 })).toBe(true);
    });

    test('slider rejects min >= max', () => {
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 1, max: 1, step: 0.1 })).toBe(false);
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 5, max: 1, step: 0.1 })).toBe(false);
    });

    test('slider rejects a non-positive or non-finite step', () => {
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 0, max: 1, step: 0 })).toBe(false);
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 0, max: 1, step: -1 })).toBe(false);
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 0, max: 1, step: NaN })).toBe(false);
    });

    test('slider rejects a non-finite bound', () => {
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: NaN, max: 1, step: 0.1 })).toBe(false);
        expect(WIDGET_TYPES.slider.validate({ widget: 'slider', min: 0, max: Infinity, step: 0.1 })).toBe(false);
    });

    test('options requires at least one option', () => {
        expect(WIDGET_TYPES.options.validate({ widget: 'options', options: ['a'] })).toBe(true);
        expect(WIDGET_TYPES.options.validate({ widget: 'options', options: [] })).toBe(false);
    });

    test.each(['text', 'toggle', 'color'])('%s is always valid', widget => {
        expect(WIDGET_TYPES[widget].validate({ widget })).toBe(true);
    });
});
