<script setup>
import { provide } from 'vue';
import { useCellDimensions, useBlockManager, useEvaluationContext } from '../composables';
import BlockGrid from './BlockGrid.vue';
import Block from './Block.vue';

const { cellWidth, cellHeight, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 26.48);
const { blocks, createBlock } = useBlockManager();

const evalContext = useEvaluationContext(blocks);
provide('evalContext', evalContext);
</script>

<template>
    <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="createBlock" />
    <block v-for="block in blocks" :block :key="`block-${block.id}`" />
</template>
