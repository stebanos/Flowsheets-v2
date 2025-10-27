<script setup>
import { useBlocks, useBlockManager, useCellDimensions, useEvaluationContext } from '../composables';
import BlockGrid from './BlockGrid.vue';
import Block from './Block.vue';

const context = useEvaluationContext();
const { blocks } = useBlocks();
const { createBlock } = useBlockManager();
const { cellWidth, cellHeight, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 26.48);
</script>

<template>
    <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="createBlock" />
    <block v-for="block in blocks" :key="`block-${block.id}`" :block :context />
</template>
