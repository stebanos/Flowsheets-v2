/**
 * Pure conversions between a parameter widget's value and the block code it writes.
 * The widget is an alternate editor for `block.code`: every write is a valid JS literal.
 */

export const SLIDER_DEFAULTS = { min: 0, max: 100, step: 1 };

const HEX_RE = /^#?([0-9a-f]{6})$/i;
const FALLBACK_COLOR = '#000000';

function normaliseHex(value) {
    if (typeof value !== 'string') { return FALLBACK_COLOR; }
    const match = HEX_RE.exec(value.trim());
    return match ? `#${match[1].toLowerCase()}` : FALLBACK_COLOR;
}

function toFiniteNumber(value) {
    if (typeof value === 'number') { return Number.isFinite(value) ? value : null; }
    if (typeof value !== 'string' || value.trim() === '') { return null; }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function toText(value) {
    if (value === undefined || value === null) { return ''; }
    if (typeof value === 'string') { return value; }
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
}

/**
 * Widget value → block code (a JS literal).
 * @param {'slider'|'text'|'toggle'|'color'|'options'} widget
 * @param {*} value
 * @returns {string}
 */
export function valueToCode(widget, value) {
    switch (widget) {
    case 'slider': return String(toFiniteNumber(value) ?? 0);
    case 'toggle': return value ? 'true' : 'false';
    case 'text': return JSON.stringify(toText(value));
    case 'color': return JSON.stringify(normaliseHex(value));
    case 'options': return JSON.stringify(toText(value));
    default: throw new Error(`Unknown parameter widget: ${widget}`);
    }
}

/**
 * Evaluated block value → widget display value (normalised, clamped, with fallbacks).
 * @param {'slider'|'text'|'toggle'|'color'|'options'} widget
 * @param {*} value - the block's evaluated value
 * @param {{ min?: number, max?: number, options?: string[] }} [config] - the block's param config
 * @returns {*} - `null` only for options when the value isn't in the list (placeholder)
 */
export function codeToValue(widget, value, config = {}) {
    switch (widget) {
    case 'slider': {
        const min = config.min ?? SLIDER_DEFAULTS.min;
        const max = config.max ?? SLIDER_DEFAULTS.max;
        const n = toFiniteNumber(value);
        if (n === null) { return min; }
        return Math.min(max, Math.max(min, n));
    }
    case 'toggle': return Boolean(value);
    case 'text': return toText(value);
    case 'color': return normaliseHex(value);
    case 'options': {
        if (typeof value !== 'string') { return null; }
        return (config.options ?? []).includes(value) ? value : null;
    }
    default: throw new Error(`Unknown parameter widget: ${widget}`);
    }
}
