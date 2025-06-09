<script setup>
import { reactive } from 'vue';
import { useCellDimensions } from '../composables';
import BlockGrid from './BlockGrid.vue';
import Block from './Block.vue';

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
    <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" />
    <block v-for="block in blocks" :block="block" :key="block.id" />
</template>