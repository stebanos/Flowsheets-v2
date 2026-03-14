<script setup>
import { useSidebar } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useBlockManager, useCellDimensions, useEvaluationContext, useBlockDependencies, useHoveredReference } from './composables';
import { BlockGrid, Block } from './components';

const context = useEvaluationContext();
const { blocks } = useBlockStore();
const { createBlock } = useBlockManager();
const { hovered, setHovered, clearHovered } = useHoveredReference();
const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();
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
    <p-button icon="pi pi-code" severity="secondary" text class="sidebar-toggle" @click="toggleSidebar" />
    <p-drawer v-model:visible="sidebarOpen" position="right" header="Sidebar" class="w-[31.25rem]" />
</template>

<style scoped>
.sidebar-toggle {
    position: fixed;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 200;
}
</style>
