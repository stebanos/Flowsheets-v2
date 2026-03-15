<script setup>
import { computed } from 'vue';

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

const formatted = computed(() => {
    if (effectiveError.value) { return effectiveError.value; }
    try { return JSON.stringify(props.value, null, 2); } catch { return String(props.value); }
});
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">
        <pre class="px-2 py-1 text-[12px] font-mono leading-[1.4] overflow-auto flex-1 whitespace-pre-wrap break-words"
             :class="effectiveError ? 'text-red-600' : ''">{{ formatted }}</pre>
    </div>
</template>
