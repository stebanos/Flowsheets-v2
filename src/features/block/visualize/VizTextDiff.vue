<script setup>
import { computed, ref } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useEvaluationContext } from '@/features/block/evaluation';
import { diffLines } from '@/shared/lib/diff';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, required: true },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});

const { updateBlock } = useBlockStore();
const { getEvaluation } = useEvaluationContext();

const compareBlockName = computed(() => props.block.vizOptions?.compareBlock ?? '');

function setCompareBlock(name) {
    updateBlock(props.block.id, { vizOptions: { ...props.block.vizOptions, compareBlock: name } });
}

function stringify(v) {
    if (v === undefined || v === null) { return String(v); }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

const thisText = computed(() => props.error ? '' : stringify(props.value));

const compareText = computed(() => {
    const name = compareBlockName.value;
    if (!name) { return ''; }
    const ev = getEvaluation(name);
    if (!ev || ev.error) { return ''; }
    return stringify(ev.value);
});

const compareError = computed(() => {
    const name = compareBlockName.value;
    if (!name) { return null; }
    const ev = getEvaluation(name);
    return ev?.error ?? null;
});

const diffRows = computed(() => {
    if (!compareBlockName.value) { return []; }
    return diffLines(thisText.value, compareText.value);
});

// Pre-compute line numbers for each row
const diffWithNums = computed(() => {
    let leftNum = 1, rightNum = 1;
    return diffRows.value.map(row => {
        const r = { ...row };
        if (row.type === 'eq') { r.leftNum = leftNum++; r.rightNum = rightNum++; }
        else if (row.type === 'del') { r.leftNum = leftNum++; r.rightNum = null; }
        else { r.leftNum = null; r.rightNum = rightNum++; }
        return r;
    });
});

const inputRef = ref(null);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">
        <!-- Compare block selector -->
        <div class="flex items-center gap-1 px-2 h-6 min-h-6 border-b border-gray-200 bg-gray-50">
            <span class="text-[10px] text-gray-500 shrink-0">vs</span>
            <input
                ref="inputRef"
                type="text"
                :value="compareBlockName"
                placeholder="block name"
                class="flex-1 min-w-0 text-[11px] font-mono bg-transparent border-none outline-none text-gray-700 placeholder-gray-300"
                @change="setCompareBlock($event.target.value)"
                @keydown.enter="setCompareBlock($event.target.value)"
            />
        </div>
        <!-- Empty state -->
        <div v-if="!compareBlockName" class="px-2 py-1 text-[12px] text-gray-400 italic">
            Enter a block name to compare with.
        </div>
        <!-- Compare error -->
        <div v-else-if="compareError" class="px-2 py-1 text-[12px] text-red-500">
            {{ compareError }}
        </div>
        <!-- Diff output -->
        <div v-else class="overflow-auto flex-1 font-mono text-[12px] leading-[1.4]">
            <div v-if="diffRows.length === 0" class="px-2 py-1 text-gray-400 italic">
                No differences.
            </div>
            <div
                v-for="(row, i) in diffWithNums"
                :key="i"
                class="flex min-h-[1.4em]"
                :class="{
                    'bg-red-50': row.type === 'del',
                    'bg-green-50': row.type === 'add'
                }"
            >
                <!-- Left line number -->
                <span class="w-8 shrink-0 text-right pr-2 select-none text-gray-300 text-[10px] leading-[1.4em]">
                    {{ row.leftNum ?? '' }}
                </span>
                <!-- Right line number -->
                <span class="w-8 shrink-0 text-right pr-2 select-none text-gray-300 text-[10px] leading-[1.4em]">
                    {{ row.rightNum ?? '' }}
                </span>
                <!-- Gutter marker -->
                <span class="w-4 shrink-0 text-center select-none leading-[1.4em]"
                    :class="{
                        'text-red-400': row.type === 'del',
                        'text-green-500': row.type === 'add'
                    }">
                    {{ row.type === 'del' ? '−' : row.type === 'add' ? '+' : ' ' }}
                </span>
                <!-- Line content with optional char spans -->
                <span class="flex-1 px-1 whitespace-pre-wrap break-all leading-[1.4em]">
                    <template v-if="row.spans !== null">
                        <span
                            v-for="(span, si) in row.spans"
                            :key="si"
                            :class="{
                                'bg-red-200': span.type === 'del',
                                'bg-green-200': span.type === 'add'
                            }"
                        >{{ span.text }}</span>
                    </template>
                    <template v-else>{{ row.text }}</template>
                </span>
            </div>
        </div>
    </div>
</template>
