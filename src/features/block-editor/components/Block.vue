<script setup>
import { computed } from 'vue';
import { useDrag, useResize } from '../composables';

const props = defineProps({
    block: {
        type: Object,
        required: true,
    }
});

const { startDrag } = useDrag();
const { startResize } = useResize();

const blockPositionStyle = computed(() => ({
    top: `${props.block.y}px`,
    left: `${props.block.x}px`,
    width: `${props.block.width}px`,
    height: `${props.block.height}px`
}));
</script>
<template>
    <div class="absolute box-border cursor-move select-none border border-gray-300 bg-white py-1 shadow-md px-1.5"
         :style="blockPositionStyle"
         @mousedown="startDrag(block, $event)">
            Block {{ block.id }}
        <div class="absolute z-10 box-border h-3 w-3 cursor-se-resize select-none border-r-2 border-b-2 border-gray-300 bg-transparent bottom-0.5 right-0.5"
            @mousedown.stop.prevent="startResize(block, $event)"
        ></div>
    </div>
</template>