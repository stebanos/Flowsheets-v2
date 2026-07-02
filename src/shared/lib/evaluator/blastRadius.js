/**
 * Compute a per-block status by transitively propagating error state through
 * the dependency graph.
 *
 * status(n):
 *   - if any dep d of n has status(d) in {error, blocked} -> blocked
 *   - else if errorFlags[n] is truthy -> error (root cause)
 *   - else -> ok
 *
 * Blocked wins over a block's own error. Cycles are guarded against infinite
 * recursion; a node revisited while still on the DFS stack resolves as 'ok'
 * for that reference, so cyclic blocks surface via their own errorFlags entry.
 *
 * @param {Record<string, string[]>} dependsOn - blockName -> its direct deps
 * @param {Record<string, boolean>} errorFlags - blockName -> whether its own code errored
 * @returns {Record<string, 'ok'|'error'|'blocked'>}
 */
export function computeBlockStatuses(dependsOn, errorFlags) {
    const statuses = {};
    const stack = new Set();

    function resolve(name) {
        if (statuses[name]) {
            return statuses[name];
        }
        if (stack.has(name)) {
            return 'ok';
        }
        if (!(name in dependsOn)) {
            return 'ok';
        }

        stack.add(name);
        const deps = dependsOn[name] || [];
        const blocked = deps.some((dep) => {
            const depStatus = resolve(dep);
            return depStatus === 'error' || depStatus === 'blocked';
        });
        stack.delete(name);

        const status = blocked ? 'blocked' : (errorFlags[name] ? 'error' : 'ok');
        statuses[name] = status;
        return status;
    }

    for (const name of Object.keys(dependsOn)) {
        resolve(name);
    }

    return statuses;
}
