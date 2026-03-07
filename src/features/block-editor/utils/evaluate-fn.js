// Globals shadowed with undefined inside every compiled function.
// Note: 'eval' and 'arguments' cannot be shadowed via strict-mode parameters.
const BLOCKED_GLOBALS = [
    'fetch',
    'XMLHttpRequest',
    'document',
    'window',
    'localStorage',
    'sessionStorage',
    'navigator',
    'location',
];

/**
 * Compile a strict-mode Function with depNames as parameters.
 * Blocked globals are appended as extra parameters (shadowed with undefined on call).
 *
 * @param {string} code
 * @param {string[]} depNames
 * @param {boolean} isExpression - true wraps code in `return (...)`, false uses code as-is
 * @returns {Function}
 * @throws {SyntaxError} if the code cannot be compiled
 */
function compileFn(code, depNames, isExpression) {
    const extra = BLOCKED_GLOBALS.filter(g => !depNames.includes(g));
    const params = [...depNames, ...extra];
    const body = isExpression
        ? `'use strict'; return (${code})`
        : `'use strict'; ${code}`;
    return new Function(...params, body);
}

/**
 * Call a function compiled by compileFn with the given dep values.
 * Blocked globals (appended params) receive undefined.
 *
 * @param {Function} fn
 * @param {string[]} depNames
 * @param {any[]} depValues
 * @returns {{ value: any, error: string|null }}
 */
function callFn(fn, depNames, depValues) {
    const extra = BLOCKED_GLOBALS.filter(g => !depNames.includes(g));
    const args = [...depValues, ...extra.map(() => undefined)];
    try {
        const value = fn(...args);
        return { value, error: null };
    } catch (err) {
        return { value: null, error: err.message || String(err) };
    }
}

/**
 * Evaluate a block's code with explicit dependency injection.
 * Tries expression mode first, falls back to statement mode.
 * Uses cachedEntry to skip recompilation when code and deps are unchanged.
 *
 * @param {string} code
 * @param {string[]} depNames
 * @param {any[]} depValues
 * @param {{ compiledFn: Function, isExpression: boolean, forCode: string, forDeps: string }|null} cachedEntry
 * @returns {{ value: any, error: string|null, compiledFn: Function|null, isExpression: boolean|null, forCode: string, forDeps: string }}
 */
function evaluateBlock(code, depNames, depValues, cachedEntry = null) {
    const depSig = depNames.join('\0');
    let fn, isExpression;

    const cacheHit = cachedEntry
        && cachedEntry.forCode === code
        && cachedEntry.forDeps === depSig;

    if (cacheHit) {
        fn = cachedEntry.compiledFn;
        isExpression = cachedEntry.isExpression;
    } else {
        // Try expression first (optimistic path)
        try {
            fn = compileFn(code, depNames, true);
            isExpression = true;
        } catch (_) {
            // Fall back to statement
            try {
                fn = compileFn(code, depNames, false);
                isExpression = false;
            } catch (stmtErr) {
                return {
                    value: null,
                    error: stmtErr.message || String(stmtErr),
                    compiledFn: null,
                    isExpression: null,
                    forCode: code,
                    forDeps: depSig,
                };
            }
        }
    }

    const { value, error } = callFn(fn, depNames, depValues);
    return {
        value,
        error,
        compiledFn: fn,
        isExpression,
        forCode: code,
        forDeps: depSig,
    };
}

export { compileFn, callFn, evaluateBlock, BLOCKED_GLOBALS };
