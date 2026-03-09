<script setup>
import { useBlocks, useBlockManager, useCellDimensions, useEvaluationContext, useBlockDependencies } from './composables';
import BlockGrid from './components/BlockGrid.vue';
import Block from './components/Block.vue';

const context = useEvaluationContext();
const { blocks } = useBlocks();
const { createBlock } = useBlockManager();
const { cellWidth, cellHeight, setCellDimensions } = useCellDimensions();
const { identifiersByBlock } = useBlockDependencies();
setCellDimensions(150, 24);

const onCreate = (event) => {
    const { clientX, clientY } = event;
    const { left, top } = event.target.getBoundingClientRect();
    createBlock({
        x: clientX - left,
        y: clientY - top
    });
};
</script>

<template>
    <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="onCreate" />
    <block v-for="block in blocks" :key="`block-${block.id}`" :block :context :identifiersByBlock />
</template>
