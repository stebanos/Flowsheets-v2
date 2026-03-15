<script setup>
import { computed } from 'vue';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});

const htmlContent = computed(() => {
    if (props.error) { return `<span style="color:red">${props.error}</span>`; }
    const v = props.value;
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
});
</script>

<template>
    <iframe
        :src="`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`"
        sandbox="allow-scripts"
        class="w-full h-full border-0"
    />
</template>
