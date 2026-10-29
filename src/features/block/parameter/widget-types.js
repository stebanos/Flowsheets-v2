import { SLIDER_DEFAULTS } from './paramCodec';

/**
 * Parameter widget registry — drives the config popover (type select + per-type fields)
 * and the widget bar. Widgets themselves are auto-imported PrimeVue tags in ParamWidgetBar.
 * Config field types: 'number' (numeric input), 'list' (one string per line).
 */
export const WIDGET_TYPES = {
    slider: {
        label: 'Slider',
        configFields: [
            { key: 'min', label: 'Min', type: 'number', default: SLIDER_DEFAULTS.min },
            { key: 'max', label: 'Max', type: 'number', default: SLIDER_DEFAULTS.max },
            { key: 'step', label: 'Step', type: 'number', default: SLIDER_DEFAULTS.step }
        ]
    },
    text: { label: 'Text', configFields: [] },
    toggle: { label: 'Toggle', configFields: [] },
    color: { label: 'Color', configFields: [] },
    options: {
        label: 'Options',
        configFields: [
            { key: 'options', label: 'Options (one per line)', type: 'list', default: [] }
        ]
    }
};
