import { compileFn, callFn } from './evaluate-fn';
import { extractFreeIdentifiers } from './ast';

/**
 * Apply a JS filter expression to an array value.
 * - If `filterClause` is null/empty or `value` is not an array, returns `{ value, error: null }` unchanged.
 * - `item` is the bound variable for the current element.
 * - Other free identifiers that match block names are injected as deps.
 * - Per-item errors are treated as falsy (item excluded).
 * - A syntax error in the filter expression returns `{ value: null, error }`.
 *
 * @param {*} value - the block's current output value
 * @param {string|null} filterClause - the filter expression string
 * @param {function(string): *} getResult - look up another block's current value by name
 * @param {Set<string>} allBlockNames - set of all block names in the sheet
 * @returns {{ value: *, error: string|null }}
 */
export function applyFilter(value, filterClause, getResult, allBlockNames) {
    if (!filterClause || !filterClause.trim() || !Array.isArray(value)) {
        return { value, error: null };
    }

    const freeIds = extractFreeIdentifiers(filterClause);
    const depNames = Array.from(freeIds).filter(id => id !== 'item' && allBlockNames.has(id));
    const allParams = ['item', ...depNames];

    let fn;
    try {
        fn = compileFn(filterClause, allParams, true);
    } catch (err) {
        return { value: null, error: err.message || String(err) };
    }

    const depValues = depNames.map(getResult);
    const filtered = [];

    for (const item of value) {
        const { value: passes, error } = callFn(fn, allParams, [item, ...depValues]);
        if (!error && passes) {
            filtered.push(item);
        }
    }

    return { value: filtered, error: null };
}