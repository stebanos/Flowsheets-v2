<script setup>
import { ref, computed, watch } from 'vue';
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
const rawEditorWidth = ref(cellWidth.value);

const snappedEditorHeight = computed(() =>
    Math.max(1, Math.ceil(rawEditorHeight.value / cellHeight.value)) * cellHeight.value
);
const snappedEditorWidth = computed(() =>
    Math.max(1, Math.ceil(rawEditorWidth.value / cellWidth.value)) * cellWidth.value
);

// Total block height: header + editor + output, always snapped to grid rows.
// Drives the visual outline directly. block.height kept in sync for serialization/resize.
const snappedBlockHeight = computed(() =>
    cellHeight.value + snappedEditorHeight.value + cellHeight.value
);

watch(snappedBlockHeight, h => {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.height = h;
}, { immediate: true });

watch(snappedEditorWidth, w => {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.width = w;
}, { immediate: true });

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

const isMenuOpen = ref(false);
const isHighlighted = computed(() => hovered.value === props.block.name);
</script>

<template>
    <div class="group absolute select-none outline outline-1 bg-white shadow-md text-[.875rem] leading-[1rem] flex flex-col"
         :style="blockPositionStyle" :class="[isHighlighted ? 'outline-black' : 'outline-gray-300', {'menu-visible': isMenuOpen}]">
        <div class="block-header relative px-2 has-[input]:px-0.25 border-b border-gray-300" :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <block-menu :block class="block-menu absolute not-group-hover:invisible group-has-[input]:invisible group-[.menu-visible]:visible" @menu-toggle="isMenuOpen = $event" />
            <!-- eslint-disable-next-line vue/no-mutating-props -->
            <block-name v-model:name="block.name"
                class="block-name min-h-6 h-6 flex items-center justify-center w-full cursor-move"
                @mousedown="startDrag(block, $event)" />
        </div>
        <div class="block-code w-full" :style="{ height: snappedEditorHeight + 'px' }">
            <!-- eslint-disable-next-line vue/no-mutating-props -->
            <code-editor class="block-code-editor h-full w-full" v-model:code="block.code" @update:content-height="rawEditorHeight = $event" @update:content-width="rawEditorWidth = $event" />
        </div>
        <div class="block-output min-h-6 w-full flex items-center border-t border-gray-300 bg-white">
            <span v-if="blockEval.error" class="text-red-600 px-2">{{ blockEval.error }}</span>
            <span v-else class="px-2">{{ formattedResult }}</span>
        </div>
        <div class="block-handle absolute box-border h-3 w-3 mb-0.5 mr-0.5 cursor-se-resize select-none border-r-2 border-b-2 border-gray-300 bg-transparent"
            @mousedown.stop.prevent="startResize(block, $event)">
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

