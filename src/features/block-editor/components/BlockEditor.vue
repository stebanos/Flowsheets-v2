<script setup>
import { useCellDimensions, useBlockManager } from '../composables';
import BlockGrid from './BlockGrid.vue';
import Block from './Block.vue';

const { cellWidth, cellHeight, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 30);
const { blocks, addBlock } = useBlockManager();
</script>

<template>
    <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="addBlock" />
    <block v-for="block in blocks" :block="block" :key="block.id" />
</template>