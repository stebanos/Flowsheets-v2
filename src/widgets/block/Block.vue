<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useCellDimensions } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useDrag } from '@/features/block/drag';
import { useResize } from '@/features/block/resize';
import { BlockName } from '@/features/block/name';
import { CodeEditor } from '@/features/block/edit-code';
import { BlockMenu } from '@/widgets/block-menu';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    context: {
        type: Object
    },
    identifiersByBlock: {
        type: Object,
        required: true
    },
    hovered: {
        type: String,
        default: null
    },
    setHovered: {
        type: Function,
        required: true
    },
    clearHovered: {
        type: Function,
        required: true
    }
});

const { blocks, updateBlock } = useBlockStore();
const { cellHeight, cellWidth, snapX, snapY } = useCellDimensions();
const { startDrag } = useDrag(snapX, snapY);
const { startResize } = useResize(cellWidth, cellHeight, snapY);

const rawEditorHeight = ref(cellHeight.value);
const rawEditorWidth = ref(props.block.width);
const rawOutputHeight = ref(cellHeight.value);

// Minimums set by manual resize — prevent auto-grow from shrinking below user-set size.
const manualMinEditorHeight = ref(0);
const manualMinWidth = ref(0);

const MAX_OUTPUT_ROWS = 15;

const snappedEditorHeight = computed(() => {
    const contentHeight = Math.max(1, Math.ceil(rawEditorHeight.value / cellHeight.value)) * cellHeight.value;
    return Math.max(contentHeight, manualMinEditorHeight.value);
});
const snappedEditorWidth = computed(() => {
    const contentWidth = Math.max(1, Math.ceil(rawEditorWidth.value / cellWidth.value)) * cellWidth.value;
    return Math.max(contentWidth, manualMinWidth.value);
});

// Must be defined before snappedOutputHeight, which depends on them.
const blockEval = computed(() => props.context.getEvaluation(props.block.name));

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

const outputValue = computed(() => blockEval.value?.value);
const isList = computed(() => Array.isArray(outputValue.value));
const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

const snappedOutputHeight = computed(() => {
    if (isList.value) {
        return Math.max(1, Math.min(outputItems.value.length, MAX_OUTPUT_ROWS)) * cellHeight.value;
    }
    const rows = Math.max(1, Math.ceil(rawOutputHeight.value / cellHeight.value));
    return Math.min(rows, MAX_OUTPUT_ROWS) * cellHeight.value;
});

// Total block height: header + editor + output, always snapped to grid rows.
// Drives the visual outline directly. block.height kept in sync for serialization/resize.
const snappedBlockHeight = computed(() =>
    cellHeight.value + snappedEditorHeight.value + snappedOutputHeight.value
);

watch(snappedBlockHeight, h => {
    updateBlock(props.block.id, { height: h });
}, { immediate: true });

watch(snappedEditorWidth, w => {
    updateBlock(props.block.id, { width: w });
}, { immediate: true });

// Sync external width/height changes (e.g. resize handle) back into raw refs.
// Guard against our own write-back watches above to avoid circular updates.
watch(() => props.block.width, w => {
    if (w !== snappedEditorWidth.value) {
        rawEditorWidth.value = w;
    }
});

watch(() => props.block.height, h => {
    if (h !== snappedBlockHeight.value) {
        // block.height = header (1 row) + editor + output; isolate the editor portion
        rawEditorHeight.value = h - cellHeight.value - snappedOutputHeight.value;
    }
});

const outputContentEl = ref(null);
let outputRo = null;

watch(outputContentEl, el => {
    outputRo?.disconnect();
    if (!el) { return; }
    outputRo = new ResizeObserver(() => { rawOutputHeight.value = el.offsetHeight; });
    outputRo.observe(el);
}, { immediate: true });

onBeforeUnmount(() => {
    outputRo?.disconnect();
    resizeCleanup?.();
});

const blockPositionStyle = computed(() => ({
    top: `${props.block.y + 1}px`,
    left: `${props.block.x + 1}px`,
    width: `${snappedEditorWidth.value - 1}px`,
    height: `${snappedBlockHeight.value - 1}px`
}));

const outputOverflowY = computed(() => {
    if (isList.value) { return outputItems.value.length > MAX_OUTPUT_ROWS ? 'auto' : 'hidden'; }
    return rawOutputHeight.value > MAX_OUTPUT_ROWS * cellHeight.value ? 'auto' : 'hidden';
});

const formattedResult = computed(() => {
    const evaluation = blockEval.value;
    if (evaluation?.error) { return 'null'; }

    const v = evaluation ? evaluation.value : undefined;
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
});

// Inputs panel
const panelOpen = ref(false);

const blockDeps = computed(() => {
    const ids = props.identifiersByBlock[props.block.name] || [];
    const names = new Set(blocks.map(b => b.name));
    return ids.filter(id => names.has(id) && id !== props.block.name);
});

const hasInputs = computed(() => blockDeps.value.length > 0);

function modeFor(ref) {
    return (props.block.inputModes || {})[ref] ?? 'each';
}

function setMode(ref, mode) {
    updateBlock(props.block.id, { inputModes: { ...props.block.inputModes, [ref]: mode } });
}

const isResizingLocal = ref(false);
let resizeCleanup = null;

function handleStartResize(block, event) {
    isResizingLocal.value = true;
    startResize(block, event);
    // Add listeners AFTER startResize so useResize's mousemove fires first,
    // ensuring block.width/height are already updated when we read them.
    const onMove = () => {
        manualMinWidth.value = block.width;
        manualMinEditorHeight.value = Math.max(
            cellHeight.value,
            block.height - cellHeight.value - snappedOutputHeight.value
        );
    };
    const onUp = () => {
        isResizingLocal.value = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizeCleanup = null;
    };
    resizeCleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

const isMenuOpen = ref(false);
const isHighlighted = computed(() => props.hovered === props.block.name);

const flashType = ref(null);
watch(
    () => {
        const ev = blockEval.value;
        return ev?.error ? `error:${ev.error}` : `ok:${formattedResult.value}`;
    },
    (sig) => {
        flashType.value = null;
        nextTick(() => { flashType.value = sig.startsWith('error') ? 'error' : 'ok'; });
    }
);
</script>

<template>
    <div class="group absolute select-none outline outline-1 bg-white shadow-md text-[.875rem] leading-[1rem] flex flex-col"
         :style="blockPositionStyle"
         :class="[isHighlighted ? 'outline-black' : 'outline-gray-300', {'menu-visible': isMenuOpen, 'resizing-local': isResizingLocal, 'inputs-panel-open': panelOpen}]">
        <div class="block-header relative px-2 has-[input]:px-0.25 border-b border-gray-300" :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <block-menu :block class="block-menu absolute not-group-hover:invisible group-has-[input]:invisible group-[.menu-visible]:visible group-[.resizing-local]:invisible" @menu-toggle="isMenuOpen = $event" />
            <block-name :name="block.name" :blocks :identifiersByBlock="props.identifiersByBlock"
                class="block-name min-h-6 h-6 flex items-center justify-center w-full cursor-move"
                @update:name="updateBlock(block.id, { name: $event })"
                @mousedown="startDrag(block, $event)" />
            <button v-if="hasInputs"
                class="inputs-toggle absolute right-0 top-0 h-full px-2 text-[10px] tracking-wide cursor-pointer opacity-60 hover:opacity-100 not-group-hover:invisible group-has-[input]:invisible group-[.resizing-local]:invisible group-[.inputs-panel-open]:visible group-[.inputs-panel-open]:opacity-100"
                @click.stop="panelOpen = !panelOpen">
                inputs {{ panelOpen ? '▴' : '▾' }}
            </button>
        </div>
        <div v-if="panelOpen && hasInputs" class="inputs-panel absolute left-0 right-0 bg-gray-50 border border-gray-300 shadow-md z-50" style="top: 24px;">
            <div v-for="ref in blockDeps" :key="ref"
                class="input-row flex items-center justify-between h-7 px-2 gap-2"
                :class="{ 'border-t border-gray-200': blockDeps.indexOf(ref) > 0 }">
                <span class="font-mono text-[12px] text-gray-700">{{ ref }}</span>
                <div class="flex gap-0.5">
                    <button
                        class="text-[10px] font-bold px-2 py-0.5 rounded-sm border-2 cursor-pointer"
                        :class="modeFor(ref) === 'each' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'"
                        @click="setMode(ref, 'each')">each</button>
                    <button
                        class="text-[10px] font-bold px-2 py-0.5 rounded-sm border-2 cursor-pointer"
                        :class="modeFor(ref) === 'all' ? 'bg-white text-black border-black' : 'bg-white text-gray-400 border-gray-200'"
                        @click="setMode(ref, 'all')">all</button>
                </div>
            </div>
        </div>
        <div class="block-code w-full" :class="{ 'is-string': block.isStringConcat }" :style="{ height: snappedEditorHeight + 'px' }">
            <code-editor class="block-code-editor h-full w-full" :code="block.code" :blocks :setHovered :clearHovered
                :isStringConcat="block.isStringConcat"
                @update:code="updateBlock(block.id, { code: $event })"
                @update:content-height="rawEditorHeight = $event" @update:content-width="rawEditorWidth = $event" />
        </div>
        <div class="block-output w-full border-t border-gray-300 bg-white"
            :style="{ height: snappedOutputHeight + 'px', overflowY: outputOverflowY }"
            :class="{ 'output-flash-ok': flashType === 'ok', 'output-flash-error': flashType === 'error' }"
            @animationend="flashType = null">
            <template v-if="isList">
                <div v-for="(item, i) in outputItems" :key="i"
                    class="h-6 min-h-6 flex items-center px-2 font-mono text-[13px]"
                    :class="{ 'border-t border-gray-100': i > 0 }">{{ item }}</div>
            </template>
            <div v-else ref="outputContentEl" class="px-2 py-1">
                <span v-if="blockEval.error" class="text-red-600">{{ blockEval.error }}</span>
                <span v-else>{{ formattedResult }}</span>
            </div>
        </div>
        <div class="block-handle absolute box-border h-3 w-3 mb-0.5 mr-0.5 cursor-se-resize select-none border-r-2 border-b-2 border-gray-300 bg-transparent"
            @mousedown.stop.prevent="handleStartResize(block, $event)">
        </div>
    </div>
</template>

<style scoped>
.block-output {
    anchor-name: --block-output;
}
.block-handle {
    position-anchor: --block-output;
    bottom: anchor(bottom);
    right: anchor(right);
}
.block-header {
    anchor-name: --block-header;
}
.block-menu {
    position-anchor: --block-header;
    left: anchor(left);
    top: anchor(top);
}

.output-flash-ok {
    animation: output-flash-ok 0.5s ease-out;
}
.output-flash-error {
    animation: output-flash-error 0.5s ease-out;
}
@keyframes output-flash-ok {
    0%   { background-color: #fef08a; }
    100% { background-color: white; }
}
@keyframes output-flash-error {
    0%   { background-color: #fca5a5; }
    100% { background-color: white; }
}
</style>
