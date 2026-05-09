<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useHoveredState, useSidebar } from '@/shared/composables';
import { useBlockDependencies, useBlockStore } from '@/entities/block';
import { useSheetStore } from '@/entities/sheet';
import { useBlockEvaluation } from '@/features/block/evaluation';
import { useCellDimensions } from '@/features/block/grid';
import { useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { useFocusedBlock } from '@/features/block/navigate';
import { useCustomViz } from '@/features/block/visualize';
import { useCanvasPan } from '@/features/canvas';
import { useFileIO, useSheetManager, useSheetStorage } from '@/features/sheet';
import { Block, BlockGrid, CustomVizEditor, SheetSidebar, SheetTabs } from '@/widgets';
import { AppBar, AppBarToggleButton, EmptyCanvas, ResetPanButton, SheetTitle, UndoDeleteToast } from './components';
import { AppIcon, SheetSidebarIcon, VizSidebarIcon } from './components/icons';

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

// canvas pan
const { panX, panY, isPanning, startPan, resetPan, setPan, panByDelta } = useCanvasPan();

// keyboard nav
const { registerCanvas } = useFocusedBlock();
const canvasEl = ref(null);
const wrapAnnouncerEl = ref(null);

const SCROLL_RESUME_MS = 500;
const LINE_PX = 40;
let _lastScrollTime = 0;

// sheet & file management
const { createSheet, deletedNotice } = useSheetManager();
const { localStatus, localError, loadFromStorage, scheduleSave, isFirstBoot } = useSheetStorage({
    getCustomVizes: () => customVizes,
    onVizesLoaded:  loadVizes,
    getPan:         () => ({ panX: panX.value, panY: panY.value }),
    onPanLoaded:    (view) => setPan(view.panX, view.panY)
});
const { prepareImport } = useFileIO();
watch([customVizes, activeVizName], scheduleSave, { deep: true });
watch([panX, panY], scheduleSave);

// lifecycle
onMounted(async () => {
    registerCanvas(canvasEl.value, wrapAnnouncerEl.value);
    await loadFromStorage();
    if (isFirstBoot.value) {
        createBlock({ x: 301, y: 73 }, 'greeting', '"Hello"', cellWidth, unitY);
        createBlock({ x: 601, y: 145 }, 'message', '`${greeting}, world!`', cellWidth, unitY);
    }
});

// handlers
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
    createBlock({ x: clientX - left - panX.value, y: clientY - top - panY.value }, null, '1 + 1', cellWidth, unitY);
}

function onCanvasMousedown(event) {
    if (event.button !== 0) { return; }
    if (event.target.closest('[data-block]')) { return; }
    startPan(event);
}

function onCanvasWheel(event) {
    const now = Date.now();
    const isMidScroll = (now - _lastScrollTime) < SCROLL_RESUME_MS;

    if (!isMidScroll) {
        const active = document.activeElement;
        const tag = active?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || active?.isContentEditable) { return; }
    }

    event.preventDefault();
    _lastScrollTime = now;

    const factor = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? window.innerHeight : 1;
    const dx = event.deltaX * factor;
    const dy = event.deltaY * factor;

    if (event.shiftKey) {
        panByDelta(-(dx || dy), 0);
    } else {
        panByDelta(-dx, -dy);
    }
}

function openSheetSidebar() { sheetSidebarOpen.value = true; }
function createSheetFromEmpty() { createSheet('Untitled'); }

// status
const statusText = computed(() => {
    if (deletedNotice.value) { return `"${deletedNotice.value}" deleted`; }
    if (localStatus.value === 'saving') { return 'Saving...'; }
    if (localStatus.value === 'error') { return localError.value ?? 'Save error'; }
    return 'Auto-saved';
});

const statusColor = computed(() => {
    if (localStatus.value === 'error') { return 'text-red-400'; }
    return 'text-gray-400';
});
</script>

<template>
    <div class="flex flex-col h-screen overflow-hidden">
        <app-bar class="z-1200">
            <template #nav>
                <app-icon />
                <app-bar-toggle-button :open="sheetSidebarOpen" aria-label="Toggle sheets sidebar" @toggle="toggleSheetSidebar">
                    <sheet-sidebar-icon />
                </app-bar-toggle-button>
            </template>
            <template #title>
                <sheet-title :sheet-name="activeSheetName" :status-text="statusText" :status-color="statusColor" />
            </template>
            <template #controls>
                <reset-pan-button @reset="resetPan" />
                <app-bar-toggle-button :open="sidebarOpen" aria-label="Toggle Viz Editor sidebar" @toggle="toggleSidebar">
                    <viz-sidebar-icon />
                </app-bar-toggle-button>
            </template>
        </app-bar>
        <div class="flex flex-1 overflow-hidden">
            <sheet-sidebar :open="sheetSidebarOpen" />
            <div class="flex flex-col flex-1 overflow-hidden">
                <sheet-tabs @open-sidebar="openSheetSidebar" />
                <div
                    ref="canvasEl"
                    data-canvas
                    role="group"
                    tabindex="-1"
                    aria-label="Block canvas"
                    title="Arrow keys to navigate · Enter to edit · Escape to exit"
                    class="relative flex-1 overflow-hidden"
                    :class="{ 'cursor-grabbing select-none': isPanning }"
                    @dragover.prevent
                    @drop.prevent="onDrop"
                    @mousedown="onCanvasMousedown"
                    @wheel="onCanvasWheel"
                >
                    <span ref="wrapAnnouncerEl" aria-live="polite" class="sr-only" />
                    <block-grid data-block-grid :data-cell-width="cellWidth" :data-cell-height="cellHeight" :pan-x="panX" :pan-y="panY" @dblclick="onCreate" />
                    <div class="absolute inset-0 pointer-events-none" :style="{ transform: `translate(${panX}px, ${panY}px)` }">
                        <block v-for="block in blocks" :key="`block-${block.id}`" class="pointer-events-auto" :block :context :identifiersByBlock :hovered :setHovered :clearHovered @edit-viz="onEditViz" />
                    </div>
                    <empty-canvas v-if="sheets.length === 0" @create="createSheetFromEmpty" />
                </div>
            </div>
        </div>
        <p-drawer v-model:visible="sidebarOpen" position="right" header="Custom Visualizations" class="w-125 top-9.75">
            <template #container>
                <div class="overflow-hidden" style="height: calc(100vh - 2.4375rem)">
                    <custom-viz-editor class="h-full -ml-px" />
                </div>
            </template>
        </p-drawer>
        <undo-delete-toast :pending="undoPending" @undo="undoDelete" @dismiss="dismissUndo" />
    </div>
</template>
