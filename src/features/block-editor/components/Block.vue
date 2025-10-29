<script setup>
import { computed } from 'vue';
import { useDrag, useResize } from '../composables';
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
</script>

<template>
    <div class="absolute !box-content select-none border border-gray-300 bg-white shadow-md text-[.825rem] leading-[1.4]"
         :style="blockPositionStyle">
        <block-name v-model:name="block.name"
            class="bg-black h-[1.655rem] text-white flex items-center justify-center w-full cursor-move"
            @mousedown="startDrag(block, $event)" />
        <code-editor v-model:code="block.code" />
        <div class="output h-[1.6555rem] w-full flex items-center border-t border-gray-300">
            <span v-if="blockEval.error" class="text-red-600 px-2">{{ blockEval.error }}</span>
            <span v-else class="px-2">{{ formattedResult }}</span>
        </div>
        <div class="absolute z-10 box-border h-3 w-3 cursor-se-resize select-none border-r-2 border-b-2 border-gray-300 bg-transparent bottom-0.5 right-0.5"
            @mousedown.stop.prevent="startResize(block, $event)">
        </div>
    </div>
</template>
