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
import SidebarContent from './components/SidebarContent.vue';
import TopBar from './components/TopBar.vue';
import { useLocalStorage } from './composables/useLocalStorage';
import { useFileIO } from './composables/useFileIO';

const context = useEvaluationContext();
const { blocks } = useBlockStore();
const { createBlock } = useBlockManager();
const { hovered, setHovered, clearHovered } = useHoveredReference();
const { isOpen: sidebarOpen } = useSidebar();
const { cellWidth, cellHeight, setCellDimensions } = useCellDimensions();
const { identifiersByBlock } = useBlockDependencies();
setCellDimensions(150, 24);

const { localStatus, loadFromStorage } = useLocalStorage();
const { prepareImport } = useFileIO();

loadFromStorage();

if (localStatus.value === null) {
    createBlock({ x: 301, y: 73 }, 'greeting', '"Hello"');
    createBlock({ x: 601, y: 145 }, 'message', '`${greeting}, world!`');
}

const onCreate = (event) => {
    const { clientX, clientY } = event;
    const { left, top } = event.target.getBoundingClientRect();
    createBlock({
        x: clientX - left,
        y: clientY - top
    });
};

async function onDrop(e) {
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.name.endsWith('.flowsheet.json'));
    if (file) { await prepareImport(file); }
}
</script>

<template>
    <div class="flex flex-col h-screen overflow-hidden">
        <top-bar />
        <div class="relative flex-1 overflow-hidden" @dragover.prevent @drop.prevent="onDrop">
            <block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="onCreate" />
            <block v-for="block in blocks" :key="`block-${block.id}`" :block :context :identifiersByBlock :hovered :setHovered :clearHovered />
        </div>
        <p-drawer v-model:visible="sidebarOpen" position="right" header="Custom Visualizations" class="w-[31.25rem]">
            <sidebar-content class="h-full" />
        </p-drawer>
    </div>
</template>
