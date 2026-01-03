import { computed, reactive } from 'vue';
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

    const evaluations = computed(() => {
        const map = {};
        for (const block of blocks) {
            const name = block.name;
            map[name] = createBlockEvaluator(block, results);
        }
        return map;
    });

    function getEvaluation(name) {
        const map = evaluations.value;
        const c = map && map[name];
        return c ? c.value : { value: null, error: `no block named "${name}"` };
    }

    return {
        ctx,
        getEvaluation
    };
}
