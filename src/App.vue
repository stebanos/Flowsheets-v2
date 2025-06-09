<script setup>
import { reactive } from 'vue';

const cellWidth = 150;
const cellHeight = 30;

const blocks = reactive([
    { id: 1, x: cellWidth * 1, y: cellHeight, width: cellWidth * 2, height: cellHeight },
    { id: 2, x: cellWidth * 3, y: cellHeight, width: cellWidth * 2, height: cellHeight },
]);

let dragState = null;
let resizeState = null;

function startDrag(block, event) {
    dragState = {
        block,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: block.x,
        startTop: block.y,
    };

    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
}

function onDrag(event) {
    if (!dragState) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    dragState.block.x = snapX(dragState.startLeft + dx);
    dragState.block.y = snapY(dragState.startTop + dy);
}

function stopDrag() {
    dragState = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
}

function snapX(value) {
    const snapXSize = 30;
    return Math.round(value / snapXSize) * snapXSize;
}

function snapY(value) {
    const snapYSize = 30;
    return Math.round(value / snapYSize) * snapYSize;
}

function startResize(block, event) {
    resizeState = {
        block,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: block.width,
        startHeight: block.height,
    };

    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
}

function onResize(event) {
    if (!resizeState) { return; }

    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;

    resizeState.block.width = snapX(resizeState.startWidth + dx);
    resizeState.block.height = snapY(resizeState.startHeight + dy);

    if (resizeState.block.width < cellWidth) {
        resizeState.block.width = cellWidth;
    }
    if (resizeState.block.height < cellHeight) {
        resizeState.block.height = cellHeight;
    }
}

function stopResize() {
    resizeState = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
}
</script>

<template>
    <div class="grid">
        <div v-for="block in blocks" :key="block.id" class="block" @mousedown="startDrag(block, $event)"
                :style="{ top: block.y + 'px', left: block.x + 'px', width: block.width + 'px', height: block.height + 'px' }">
            Block {{ block.id }}
            <div class="resize-handle" @mousedown.stop.prevent="startResize(block, $event)"></div>
        </div>
    </div>
</template>

<style scoped>
.grid {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-image:
        linear-gradient(to right, #e6e6e6 1px, transparent 1px 150px),
        linear-gradient(to bottom, #e6e6e6 1px, transparent 1px 30px);
    background-size: 150px 30px;
    background-repeat: repeat;
    background-position: 0 0;
    overflow: hidden;
}

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