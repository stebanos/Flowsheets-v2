<script setup>
import { useSidebar } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useHoveredReference } from './composables';
import { useBlockManager } from '@/features/block/manage';
import { useEvaluationContext } from '@/features/block/evaluation';
import { useBlockDependencies } from '@/entities/block';
import { useCellDimensions } from '@/shared/composables';
import { Block } from '@/widgets/block';
import { BlockGrid } from '@/widgets/block-grid';

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
    <p-button icon="pi pi-code" severity="secondary" text class="fixed top-2 right-2 z-[200] rounded-full" @click="toggleSidebar" />
    <p-drawer v-model:visible="sidebarOpen" position="right" header="Sidebar" class="w-[31.25rem]" />
</template>
