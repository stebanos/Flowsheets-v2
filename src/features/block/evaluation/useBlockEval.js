import { computed } from 'vue';
import { formatValue } from '@/shared/lib/format-value';

// Read-side view of one block's evaluation: everything a block renderer (canvas block,
// list cell) derives from the evaluation context, so the two never spell it out twice.
export function useBlockEval(block, context) {
    const blockEval = computed(() => context.getEvaluation(block.name));
    const status = computed(() => context.getStatus(block.name));
    const isBlocked = computed(() => status.value === 'blocked');
    const error = computed(() => blockEval.value?.error ?? null);
    const value = computed(() => blockEval.value?.value);
    // undefined = no usable value (error or missing) — the widget bar shows its "no value" state
    const paramValue = computed(() => blockEval.value?.error ? undefined : blockEval.value?.value);
    const isList = computed(() => Array.isArray(value.value));
    const outputItems = computed(() => isList.value ? value.value.map(formatValue) : []);
    const previousEval = computed(() => context.getPrevious?.(block.name) ?? null);

    return { blockEval, error, isBlocked, isList, outputItems, paramValue, previousEval, status, value };
}
