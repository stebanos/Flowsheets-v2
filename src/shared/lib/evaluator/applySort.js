import { compileFn, callFn } from './evaluate-fn';
import { extractFreeIdentifiers } from './ast';

/**
 * Apply a JS sort-key expression to an array value.
 * - If `sortClause` is null/empty or `value` is not an array, returns `{ value, error: null }` unchanged.
 * - `item` is the bound variable for the current element.
 * - Other free identifiers that match block names are injected as deps.
 * - Per-item key errors are treated as `null` (item sorts to front).
 * - A syntax error in the sort expression returns `{ value: null, error }`.
 *
 * @param {*} value - the block's current output value
 * @param {string|null} sortClause - the sort-key expression string
 * @param {function(string): *} getResult - look up another block's current value by name
 * @param {Set<string>} allBlockNames - set of all block names in the sheet
 * @returns {{ value: *, error: string|null }}
 */
export function applySort(value, sortClause, getResult, allBlockNames) {
    if (!sortClause || !sortClause.trim() || !Array.isArray(value)) {
        return { value, error: null };
    }

    const freeIds = extractFreeIdentifiers(sortClause);
    const depNames = Array.from(freeIds).filter(id => id !== 'item' && allBlockNames.has(id));
    const allParams = ['item', ...depNames];

    let fn;
    try {
        fn = compileFn(sortClause, allParams, true);
    } catch (err) {
        return { value: null, error: err.message || String(err) };
    }

    const depValues = depNames.map(getResult);

    const getKey = (item) => {
        const { value: key, error } = callFn(fn, allParams, [item, ...depValues]);
        return error ? null : key;
    };

    const sorted = value.slice().sort((a, b) => {
        const ka = getKey(a);
        const kb = getKey(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

    return { value: sorted, error: null };
}
