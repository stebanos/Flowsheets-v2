/**
 * Turn a filename into a valid JS identifier suitable for a block name.
 *
 * Block names are compiled as function parameters and used as reference
 * targets, so they must match /^[A-Za-z_$][A-Za-z0-9_$]*$/. This strips the
 * extension, replaces every other character with '_', prefixes '_' when the
 * result would start with a digit, and falls back to 'data' when empty.
 *
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeToIdentifier(filename) {
    const base = String(filename ?? '').replace(/\.[^.]*$/, '');
    let cleaned = base.replace(/[^A-Za-z0-9_$]/g, '_');
    if (cleaned.length === 0 || cleaned.replace(/_/g, '').length === 0) { return 'data'; }
    if (/^[0-9]/.test(cleaned)) { cleaned = '_' + cleaned; }
    return cleaned;
}
