import { computed, isRef } from 'vue';

function tryEvalBody(body) {
    try {
        const fn = new Function(body);
        return { value: fn(), error: null };
    } catch (err) {
        return { value: null, error: err };
    }
}

export function useCodeEvaluation(source) {
    const codeSource = computed(() => {
        if (typeof source === 'function') { return source(); }
        if (isRef(source)) {return source.value; }
        return source;
    });

    const evaluation = computed(() => {
        const code = codeSource.value || '';

        const expr = tryEvalBody('return (' + code + ')');
        if (!expr.error) { return expr; }

        const stmt = tryEvalBody(code);
        if (!stmt.error) { return stmt; }

        const err = stmt.error || expr.error;
        return { value: null, error: err ? (err.message || String(err)) : 'Unknown evaluation error' };
    });

    const formattedResult = computed(() => {
        if (evaluation.value && evaluation.value.error) { return 'null'; }
        const v = evaluation.value ? evaluation.value.value : undefined;
        if (v === undefined) { return 'undefined'; }
        if (v === null) { return 'null'; }
        if (typeof v === 'string') { return v; }
        try {
            return JSON.stringify(v);
        } catch {
            return String(v);
        }
    });

    return {
        evaluation,
        formattedResult
    };
}

