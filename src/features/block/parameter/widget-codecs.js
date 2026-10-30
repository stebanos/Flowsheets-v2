/**
 * Pure value helpers shared by the widget registry and the codec dispatchers.
 * Kept separate so `widget-types.js` and `paramCodec.js` don't import each other.
 */

export const SLIDER_DEFAULTS = { min: 0, max: 100, step: 1 };

const HEX_RE = /^#?([0-9a-f]{6})$/i;
const FALLBACK_COLOR = '#000000';

export function normaliseHex(value) {
    if (typeof value !== 'string') { return FALLBACK_COLOR; }
    const match = HEX_RE.exec(value.trim());
    return match ? `#${match[1].toLowerCase()}` : FALLBACK_COLOR;
}

export function toFiniteNumber(value) {
    if (typeof value === 'number') { return Number.isFinite(value) ? value : null; }
    if (typeof value !== 'string' || value.trim() === '') { return null; }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function toText(value) {
    if (value === undefined || value === null) { return ''; }
    if (typeof value === 'string') { return value; }
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
}
