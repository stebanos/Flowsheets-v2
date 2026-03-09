<script setup>
import { useBlockManager, useCellDimensions, useEvaluationContext, useBlockDependencies, useHoveredReference } from './composables';
import { useBlockStore } from '@/entities/block';
import BlockGrid from './components/BlockGrid.vue';
import Block from './components/Block.vue';

const context = useEvaluationContext();
const { blocks } = useBlockStore();
const { createBlock } = useBlockManager();
const { hovered, setHovered, clearHovered } = useHoveredReference();
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
    <block v-for="block in blocks" :key="`block-${block.id}`" :block :context :identifiersByBlock :hovered :setHovered :clearHovered />
</template>
