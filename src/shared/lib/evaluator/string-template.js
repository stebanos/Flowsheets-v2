import { parser } from '@lezer/javascript';
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

/**
 * Auto-detect whether code should be treated as a template literal body.
 * Returns true if the code contains a ${...} interpolation AND is not valid JavaScript —
 * i.e., the entire expression is a template literal body, not JS that uses template syntax internally.
 *
 * @param {string} code
 * @returns {boolean}
 */
function isValidJS(code) {
    const tree = parser.parse(code);
    let hasError = false;
    tree.iterate({ enter: node => { if (node.type.isError) hasError = true; } });
    return !hasError;
}

export function detectStringMode(code) {
    return /\$\{/.test(code) && !isValidJS(code);
}
