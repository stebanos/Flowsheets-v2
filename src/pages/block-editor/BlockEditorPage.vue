<script setup>
import { onMounted, watch } from 'vue';
import { useCellDimensions, useHoveredState, useSidebar } from '@/shared/composables';
import { useBlockDependencies, useBlockStore } from '@/entities/block';
import { useFileIO, useSheetStorage } from '@/features/sheet';
import { useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { useBlockEvaluation } from '@/features/block/evaluation';
import { useCustomViz } from '@/features/block/visualize';
import { Block, BlockGrid, SheetTabs, SheetSidebar } from '@/widgets';
import { SidebarContent, TopBar } from './components';

const { blocks } = useBlockStore();
const { identifiersByBlock, dependsOn } = useBlockDependencies({ debounceMs: 0 });
const context = useBlockEvaluation(dependsOn);
const { createBlock } = useBlockManager();
const { undoPending, undoDelete, dismissUndo } = useDeleteBlock();
const { hovered, setHovered, clearHovered } = useHoveredState();
const { isOpen: sidebarOpen, open: openSidebar, toggle: toggleSidebar } = useSidebar();
const { isOpen: sheetSidebarOpen, toggle: toggleSheetSidebar } = useSidebar();
const { activeVizName, customVizes, loadVizes } = useCustomViz();

function onEditViz(vizName) {
    openSidebar();
    activeVizName.value = vizName;
}

const { cellWidth, cellHeight, unitY, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 24);

const { loadFromStorage, scheduleSave, registerVizHandlers } = useSheetStorage();
const { prepareImport } = useFileIO();

registerVizHandlers(() => customVizes, loadVizes);
watch([customVizes, activeVizName], scheduleSave, { deep: true });

onMounted(async () => {
    await loadFromStorage();
    if (blocks.length === 0) {
        createBlock({ x: 301, y: 73 }, 'greeting', '"Hello"', cellWidth, unitY);
        createBlock({ x: 601, y: 145 }, 'message', '`${greeting}, world!`', cellWidth, unitY);
    }
});

const onCreate = (event) => {
    const { clientX, clientY } = event;
    const { left, top } = event.target.getBoundingClientRect();
    createBlock({
        x: clientX - left,
        y: clientY - top
    }, null, '1 + 1', cellWidth, unitY);
};

async function onDrop(e) {
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.name.endsWith('.flowsheet.json'));
    if (file) { await prepareImport(file); }
}
</script>

<template>
    <div class="flex flex-col h-screen overflow-hidden">
        <top-bar :toggle-sheet-sidebar="toggleSheetSidebar" :sheet-sidebar-open="sheetSidebarOpen">
            <template #actions>
                <button
                    :class="sidebarOpen
                        ? 'flex items-center justify-center w-8 h-7 rounded transition-colors ml-1 hover:text-white text-white bg-white/15'
                        : 'flex items-center justify-center w-8 h-7 rounded transition-colors ml-1 hover:text-white text-gray-400'"
                    @click="toggleSidebar"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="12" height="12" rx="1"></rect>
                        <line x1="11" y1="2" x2="11" y2="14"></line>
                    </svg>
                </button>
            </template>
        </top-bar>
        <div class="flex flex-1 overflow-hidden">
            <sheet-sidebar :open="sheetSidebarOpen" />
            <div class="flex flex-col flex-1 overflow-hidden">
                <sheet-tabs />
                <div class="relative flex-1 overflow-hidden" @dragover.prevent @drop.prevent="onDrop">
                    <block-grid data-block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="onCreate" />
                    <block v-for="block in blocks" :key="`block-${block.id}`" :block :context :identifiersByBlock :hovered :setHovered :clearHovered @edit-viz="onEditViz" />
                </div>
            </div>
        </div>
        <p-drawer v-model:visible="sidebarOpen" position="right" header="Custom Visualizations" class="w-[31.25rem] top-9.75">
            <template #container>
                <sidebar-content class="h-full -ml-0.25" />
            </template>
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
