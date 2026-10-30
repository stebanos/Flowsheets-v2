<script setup>
import { useBlockEval } from '@/features/block/evaluation';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    context: {
        type: Object,
        required: true
    },
    activeVizComponent: {
        type: [Object, Function],
        required: true
    }
});

const { error, isBlocked, isList, outputItems, value } = useBlockEval(props.block, props.context);
</script>

<template>
    <!-- v-if/v-else at the root is one root node: no wrapper, so the caller's layout is untouched.
         h-full fills a sized output area (canvas); min-h-6 keeps the 24px row where the
         container has no definite height (list cell, default viz). -->
    <div v-if="isBlocked"
         class="h-full min-h-6 w-full flex items-center bg-amber-50 text-amber-700 font-mono text-[.8125rem] px-2">
        blocked — upstream error
    </div>
    <component
        v-else
        :is="activeVizComponent"
        :value="value"
        :error="error"
        :block="block"
        :is-list="isList"
        :output-items="outputItems"
        :get-evaluation="context.getEvaluation"
        class="h-full w-full" />
</template>
