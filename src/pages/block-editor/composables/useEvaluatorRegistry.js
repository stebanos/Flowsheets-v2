import { reactive, computed, watch, effectScope } from 'vue';
import { evaluateInContext, buildTemplateExpression } from '@/domain/evaluator';

// ---------------------------------------------------------------------------
// Registry factory
// ---------------------------------------------------------------------------

/**
 * Create an evaluator registry for a set of blocks.
 * @param {import('vue').Ref<object[]>|object[]} blocks - reactive blocks array
 * @param {import('vue').ComputedRef<object>} dependsOn - computed dep map
 * @returns {{ getEvaluation: Function, dispose: Function }}
 */
export function useEvaluatorRegistry(blocks, dependsOn) {
    const results = reactive({});
    const evaluatorMap = new Map(); // Map<blockId, { scope: EffectScope, evaluator: ComputedRef }>
    const idToName = new Map();     // Map<blockId, blockName>
    const nameToId = new Map();     // Map<blockName, blockId>

    function createBlockEvaluator(block) {
        let lastCache = null;

        return computed(() => {
            const myDeps = dependsOn.value[block.name] || [];
            const modes = block.inputModes || {};

            // Deps in "each" mode whose current value is an array
            const iterDeps = myDeps.filter(dep => {
                const mode = modes[dep] ?? 'each';
                return mode === 'each' && Array.isArray(results[dep]);
            });

            if (iterDeps.length === 0) {
                const code = block.isStringConcat
                    ? buildTemplateExpression(block.code || '')
                    : (block.code || '');
                const out = evaluateInContext(
                    code,
                    block.name,
                    dependsOn.value,
                    n => results[n],
                    lastCache
                );
                lastCache = out.cache;
                results[block.name] = out.value;
                return { value: out.value, error: out.error };
            }

            // Iterate — zip to longest, filling short arrays with undefined
            const len = Math.max(...iterDeps.map(dep => results[dep].length));
            const resultArr = [];
            let firstError = null;

            for (let i = 0; i < len; i++) {
                const getVal = (n) => {
                    const mode = modes[n] ?? 'each';
                    return mode === 'each' && Array.isArray(results[n]) ? results[n][i] : results[n];
                };
                const iterCode = block.isStringConcat
                    ? buildTemplateExpression(block.code || '')
                    : (block.code || '');
                const out = evaluateInContext(iterCode, block.name, dependsOn.value, getVal, null);
                resultArr.push(out.error ? undefined : out.value);
                if (out.error && !firstError) { firstError = out.error; }
            }

            lastCache = null;
            results[block.name] = resultArr;
            return { value: resultArr, error: firstError };
        });
    }

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
                    evaluator = createBlockEvaluator(block);

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

    function dispose() {
        for (const { scope } of evaluatorMap.values()) { scope.stop(); }
        evaluatorMap.clear();
        idToName.clear();
        nameToId.clear();
    }

    return { getEvaluation, dispose };
}
