<script setup>
import { computed } from 'vue';
import { diffLines } from '@/shared/lib/diff';
import { safeStringify } from '@/features/block/visualize';

const props = defineProps({
    current: {},
    previous: {}
});

function isPrimitive(v) {
    return v === null || v === undefined || (typeof v !== 'object' && typeof v !== 'string');
}

function pretty(v) {
    if (v === undefined) { return 'undefined'; }
    try { return safeStringify(v); } catch { return String(v); }
}

const oneLine = computed(() => isPrimitive(props.current) && isPrimitive(props.previous));

const diffRows = computed(() => {
    if (oneLine.value) { return []; }
    return diffLines(pretty(props.previous), pretty(props.current));
});
</script>

<template>
    <div class="output-history-popover bg-white border border-gray-300 rounded shadow-lg text-[12px] font-mono overflow-hidden">
        <div class="px-2 py-1 border-b border-gray-200 bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
            Previous
        </div>
        <div v-if="oneLine" class="px-2 py-1.5 whitespace-nowrap">
            <span class="text-gray-500">{{ pretty(previous) }}</span>
            <span class="text-gray-300 mx-1">→</span>
            <span class="text-gray-800">{{ pretty(current) }}</span>
        </div>
        <div v-else class="max-h-48 overflow-auto leading-[1.4]" @wheel.stop>
            <div
                v-for="(row, i) in diffRows"
                :key="i"
                class="flex min-h-[1.4em]"
                :class="{ 'bg-red-50': row.type === 'del', 'bg-green-50': row.type === 'add' }"
            >
                <span class="w-4 shrink-0 text-center select-none leading-[1.4em]"
                    :class="{ 'text-red-400': row.type === 'del', 'text-green-500': row.type === 'add' }">
                    {{ row.type === 'del' ? '−' : row.type === 'add' ? '+' : ' ' }}
                </span>
                <span class="flex-1 px-1 whitespace-pre-wrap break-all leading-[1.4em]">
                    <template v-if="row.spans !== null">
                        <span
                            v-for="(span, si) in row.spans"
                            :key="si"
                            :class="{ 'bg-red-200': span.type === 'del', 'bg-green-200': span.type === 'add' }"
                        >{{ span.text }}</span>
                    </template>
                    <template v-else>{{ row.text }}</template>
                </span>
            </div>
        </div>
    </div>
</template>
