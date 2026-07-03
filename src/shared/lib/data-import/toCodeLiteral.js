/**
 * Serialise a JSON-compatible value to pretty JS-literal source.
 * JSON.stringify output is valid JS for every JSON value and is safe in the
 * evaluator's expression mode (`return (<code>)`); ${...} inside strings stays
 * a plain double-quoted string, not a template interpolation.
 *
 * @param {*} value
 * @returns {string}
 */
export function toCodeLiteral(value) {
    return JSON.stringify(value, null, 2);
}
