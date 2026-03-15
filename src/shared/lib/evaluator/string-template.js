import { extractFreeIdentifiers } from './ast';

/**
 * Wrap user-supplied template content in backticks to form a valid JS template literal.
 * Escapes any bare backticks in the input so they cannot break the wrapping.
 *
 * @param {string} code - raw template body (without surrounding backticks)
 * @returns {string} - a JS template literal expression string
 */
export function buildTemplateExpression(code) {
    const escaped = code.replace(/`/g, '\\`');
    return '`' + escaped + '`';
}

/**
 * Return a Set of free identifier names referenced inside ${...} expressions
 * in a template body (i.e. block code in isStringConcat mode).
 *
 * Escapes bare backticks before parsing so Acorn sees a valid template literal.
 * Reuses extractFreeIdentifiers — identifiers outside ${...} live in TemplateElement
 * quasis and are never visited as Identifier nodes, so no extra filtering is needed.
 *
 * @param {string} code - raw template body (without surrounding backticks)
 * @returns {Set<string>}
 */
export function extractTemplateIdentifiers(code) {
    const escaped = code.replace(/`/g, '\\`');
    return extractFreeIdentifiers('`' + escaped + '`');
}
