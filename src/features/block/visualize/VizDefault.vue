<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:content-height']);

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

const contentEl = ref(null);
let ro = null;

watch(contentEl, el => {
    ro?.disconnect();
    if (!el) { return; }
    ro = new ResizeObserver(() => { emit('update:content-height', el.offsetHeight); });
    ro.observe(el);
    emit('update:content-height', el.offsetHeight);
}, { immediate: true });

onBeforeUnmount(() => { ro?.disconnect(); });
</script>

<template>
    <template v-if="isList">
        <div v-for="(item, i) in outputItems" :key="i"
            class="h-6 min-h-6 flex items-center px-2 font-mono text-[13px]"
            :class="{ 'border-t border-gray-100': i > 0 }">{{ item }}</div>
    </template>
    <div v-else ref="contentEl" class="px-2 py-1">
        <span v-if="error" class="text-red-600">{{ error }}</span>
        <span v-else>{{ formatValue(value) }}</span>
    </div>
</template>
