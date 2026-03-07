import { reactive, computed, watch, effectScope } from 'vue';
import { useBlockDependencies, useBlocks } from '.';
import { evaluateBlock } from '../utils/evaluate-fn.js';

// Module-level singletons — shared across all callers (single app instance).
const results = reactive({});
const evaluatorMap = new Map(); // Map<blockId, { scope: EffectScope, evaluator: ComputedRef }>
const idToName = new Map();     // Map<blockId, blockName> — for cleanup on delete
const nameToId = new Map();     // Map<blockName, blockId> — for O(1) getEvaluation lookup

// ---------------------------------------------------------------------------
// Cycle detection (DFS)
// ---------------------------------------------------------------------------

function findCycle(startName, depMap) {
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

// ---------------------------------------------------------------------------
// Per-block evaluator
// ---------------------------------------------------------------------------

function createBlockEvaluator(block, dependsOn) {
    let lastCache = null;

    return computed(() => {
        const code = block.code || '';
        const name = block.name;

        if (code.trim() === '') {
            results[name] = '';
            return { value: '', error: null };
        }

        const depMap = dependsOn.value;

        const cycle = findCycle(name, depMap);
        if (cycle) {
            results[name] = undefined;
            return { value: null, error: `Circular dependency: ${cycle.join(' \u2192 ')}` };
        }

        const depNames = depMap[name] || [];
        const depValues = depNames.map(n => results[n]);

        const result = evaluateBlock(code, depNames, depValues, lastCache);
        lastCache = result;
        results[name] = result.value;

        return { value: result.value, error: result.error };
    });
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useEvaluationContext() {
    const { blocks } = useBlocks();
    const { dependsOn } = useBlockDependencies({ debounceMs: 0 });

    // Watch block ids only — fires on add/remove, not on rename/code/position changes.
    watch(
        () => blocks.map(b => b.id),
        (nextIds, prevIds) => {
            const prevSet = new Set(prevIds || []);
            const nextSet = new Set(nextIds);

            // Remove evaluators for deleted blocks
            for (const id of prevSet) {
                if (nextSet.has(id)) { continue; }
                const entry = evaluatorMap.get(id);
                if (!entry) { continue; }
                entry.scope.stop();
                evaluatorMap.delete(id);
                const name = idToName.get(id);
                if (name) {
                    delete results[name];
                    nameToId.delete(name);
                }
                idToName.delete(id);
            }

            // Add evaluators for new blocks
            for (const id of nextSet) {
                if (prevSet.has(id)) { continue; }
                const block = blocks.find(b => b.id === id);
                if (!block) { continue; }

                const scope = effectScope();
                let evaluator;
                scope.run(() => {
                    evaluator = createBlockEvaluator(block, dependsOn);

                    // Track renames — clean up stale results/nameToId entries
                    watch(
                        () => block.name,
                        (newName, oldName) => {
                            if (oldName && oldName !== newName) {
                                delete results[oldName];
                                nameToId.delete(oldName);
                            }
                            idToName.set(id, newName);
                            nameToId.set(newName, id);
                        },
                        { immediate: true }
                    );
                });

                evaluatorMap.set(id, { scope, evaluator });
            }
        },
        { immediate: true }
    );

    function getEvaluation(name) {
        const id = nameToId.get(name);
        if (!id) { return { value: null, error: `no block named "${name}"` }; }
        const entry = evaluatorMap.get(id);
        return entry ? entry.evaluator.value : { value: null, error: `no block named "${name}"` };
    }

    return {
        getEvaluation
    };
}
