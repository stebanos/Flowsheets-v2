<script setup>
import { computed } from 'vue';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import { safeStringify } from './safeStringify';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});

// null has typeof 'object' so it's not a primitive here (JSON null is valid and useful).
const isPrimitive = computed(() => !props.error && props.value !== null && typeof props.value !== 'object');

const effectiveError = computed(() => {
    if (props.error) { return props.error; }
    if (isPrimitive.value) { return `JSON viz requires an object or array — got ${typeof props.value}`; }
    return null;
});

const highlighted = computed(() => {
    if (effectiveError.value) { return ''; }
    return Prism.highlight(safeStringify(props.value), Prism.languages.json, 'json');
});
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">
        <pre class="viz-highlighted px-2 py-1 text-[12px] font-mono leading-[1.4] overflow-auto flex-1 whitespace-pre-wrap wrap-break-word" @wheel.stop
             :class="effectiveError ? 'text-red-600' : ''"
             v-if="!effectiveError" v-html="highlighted" />
        <pre class="px-2 py-1 text-[12px] font-mono leading-[1.4] overflow-auto flex-1 whitespace-pre-wrap wrap-break-word text-red-600"
             v-else>{{ effectiveError }}</pre>
    </div>
</template>

<style scoped>
.viz-highlighted :deep(.token.number)     { color: var(--color-tomorrow-number); }
.viz-highlighted :deep(.token.string)     { color: var(--color-tomorrow-string); }
.viz-highlighted :deep(.token.boolean),
.viz-highlighted :deep(.token.null)       { color: var(--color-tomorrow-keyword); }
.viz-highlighted :deep(.token.punctuation){ color: inherit; }
</style>
