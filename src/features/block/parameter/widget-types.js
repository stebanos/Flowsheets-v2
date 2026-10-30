import { normaliseHex, SLIDER_DEFAULTS, toFiniteNumber, toText } from './widget-codecs';

/**
 * Parameter widget registry — drives the config popover (type select + per-type fields),
 * the value ↔ code conversions, and the widget bar.
 * Config field types: 'number' (numeric input), 'list' (one string per line).
 * Per entry: `toCode(value)` → block code (a JS literal); `fromCode(value, config)` →
 * display value (normalised, clamped, with fallbacks); `validate(param)` → whether a
 * param config from the popover may be saved.
 */
export const WIDGET_TYPES = {
    slider: {
        label: 'Slider',
        configFields: [
            { key: 'min', label: 'Min', type: 'number', default: SLIDER_DEFAULTS.min },
            { key: 'max', label: 'Max', type: 'number', default: SLIDER_DEFAULTS.max },
            { key: 'step', label: 'Step', type: 'number', default: SLIDER_DEFAULTS.step }
        ],
        toCode: value => String(toFiniteNumber(value) ?? 0),
        fromCode: (value, config) => {
            const min = config.min ?? SLIDER_DEFAULTS.min;
            const max = config.max ?? SLIDER_DEFAULTS.max;
            const n = toFiniteNumber(value);
            if (n === null) { return min; }
            return Math.min(max, Math.max(min, n));
        },
        validate: p => [p.min, p.max, p.step].every(Number.isFinite) && p.min < p.max && p.step > 0
    },
    text: {
        label: 'Text',
        configFields: [],
        toCode: value => JSON.stringify(toText(value)),
        fromCode: value => toText(value),
        validate: () => true
    },
    toggle: {
        label: 'Toggle',
        configFields: [],
        toCode: value => (value ? 'true' : 'false'),
        fromCode: value => Boolean(value),
        validate: () => true
    },
    color: {
        label: 'Color',
        configFields: [],
        toCode: value => JSON.stringify(normaliseHex(value)),
        fromCode: value => normaliseHex(value),
        validate: () => true
    },
    options: {
        label: 'Options',
        configFields: [
            { key: 'options', label: 'Options (one per line)', type: 'list', default: [] }
        ],
        toCode: value => JSON.stringify(toText(value)),
        fromCode: (value, config) => {
            if (typeof value !== 'string') { return null; }
            return (config.options ?? []).includes(value) ? value : null;
        },
        validate: p => p.options.length > 0
    }
};
