<script setup>
import { useDrag, useResize } from '../composables';

defineProps({
    block: {
        type: Object,
        required: true,
    }
});

const { startDrag } = useDrag();
const { startResize } = useResize();
</script>

<template>
    <div class="block" @mousedown="startDrag(block, $event)"
         :style="{ top: block.y + 'px', left: block.x + 'px', width: block.width + 'px', height: block.height + 'px'}">
        Block {{ block.id }}
        <div class="resize-handle" @mousedown.stop.prevent="startResize(block, $event)"></div>
    </div>
</template>

<style scoped>
.block {
    position: absolute;
    background: #fff;
    border: 1px solid #ccc;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
    padding: 6px 12px;
    cursor: move;
    user-select: none;
    box-sizing: border-box;
}

.resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    bottom: 3px;
    right: 3px;
    cursor: se-resize;
    user-select: none;
    z-index: 10;

    /* Create triangle */
    background: transparent;
    border-right: 2px solid #ccc;
    border-bottom: 2px solid #ccc;
    box-sizing: border-box;
}
</style>