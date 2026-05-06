<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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

const emit = defineEmits(['update:content-height']);

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'number') { return String(v); }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

const isComplex = computed(() => props.value !== null && typeof props.value === 'object');
const listIsPrimitive = computed(() =>
    props.isList && props.outputItems.length > 0 &&
    props.value.every(item => item === null || typeof item !== 'object')
);

function typeColor(v) {
    if (typeof v === 'string') { return 'text-green-700'; }
    if (typeof v === 'number') { return 'text-blue-600'; }
    if (typeof v === 'boolean' || v === null) { return 'text-gray-400'; }
    return '';
}

const scalarClass = computed(() => typeColor(props.value));

const highlighted = computed(() => {
    if (!isComplex.value) { return ''; }
    return Prism.highlight(safeStringify(props.value), Prism.languages.json, 'json');
});

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
    <div>
        <template v-if="isList && listIsPrimitive">
            <div v-for="(item, i) in outputItems" :key="i"
                class="h-6 min-h-6 flex items-center px-2 font-mono text-[13px] truncate"
                :class="[{ 'border-t border-gray-100': i > 0 }, typeColor(value[i])]"
                :title="String(item)">{{ item }}</div>
        </template>
        <div v-else ref="contentEl" class="px-2 py-1">
            <span v-if="error" class="text-red-600">{{ error }}</span>
            <pre v-else-if="isComplex" class="viz-json" v-html="highlighted" />
            <span v-else class="whitespace-pre-wrap break-words" :class="scalarClass">{{ formatValue(value) }}</span>
        </div>
    </div>
</template>

<style scoped>
.viz-json {
    font-family: ui-monospace, monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
}
.viz-json :deep(.token.number)     { color: #2563eb; }
.viz-json :deep(.token.string)     { color: #15803d; }
.viz-json :deep(.token.boolean),
.viz-json :deep(.token.null)       { color: #9ca3af; }
.viz-json :deep(.token.punctuation){ color: inherit; }
</style>