<script setup>
import { ref, computed } from 'vue';
import { useDrag, useResize, useHoveredReference } from '../composables';
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

const blockEval = computed(() => {
    const c = props.context.getEvaluation(props.block.name);
    return c ? c.value : { value: null, error: `no block named "${props.block.name}"` };
});

const blockPositionStyle = computed(() => ({
    top: `${props.block.y}px`,
    left: `${props.block.x}px`,
    width: `${props.block.width}px`,
    height: `${props.block.height}px`
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
    <div class="group absolute !box-content select-none border bg-white shadow-md text-[.875rem] leading-[1rem] flex flex-col"
         :style="blockPositionStyle" :class="[isHighlighted ? 'border-black' : 'border-gray-300', {'menu-visible': isMenuOpen}]">
        <div class="block-header relative px-2 has-[input]:px-0.25 border-b border-gray-300" :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <block-menu :block class="block-menu absolute not-group-hover:invisible group-has-[input]:invisible group-[.menu-visible]:visible" @menu-toggle="isMenuOpen = $event" />
            <block-name v-model:name="block.name"
                class="block-name min-h-6 h-6 flex items-center justify-center w-full cursor-move"
                @mousedown="startDrag(block, $event)" />
        </div>
        <div class="block-code flex-1 min-h-0 w-full">
            <code-editor class="block-code-editor h-full w-full overflow-auto" v-model:code="block.code" />
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

