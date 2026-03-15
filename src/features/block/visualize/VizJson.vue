<script setup>
import { computed } from 'vue';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});

const formatted = computed(() => {
    if (props.error) { return props.error; }
    try { return JSON.stringify(props.value, null, 2); } catch { return String(props.value); }
});
</script>

<template>
    <pre class="px-2 py-1 text-[12px] font-mono leading-[1.4] overflow-auto h-full whitespace-pre-wrap break-words"
         :class="error ? 'text-red-600' : ''">{{ formatted }}</pre>
</template>
