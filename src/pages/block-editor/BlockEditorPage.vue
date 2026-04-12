<script setup>
import { useCellDimensions, useHoveredState, useSidebar } from '@/shared/composables';
import { useBlockDependencies, useBlockStore } from '@/entities/block';
import { useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { useBlockEvaluation } from '@/features/block/evaluation';
import { Block, BlockGrid } from '@/widgets';
import { useFileIO, useLocalStorage } from './composables';
import { SidebarContent, TopBar } from './components';

const context = useBlockEvaluation();
const { blocks } = useBlockStore();
const { createBlock } = useBlockManager();
const { undoPending, undoDelete, dismissUndo } = useDeleteBlock();
const { hovered, setHovered, clearHovered } = useHoveredState();
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
        <!-- Undo delete toast -->
        <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2">
            <div v-if="undoPending"
                 class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl z-50 whitespace-nowrap">
                <span>
                    Deleted "{{ undoPending.block.name }}"<span v-if="undoPending.hasDownstream"> (downstream blocks affected)</span> —
                </span>
                <button class="font-semibold underline cursor-pointer hover:text-gray-200 transition-colors"
                        @click="undoDelete">Undo</button>
                <button class="text-gray-400 hover:text-white cursor-pointer transition-colors leading-none"
                        @click="dismissUndo">✕</button>
            </div>
        </transition>
    </div>
</template>
