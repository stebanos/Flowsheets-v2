/**
 * Pure conversions between a parameter widget's value and the block code it writes.
 * The widget is an alternate editor for `block.code`: every write is a valid JS literal.
 * The per-widget rules live on the WIDGET_TYPES entries; these are the dispatchers.
 */
import { WIDGET_TYPES } from './widget-types';

export { SLIDER_DEFAULTS } from './widget-codecs';

function widgetDef(widget) {
    const def = WIDGET_TYPES[widget];
    if (!def) { throw new Error(`Unknown parameter widget: ${widget}`); }
    return def;
}

/**
 * Widget value → block code (a JS literal).
 * @param {'slider'|'text'|'toggle'|'color'|'options'} widget
 * @param {*} value
 * @returns {string}
 */
export function valueToCode(widget, value) {
    return widgetDef(widget).toCode(value);
}

/**
 * Evaluated block value → widget display value (normalised, clamped, with fallbacks).
 * @param {'slider'|'text'|'toggle'|'color'|'options'} widget
 * @param {*} value - the block's evaluated value
 * @param {{ min?: number, max?: number, options?: string[] }} [config] - the block's param config
 * @returns {*} - `null` only for options when the value isn't in the list (placeholder)
 */
export function codeToValue(widget, value, config = {}) {
    return widgetDef(widget).fromCode(value, config);
}
