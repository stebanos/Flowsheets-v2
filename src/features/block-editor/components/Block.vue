<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useDrag, useResize, useHoveredReference, useCellDimensions } from '../composables';
import BlockMenu from './BlockMenu.vue';
import BlockName from './BlockName.vue';
import CodeEditor from './CodeEditor.vue';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    context: {
        type: Object
    }
});

const { startDrag } = useDrag();
const { startResize } = useResize();
const { hovered } = useHoveredReference();
const { cellHeight, cellWidth } = useCellDimensions();

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
const snappedOutputHeight = computed(() => {
    const rows = Math.max(1, Math.ceil(rawOutputHeight.value / cellHeight.value));
    return Math.min(rows, MAX_OUTPUT_ROWS) * cellHeight.value;
});

// Total block height: header + editor + output, always snapped to grid rows.
// Drives the visual outline directly. block.height kept in sync for serialization/resize.
const snappedBlockHeight = computed(() =>
    cellHeight.value + snappedEditorHeight.value + snappedOutputHeight.value
);

watch(snappedBlockHeight, h => {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.height = h;
}, { immediate: true });

watch(snappedEditorWidth, w => {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.width = w;
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

const blockEval = computed(() => {
    return props.context.getEvaluation(props.block.name);
});

const blockPositionStyle = computed(() => ({
    top: `${props.block.y + 1}px`,
    left: `${props.block.x + 1}px`,
    width: `${snappedEditorWidth.value - 1}px`,
    height: `${snappedBlockHeight.value - 1}px`
}));

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
const isHighlighted = computed(() => hovered.value === props.block.name);
</script>

<template>
    <div class="group absolute select-none outline outline-1 bg-white shadow-md text-[.875rem] leading-[1rem] flex flex-col"
         :style="blockPositionStyle" :class="[isHighlighted ? 'outline-black' : 'outline-gray-300', {'menu-visible': isMenuOpen}]">
        <div class="block-header relative px-2 has-[input]:px-0.25 border-b border-gray-300" :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <block-menu :block class="block-menu absolute not-group-hover:invisible group-has-[input]:invisible group-[.menu-visible]:visible" :style="isResizingLocal ? { visibility: 'hidden' } : {}" @menu-toggle="isMenuOpen = $event" />
            <!-- eslint-disable-next-line vue/no-mutating-props -->
            <block-name v-model:name="block.name"
                class="block-name min-h-6 h-6 flex items-center justify-center w-full cursor-move"
                @mousedown="startDrag(block, $event)" />
        </div>
        <div class="block-code w-full" :style="{ height: snappedEditorHeight + 'px' }">
            <!-- eslint-disable-next-line vue/no-mutating-props -->
            <code-editor class="block-code-editor h-full w-full" v-model:code="block.code" @update:content-height="rawEditorHeight = $event" @update:content-width="rawEditorWidth = $event" />
        </div>
        <div class="block-output w-full border-t border-gray-300 bg-white"
            :style="{ height: snappedOutputHeight + 'px', overflowY: rawOutputHeight > MAX_OUTPUT_ROWS * cellHeight ? 'auto' : 'hidden' }">
            <div ref="outputContentEl" class="px-2 py-1">
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
</style>

