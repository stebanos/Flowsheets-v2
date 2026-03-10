import { evaluateBlock } from './evaluate-fn';
import { findCycle } from './findCycle';

/**
 * Evaluate a block's code given a dependency map and a result getter.
 * Pure function — no Vue, no reactivity.
 *
 * @param {string} code
 * @param {string} name - block's own name
 * @param {Record<string, string[]>} depMap - full dependency map
 * @param {function(string): *} getResult - look up another block's current value
 * @param {*} lastCache - previous evaluateBlock cache (pass null on first call)
 * @returns {{ value: *, error: string|null, cache: * }}
 */
export function evaluateInContext(code, name, depMap, getResult, lastCache) {
    if (code.trim() === '') {
        return { value: '', error: null, cache: null };
    }

    const cycle = findCycle(name, depMap);
    if (cycle) {
        return { value: null, error: `Circular dependency: ${cycle.join(' \u2192 ')}`, cache: null };
    }

    const depNames = depMap[name] || [];
    const depValues = depNames.map(getResult);
    const result = evaluateBlock(code, depNames, depValues, lastCache);
    return { value: result.value, error: result.error, cache: result };
}
