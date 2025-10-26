import { computed, reactive } from 'vue';
import { useBlocks } from '.';

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

    const evaluations = computed(() => {
        const map = {};
        for (const block of blocks) {
            const name = block.name;
            map[name] = createBlockEvaluator(block, results);
        }
        return map;
    });

    function getEvaluation(name) {
        return computed(() => {
            const map = evaluations.value;
            const c = map && map[name];
            return c ? c.value : { value: null, error: `no block named "${name}"` };
        });
    }

    const values = computed(() => {
        const out = {};
        const map = evaluations.value;
        for (const n in map) {
            const res = map[n].value;
            out[n] = res ? res.value : undefined;
        }
        return out;
    });

    return {
        getEvaluation,
        values
    };
}
