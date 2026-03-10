/**
 * Detect a cycle in a dependency map starting from startName.
 * Returns the cycle path as an array if found, or null if none.
 * @param {string} startName
 * @param {Record<string, string[]>} depMap
 * @returns {string[]|null}
 */
export function findCycle(startName, depMap) {
    const path = [];
    const visited = new Set();

    function dfs(current) {
        const pathIdx = path.indexOf(current);
        if (pathIdx !== -1) {
            return [...path.slice(pathIdx), current];
        }
        if (visited.has(current)) {
            return null;
        }
        visited.add(current);
        path.push(current);
        for (const dep of (depMap[current] || [])) {
            const cycle = dfs(dep);
            if (cycle) { return cycle; }
        }
        path.pop();
        return null;
    }

    return dfs(startName);
}
