import { ref, computed, reactive, watchEffect } from 'vue';
import { useBlockDependencies, useBlocks } from '.';

function tryEvalBodyScoped(body, scope, wrapWithScope = true) {
    try {
        const bodySrc = wrapWithScope ? `with (scope) { ${body} }` : body;
        const fn = new Function('scope', bodySrc);
        return { value: fn(scope), error: null };
    } catch (err) {
        return { value: null, error: err };
    }
}

function createBlockEvaluator(block, results) {
    const name = block.name;

    return computed(() => {
        const code = block.code || '';
        const scope = results;

        if (code.trim() === '') {
            results[name] = '';
            return { value: '', error: null };
        }

        const expr = tryEvalBodyScoped(`return (${code})`, scope, true);
        if (!expr.error) {
            results[name] = expr.value;
            return { value: expr.value, error: null };
        }

        const stmt = tryEvalBodyScoped(code, scope, true);
        if (!stmt.error) {
            results[name] = stmt.value;
            return { value: stmt.value, error: null };
        }

        results[name] = undefined;
        const err = stmt.error || expr.error;
        return { value: null, error: err ? (err.message || String(err)) : 'Unknown evaluation error' };
    });
}

const results = reactive({});

export function useEvaluationContext() {
    const { blocks } = useBlocks();
    const { dependsOn, identifiersByBlock } = useBlockDependencies();

    const ctx = reactive({});
    ctx.dependsOn = dependsOn;
    ctx.identifiersByBlock = identifiersByBlock;

    const evaluations = ref(new Map());
    const blockNames = ref(new Set());

    watchEffect(() => {
        const nextBlockNames = new Set(blocks.map(b => b.name));

        // Remove evaluators for deleted/renamed blocks
        for (const name of blockNames.value) {
            if (!nextBlockNames.has(name)) {
                evaluations.value.delete(name);
                delete results[name];
            }
        }

        // Add evaluators for new/renamed blocks
        for (const block of blocks) {
            if (!evaluations.value.has(block.name)) {
                evaluations.value.set(block.name, createBlockEvaluator(block, results));
            }
        }

        blockNames.value = nextBlockNames;
    });

    function getEvaluation(name) {
        const evaluator = evaluations.value.get(name);
        return evaluator ? evaluator.value : { value: null, error: `no block named "${name}"` };
    }

    return {
        ctx,
        getEvaluation
    };
}
