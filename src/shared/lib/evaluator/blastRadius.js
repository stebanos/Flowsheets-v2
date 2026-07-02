/**
 * Find every node in a dependsOn graph that participates in a cycle, i.e.
 * can reach itself by following one or more dependsOn edges.
 *
 * @param {Record<string, string[]>} dependsOn - blockName -> its direct deps
 * @returns {Set<string>} names of nodes that are members of some cycle
 */
function findCycleMembers(dependsOn) {
    const members = new Set();

    function canReach(start, target, visited) {
        for (const dep of (dependsOn[start] || [])) {
            if (dep === target) {
                return true;
            }
            if (visited.has(dep)) {
                continue;
            }
            visited.add(dep);
            if (canReach(dep, target, visited)) {
                return true;
            }
        }
        return false;
    }

    for (const name of Object.keys(dependsOn)) {
        if (canReach(name, name, new Set())) {
            members.add(name);
        }
    }

    return members;
}

/**
 * Compute a per-block status by transitively propagating error state through
 * the dependency graph.
 *
 * status(n):
 *   - if n is a member of a dependency cycle -> error (a cycle member has its
 *     own genuine "Circular dependency" error; it is never an innocent
 *     downstream victim)
 *   - else if any dep d of n has status(d) in {error, blocked} -> blocked
 *   - else if errorFlags[n] is truthy -> error (root cause)
 *   - else -> ok
 *
 * Blocked wins over a block's own error for non-cyclic blocks. Cycle
 * membership is detected structurally from dependsOn and short-circuits
 * before recursing into deps, so cyclic nodes never rely on the on-stack
 * guard below (kept as a harmless safety net).
 *
 * @param {Record<string, string[]>} dependsOn - blockName -> its direct deps
 * @param {Record<string, boolean>} errorFlags - blockName -> whether its own code errored
 * @returns {Record<string, 'ok'|'error'|'blocked'>}
 */
export function computeBlockStatuses(dependsOn, errorFlags) {
    const statuses = {};
    const stack = new Set();
    const cycleMembers = findCycleMembers(dependsOn);

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

        if (cycleMembers.has(name)) {
            statuses[name] = 'error';
            return 'error';
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
