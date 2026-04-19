<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useCellDimensions, useHoveredState, useSidebar } from '@/shared/composables';
import { useBlockDependencies, useBlockStore } from '@/entities/block';
import { useSheetStore } from '@/entities/sheet';
import { useFileIO, useSheetStorage, useSheetManager } from '@/features/sheet';
import { useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { useBlockEvaluation } from '@/features/block/evaluation';
import { useCustomViz } from '@/features/block/visualize';
import { Block, BlockGrid, CustomVizEditor, SheetTabs, SheetSidebar } from '@/widgets';
import { AppBar, AppNav, SheetTitle, SaveFileButton, VizSidebarToggle, UndoDeleteToast, EmptyCanvas } from './components';

// stores
const { blocks } = useBlockStore();
const { sheets, activeSheetName } = useSheetStore();

// evaluation
const { identifiersByBlock, dependsOn } = useBlockDependencies({ debounceMs: 0 });
const context = useBlockEvaluation(dependsOn);

// block interaction
const { createBlock } = useBlockManager();
const { undoPending, undoDelete, dismissUndo } = useDeleteBlock();
const { hovered, setHovered, clearHovered } = useHoveredState();
const { cellWidth, cellHeight, unitY, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 24);

// viz sidebar
const { isOpen: sidebarOpen, open: openSidebar, toggle: toggleSidebar } = useSidebar();
const { activeVizName, customVizes, loadVizes } = useCustomViz();

// sheet sidebar
const { isOpen: sheetSidebarOpen, toggle: toggleSheetSidebar } = useSidebar();
const SHEET_SIDEBAR_KEY = 'flowsheets.v2.sheetSidebarOpen';
sheetSidebarOpen.value = JSON.parse(localStorage.getItem(SHEET_SIDEBAR_KEY) ?? 'true');
watch(sheetSidebarOpen, val => localStorage.setItem(SHEET_SIDEBAR_KEY, JSON.stringify(val)));

// sheet & file management
const { createSheet, deletedNotice } = useSheetManager();
const { localStatus, localError, loadFromStorage, scheduleSave, registerVizHandlers } = useSheetStorage();
const { fileStatus, fileName, fileDirty, saveSheet, prepareImport } = useFileIO();

// wiring
registerVizHandlers(() => customVizes, loadVizes);
watch([customVizes, activeVizName], scheduleSave, { deep: true });

// lifecycle
onMounted(async () => {
    document.addEventListener('keydown', handleKeydown);
    await loadFromStorage();
    if (blocks.length === 0) {
        createBlock({ x: 301, y: 73 }, 'greeting', '"Hello"', cellWidth, unitY);
        createBlock({ x: 601, y: 145 }, 'message', '`${greeting}, world!`', cellWidth, unitY);
    }
});
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown); });

// handlers
function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveSheet();
    }
}

function onEditViz(vizName) {
    openSidebar();
    activeVizName.value = vizName;
}

async function onDrop(e) {
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.name.endsWith('.flowsheet.json'));
    if (file) { await prepareImport(file); }
}

function onCreate(event) {
    const { clientX, clientY } = event;
    const { left, top } = event.target.getBoundingClientRect();
    createBlock({ x: clientX - left, y: clientY - top }, null, '1 + 1', cellWidth, unitY);
}

function openSheetSidebar() { sheetSidebarOpen.value = true; }
function createSheetFromEmpty() { createSheet('Untitled'); }

// status
const saveStatus = computed(() => {
    if (deletedNotice.value) { return 'deleted'; }
    if (fileStatus.value === 'saving' || localStatus.value === 'saving') { return 'saving'; }
    if (fileStatus.value === 'dirty' || fileDirty.value) { return 'dirty'; }
    if (fileStatus.value === 'saved') { return 'saved'; }
    if (fileStatus.value === 'ambient' && fileName.value) { return 'ambient'; }
    if (localStatus.value === 'error') { return 'error'; }
    return 'clean';
});

const statusText = computed(() => {
    switch (saveStatus.value) {
    case 'deleted': return `"${deletedNotice.value}" deleted`;
    case 'saving':  return 'Saving...';
    case 'dirty':   return 'File not up to date · ⌘S';
    case 'saved':   return `✓ Saved to ${fileName.value}`;
    case 'ambient': return fileName.value;
    case 'error':   return localError.value ?? 'Save error';
    default:        return 'Auto-saved';
    }
});

const STATUS_COLORS = {
    saved:   'text-green-400',
    error:   'text-red-400',
    dirty:   'text-amber-400',
    default: 'text-gray-400'
};

const statusColor = computed(() => STATUS_COLORS[saveStatus.value] ?? STATUS_COLORS.default);

const showSaveFile = computed(() => fileName.value !== null);
</script>

<template>
    <div class="flex flex-col h-screen overflow-hidden">
        <app-bar>
            <template #nav>
                <app-nav :open="sheetSidebarOpen" @toggle="toggleSheetSidebar" />
            </template>
            <template #title>
                <sheet-title :sheet-name="activeSheetName" :file-dirty="fileDirty" :status-text="statusText" :status-color="statusColor" />
            </template>
            <template #controls>
                <save-file-button v-if="showSaveFile" @save="saveSheet" />
                <viz-sidebar-toggle :open="sidebarOpen" @toggle="toggleSidebar" />
            </template>
        </app-bar>
        <div class="flex flex-1 overflow-hidden">
            <sheet-sidebar :open="sheetSidebarOpen" />
            <div class="flex flex-col flex-1 overflow-hidden">
                <sheet-tabs @open-sidebar="openSheetSidebar" />
                <div class="relative flex-1 overflow-hidden" @dragover.prevent @drop.prevent="onDrop">
                    <block-grid data-block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" @dblclick="onCreate" />
                    <block v-for="block in blocks" :key="`block-${block.id}`" :block :context :identifiersByBlock :hovered :setHovered :clearHovered @edit-viz="onEditViz" />
                    <empty-canvas v-if="sheets.length === 0" @create="createSheetFromEmpty" />
                </div>
            </div>
        </div>
        <p-drawer v-model:visible="sidebarOpen" position="right" header="Custom Visualizations" class="w-125 top-9.75">
            <template #container>
                <custom-viz-editor class="h-full -ml-px" />
            </template>
        </p-drawer>
        <undo-delete-toast :pending="undoPending" @undo="undoDelete" @dismiss="dismissUndo" />
    </div>
</template>
