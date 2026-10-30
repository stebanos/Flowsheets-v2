import { describe, expect, test } from 'vitest';
import { SLIDER_DEFAULTS } from './widget-codecs';
import { WIDGET_TYPES } from './widget-types';

const entries = Object.entries(WIDGET_TYPES);

describe('WIDGET_TYPES — shape', () => {
    test.each(entries)('%s has label, configFields, toCode, fromCode, validate and bar', (_, def) => {
        expect(typeof def.label).toBe('string');
        expect(Array.isArray(def.configFields)).toBe(true);
        expect(typeof def.toCode).toBe('function');
        expect(typeof def.fromCode).toBe('function');
        expect(typeof def.validate).toBe('function');
        expect(def.bar).toBeTypeOf('object');
        expect(def.bar.component).toBeDefined();
        expect(typeof def.bar.props).toBe('function');
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

describe('WIDGET_TYPES — bar props', () => {
    test('slider applies SLIDER_DEFAULTS when the param omits min/max/step', () => {
        const props = WIDGET_TYPES.slider.bar.props({ widget: 'slider' }, 5);
        expect(props.min).toBe(SLIDER_DEFAULTS.min);
        expect(props.max).toBe(SLIDER_DEFAULTS.max);
        expect(props.step).toBe(SLIDER_DEFAULTS.step);
        expect(props.modelValue).toBe(5);
    });

    test('slider passes the configured range through', () => {
        const props = WIDGET_TYPES.slider.bar.props({ widget: 'slider', min: 0, max: 1, step: 0.01 }, 0.5);
        expect(props).toMatchObject({ min: 0, max: 1, step: 0.01 });
    });

    test('slider shows the readout', () => {
        expect(WIDGET_TYPES.slider.bar.showValue).toBe(true);
    });

    test('color strips the # for the picker', () => {
        expect(WIDGET_TYPES.color.bar.props({ widget: 'color' }, '#ff8800').modelValue).toBe('ff8800');
    });

    test('options passes the list and an empty fallback', () => {
        expect(WIDGET_TYPES.options.bar.props({ widget: 'options', options: ['a', 'b'] }, 'a').options).toEqual(['a', 'b']);
        expect(WIDGET_TYPES.options.bar.props({ widget: 'options' }, null).options).toEqual([]);
    });
});
