<script setup>
import { ref, computed, watch, nextTick } from 'vue';

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

const hasContent = computed(() => props.value != null || props.error != null);

// Use a ref updated after nextTick so the iframe only ever mounts once with a
// settled value. Without this, replaceBlocks() causes a second in-place src
// assignment on the already-navigated data: iframe, which browsers ignore.
const SCROLLBAR_CSS = `<style>
*{scrollbar-width:thin;scrollbar-color:oklch(50% 0 0/25%) transparent}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:oklch(50% 0 0/25%);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:oklch(50% 0 0/45%)}
</style>`;

const iframeSrc = ref(null);
watch(
    () => hasContent.value
        ? `data:text/html;charset=utf-8,${encodeURIComponent(SCROLLBAR_CSS + htmlContent.value)}`
        : null,
    async (src) => {
        await nextTick();
        iframeSrc.value = src;
    },
    { immediate: true }
);
</script>

<template>
    <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        sandbox="allow-scripts"
        class="w-full h-full border-0"
    />
    <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="animate-spin w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    </div>
</template>
