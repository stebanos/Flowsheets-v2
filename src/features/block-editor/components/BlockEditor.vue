<script setup>
import { reactive } from 'vue';
import { useCellDimensions } from '../composables';
import BlockList from './BlockList.vue';
import Block from '@/features/block-editor/components/Block.vue';

const cellWidth = 150;
const cellHeight = 30;

const blocks = reactive([
    { id: 1, x: cellWidth * 1, y: cellHeight, width: cellWidth * 2, height: cellHeight },
    { id: 2, x: cellWidth * 3, y: cellHeight, width: cellWidth * 2, height: cellHeight },
]);

const { setCellDimensions } = useCellDimensions();
setCellDimensions(cellWidth, cellHeight);
</script>

<template>
    <block-list :blocks="blocks" :data-cell-width="cellWidth" :data-cell-height="cellHeight" class="fs-grid">
        <template #default="{ block }">
            <block :block="block" />
        </template>
    </block-list>
</template>

<style scoped>
.fs-grid {
    @apply relative w-screen h-screen overflow-hidden;
    background-image:
        linear-gradient(to right, #e6e6e6 1px, transparent 1px attr(data-cell-width px)),
        linear-gradient(to bottom, #e6e6e6 1px, transparent 1px attr(data-cell-height px));
    background-size: attr(data-cell-width px) attr(data-cell-height px);
    background-repeat: repeat;
    background-position: 0 0;
}
</style>