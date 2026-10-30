import ColorPicker from 'primevue/colorpicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Slider from 'primevue/slider';
import ToggleSwitch from 'primevue/toggleswitch';
import { normaliseHex, SLIDER_DEFAULTS, toFiniteNumber, toText } from './widget-codecs';

/**
 * Parameter widget registry — drives the config popover (type select + per-type fields),
 * the value ↔ code conversions, and the widget bar.
 * Config field types: 'number' (numeric input), 'list' (one string per line).
 * Per entry: `toCode(value)` → block code (a JS literal); `fromCode(value, config)` →
 * display value (normalised, clamped, with fallbacks); `validate(param)` → whether a
 * param config from the popover may be saved; `bar` → what the widget bar renders:
 * the PrimeVue component (imported explicitly — the auto-import resolver only sees
 * literal tags), `props(param, displayValue)` for its attributes, and `showValue`
 * for the mono readout next to it.
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
        validate: p => [p.min, p.max, p.step].every(Number.isFinite) && p.min < p.max && p.step > 0,
        bar: {
            component: Slider,
            props: (param, value) => ({
                class: 'flex-1 min-w-0',
                modelValue: value,
                min: param.min ?? SLIDER_DEFAULTS.min,
                max: param.max ?? SLIDER_DEFAULTS.max,
                step: param.step ?? SLIDER_DEFAULTS.step
            }),
            showValue: true
        }
    },
    text: {
        label: 'Text',
        configFields: [],
        toCode: value => JSON.stringify(toText(value)),
        fromCode: value => toText(value),
        validate: () => true,
        bar: {
            component: InputText,
            props: (param, value) => ({
                class: 'flex-1 min-w-0 h-5 py-0! px-1! text-[12px]!',
                modelValue: value
            })
        }
    },
    toggle: {
        label: 'Toggle',
        configFields: [],
        toCode: value => (value ? 'true' : 'false'),
        fromCode: value => Boolean(value),
        validate: () => true,
        bar: {
            component: ToggleSwitch,
            props: (param, value) => ({
                class: 'scale-75 origin-left',
                modelValue: value
            })
        }
    },
    color: {
        label: 'Color',
        configFields: [],
        toCode: value => JSON.stringify(normaliseHex(value)),
        fromCode: value => normaliseHex(value),
        validate: () => true,
        bar: {
            component: ColorPicker,
            props: (param, value) => ({
                appendTo: 'self',
                modelValue: value.slice(1)
            })
        }
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
        validate: p => p.options.length > 0,
        bar: {
            component: Select,
            props: (param, value) => ({
                class: 'flex-1 min-w-0 h-5 text-[12px]',
                appendTo: 'self',
                placeholder: 'Select…',
                options: param.options ?? [],
                modelValue: value
            })
        }
    }
};
