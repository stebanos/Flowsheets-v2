<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useHoveredState, useSidebar } from '@/shared/composables';
import { serializeSheet, deserializeSheet } from '@/shared/lib/persistence';
import { useBlockDependencies, useBlockStore } from '@/entities/block';
import { useNoteStore } from '@/entities/note';
import { useSheetStore } from '@/entities/sheet';
import { useVizLibrary } from '@/entities/viz';
import { useBlockEvaluation } from '@/features/block/evaluation';
import { useCellDimensions } from '@/features/block/grid';
import { useDataImport } from '@/features/block/import';
import { useBlockClipboard, useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { useFocusedBlock, useBlockSelection } from '@/features/block/navigate';
import { useCustomViz } from '@/features/block/visualize';
import { useCanvasPan, useRubberBandSelection } from '@/features/canvas';
import { useFocusedNote } from '@/features/note';
import { initHistory, useHistory, useFileIO, useSheetManager, useSheetStorage } from '@/features/sheet';
import { Block, BlockGrid, CanvasNote, CustomVizEditor, SheetSidebar, SheetTabs } from '@/widgets';
import { AppBar, AppBarToggleButton, EmptyCanvas, ResetPanButton, SheetTitle, UndoRedoButtons } from './components';
import { AppIcon, SheetSidebarIcon, VizSidebarIcon } from './components/icons';

// stores
const { blocks, replaceBlocks } = useBlockStore();
const { notes, addNote, replaceNotes } = useNoteStore();
const { sheets, activeSheetName, activeSheetId } = useSheetStore();

// evaluation
const { identifiersByBlock, dependsOn } = useBlockDependencies({ debounceMs: 0 });
const context = useBlockEvaluation(dependsOn);

// block interaction
const { createBlock } = useBlockManager();
const { copySelected, cutSelected, pasteBlocks, duplicateSelected } = useBlockClipboard();
const { deleteBlock } = useDeleteBlock();
const { hovered, setHovered, clearHovered } = useHoveredState();
const { cellWidth, unitY, setCellDimensions } = useCellDimensions();
setCellDimensions(150, 24);

// viz sidebar
const { isOpen: sidebarOpen, open: openSidebar, toggle: toggleSidebar } = useSidebar();
const { activeVizName, customVizes, loadVizes } = useCustomViz();
const { library, loadLibrary, loadError: vizLoadError } = useVizLibrary();

// sheet sidebar
const { isOpen: sheetSidebarOpen, toggle: toggleSheetSidebar } = useSidebar();
const SHEET_SIDEBAR_KEY = 'flowsheets.v2.sheetSidebarOpen';
sheetSidebarOpen.value = JSON.parse(localStorage.getItem(SHEET_SIDEBAR_KEY) ?? 'true');
watch(sheetSidebarOpen, val => localStorage.setItem(SHEET_SIDEBAR_KEY, JSON.stringify(val)));

// canvas pan
const { panX, panY, isPanning, startPan, resetPan, setPan, panByDelta } = useCanvasPan();

// history
const history = useHistory();
const { canUndo, canRedo } = history;

// rubber-band selection
const { isSelecting, rect, startRubberBand, updateRubberBand, finishRubberBand } = useRubberBandSelection();
const { selectedNames, selectAll, setSelection, clearSelection } = useBlockSelection();

const isSpaceHeld = ref(false);
const canvasMousePos = ref(null);

function _onKeydown(e) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const inInput = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;

    if (e.code !== 'Space' && inInput) { return; }

    if (e.code === 'Space') {
        if (e.repeat || inInput) { return; }
        isSpaceHeld.value = true;
        e.preventDefault();
        return;
    }

    const cmd = e.metaKey || e.ctrlKey;

    if (cmd && e.key === 'a') { selectAll(blocks); e.preventDefault(); return; }
    if (cmd && e.key === 'c') { copySelected(blocks, [...selectedNames.value]); return; }
    if (cmd && e.key === 'x') {
        cutSelected(blocks, [...selectedNames.value]).then(ok => { if (ok) { clearSelection(); } });
        return;
    }
    if (cmd && e.key === 'v') {
        pasteBlocks({ canvasX: canvasMousePos.value?.x, canvasY: canvasMousePos.value?.y, canvasEl: canvasEl.value, panX, panY })
            .then(newNames => { if (newNames) { setSelection(newNames); } });
        return;
    }
    if (cmd && e.key === 'd') {
        const newNames = duplicateSelected(blocks, [...selectedNames.value], { cellWidth, unitY });
        if (newNames) { setSelection(newNames); }
        e.preventDefault();
        return;
    }
    if (cmd && e.shiftKey && e.key === 'Z') { history.redo(); e.preventDefault(); return; }
    if (cmd && !e.shiftKey && e.key === 'z') { history.undo(); e.preventDefault(); return; }
    if (e.key === 'Escape' && focusedBlockName.value === null) { clearSelection(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && focusedBlockName.value === null && focusedNoteId.value === null && selectedNames.value.size > 0) {
        const toDelete = blocks.filter(b => selectedNames.value.has(b.name));
        clearSelection();
        for (const b of toDelete) { deleteBlock(b); }
    }
}

function _onKeyup(e) {
    if (e.code === 'Space') { isSpaceHeld.value = false; }
}

// canvas context menu
const canvasContextMenu = ref(null);
const contextMenuPos = ref({ x: 0, y: 0 });
const canvasContextMenuItems = [
    {
        label: 'Add note',
        command: () => {
            addNote({
                id: crypto.randomUUID(),
                x: contextMenuPos.value.x,
                y: contextMenuPos.value.y,
                width: 200,
                height: 150,
                title: '',
                body: ''
            });
        }
    },
    {
        label: 'Import data…',
        command: () => {
            importTargetPos.value = { x: contextMenuPos.value.x, y: contextMenuPos.value.y };
            dataInputEl.value?.click();
        }
    }
];

// CSV / JSON data import
const { importDataFile, pendingLargeImport, confirmLargeImport, cancelLargeImport } = useDataImport({ createBlock, cellWidth, unitY });
const dataInputEl = ref(null);
const importTargetPos = ref({ x: 0, y: 0 });
const dataImportError = ref(null);

async function onDataInputChange(e) {
    const file = e.target.files[0];
    if (!file) { return; }
    e.target.value = '';
    const result = await importDataFile(file, importTargetPos.value);
    if (result.error) { dataImportError.value = result.error; }
}

// keyboard nav
const { registerCanvas, focusedBlockName } = useFocusedBlock();
const { focusedNoteId } = useFocusedNote();
const canvasEl = ref(null);
const wrapAnnouncerEl = ref(null);

const SCROLL_RESUME_MS = 500;
const LINE_PX = 40;
let _lastScrollTime = 0;

// sheet & file management
const { createSheet, deletedNotice } = useSheetManager();
const { localStatus, localError, loadFromStorage, scheduleSave, isFirstBoot } = useSheetStorage({
    getCustomVizes:  () => library,
    getPan:          () => ({ panX: panX.value, panY: panY.value }),
    onPanLoaded:     (view) => setPan(view.panX, view.panY)
});
const { prepareImport } = useFileIO();
watch([library, activeVizName], scheduleSave, { deep: true });
watch([panX, panY], scheduleSave);
watch(activeSheetName, () => clearSelection());

// track active sheet for per-sheet history stacks
watch(activeSheetId, (id) => { if (id) { history.setActiveSheet(id); } }, { immediate: true, flush: 'sync' });

// lifecycle
onMounted(async () => {
    window.addEventListener('keydown', _onKeydown);
    window.addEventListener('keyup', _onKeyup);
    registerCanvas(canvasEl.value, wrapAnnouncerEl.value);
    // wire history snapshot capture/restore + register store hooks
    await initHistory(
        () => serializeSheet(blocks, {}, activeSheetName.value, { panX: panX.value, panY: panY.value }, notes),
        (snapshot) => {
            const { blocks: loadedBlocks, view, notes: loadedNotes } = deserializeSheet(snapshot);
            replaceBlocks(loadedBlocks);
            setPan(view.panX, view.panY);
            replaceNotes(loadedNotes);
        }
    );
    await loadLibrary();
    loadVizes(library);
    await loadFromStorage();
    if (isFirstBoot.value) {
        createBlock({ x: 301, y: 73 }, 'greeting', '"Hello"', cellWidth, unitY);
        createBlock({ x: 601, y: 145 }, 'message', '`${greeting}, world!`', cellWidth, unitY);
    }
});

onUnmounted(() => {
    window.removeEventListener('keydown', _onKeydown);
    window.removeEventListener('keyup', _onKeyup);
});

// handlers
function onEditViz(vizName) {
    openSidebar();
    activeVizName.value = vizName;
}

function _isDataFile(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith('.csv')) { return true; }
    return lower.endsWith('.json') && !lower.endsWith('.flowsheet.json') && !lower.endsWith('.flowbundle.json');
}

async function onDrop(e) {
    const files = [...(e.dataTransfer?.files ?? [])];

    const sheetFile = files.find(f => f.name.endsWith('.flowsheet.json'));
    if (sheetFile) { await prepareImport(sheetFile); return; }

    const dataFile = files.find(f => _isDataFile(f.name));
    if (dataFile) {
        const { left, top } = canvasEl.value.getBoundingClientRect();
        const pos = { x: e.clientX - left - panX.value, y: e.clientY - top - panY.value };
        const result = await importDataFile(dataFile, pos);
        if (result.error) { dataImportError.value = result.error; }
    }
}

function onCreate(event) {
    const { clientX, clientY } = event;
    const { left, top } = event.target.getBoundingClientRect();
    createBlock({ x: clientX - left - panX.value, y: clientY - top - panY.value }, null, '1 + 1', cellWidth, unitY);
}

function onCanvasMousedown(event) {
    if (event.button === 1) { startPan(event); return; }
    if (event.button === 0 && isSpaceHeld.value) { startPan(event); return; }
    if (event.button === 0 && !event.target.closest('[data-block], [data-note]')) {
        const canvasRect = canvasEl.value.getBoundingClientRect();
        startRubberBand(
            event.clientX - canvasRect.left - panX.value,
            event.clientY - canvasRect.top - panY.value
        );
        const onMove = (e) => updateRubberBand(
            e.clientX - canvasRect.left - panX.value,
            e.clientY - canvasRect.top - panY.value
        );
        const onUp = () => {
            finishRubberBand(blocks, setSelection, clearSelection);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
}

function _findScrollableAncestor(el) {
    while (el && el !== canvasEl.value) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) { return el; }
        el = el.parentElement;
    }
    return null;
}

function onCanvasWheel(event) {
    const now = Date.now();
    const isMidScroll = (now - _lastScrollTime) < SCROLL_RESUME_MS;

    if (!isMidScroll) {
        const active = document.activeElement;
        const tag = active?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || active?.isContentEditable) { return; }

        const scrollable = _findScrollableAncestor(event.target);
        if (scrollable) {
            const canScrollDown = event.deltaY > 0 && scrollable.scrollTop < scrollable.scrollHeight - scrollable.clientHeight;
            const canScrollUp = event.deltaY < 0 && scrollable.scrollTop > 0;
            if (canScrollDown || canScrollUp) { return; }
        }
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

function onCanvasMousemove(e) {
    const { left, top } = canvasEl.value.getBoundingClientRect();
    canvasMousePos.value = {
        x: e.clientX - left - panX.value,
        y: e.clientY - top - panY.value
    };
}

function onCanvasContextMenu(event) {
    if (event.target.closest('[data-block]') || event.target.closest('[data-note]')) { return; }
    const { left, top } = canvasEl.value.getBoundingClientRect();
    contextMenuPos.value = {
        x: event.clientX - left - panX.value,
        y: event.clientY - top - panY.value
    };
    canvasContextMenu.value.show(event);
}

// status
const statusText = computed(() => {
    if (deletedNotice.value) { return `"${deletedNotice.value}" deleted`; }
    if (localStatus.value === 'saving') { return 'Saving...'; }
    if (localStatus.value === 'error') { return localError.value ?? 'Save error'; }
    if (vizLoadError.value) { return vizLoadError.value; }
    return 'Auto-saved';
});

const statusColor = computed(() => {
    if (localStatus.value === 'error' || vizLoadError.value) { return 'text-red-400'; }
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
                <undo-redo-buttons :can-undo="canUndo" :can-redo="canRedo" @undo="history.undo()" @redo="history.redo()" />
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

                    class="relative flex-1 overflow-hidden outline-none"
                    :class="{ 'cursor-grabbing select-none': isPanning && !isSpaceHeld }"
                    @dragover.prevent
                    @drop.prevent="onDrop"
                    @mousedown="onCanvasMousedown"
                    @mousemove="onCanvasMousemove"
                    @wheel.capture="onCanvasWheel"
                    @contextmenu="onCanvasContextMenu"
                >
                    <span ref="wrapAnnouncerEl" aria-live="polite" class="sr-only" />
                    <div
                        v-if="isSpaceHeld"
                        class="absolute inset-0 z-50"
                        :class="isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'"
                        @mousedown="onCanvasMousedown"
                    />
                    <block-grid data-block-grid :pan-x="panX" :pan-y="panY" @dblclick="onCreate" />
                    <div class="absolute inset-0 pointer-events-none" :style="{ transform: `translate(${panX}px, ${panY}px)` }">
                        <canvas-note v-for="note in notes" :key="`note-${note.id}`" class="pointer-events-auto" :note />
                        <block v-for="block in blocks" :key="`block-${block.id}`" class="pointer-events-auto" :block :context :identifiersByBlock :hovered :setHovered :clearHovered @edit-viz="onEditViz" />
                    </div>
                    <empty-canvas v-if="sheets.length === 0" @create="createSheetFromEmpty" />
                    <div
                        v-if="isSelecting && rect"
                        class="pointer-events-none absolute border border-cyan-400 bg-cyan-100/30"
                        :style="{
                            left: Math.min(rect.x1, rect.x2) + panX + 'px',
                            top: Math.min(rect.y1, rect.y2) + panY + 'px',
                            width: Math.abs(rect.x2 - rect.x1) + 'px',
                            height: Math.abs(rect.y2 - rect.y1) + 'px'
                        }"
                    />
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
        <p-context-menu ref="canvasContextMenu" :model="canvasContextMenuItems" />

        <!-- Hidden data-import file input -->
        <input
            ref="dataInputEl"
            type="file"
            accept=".csv,.json"
            class="hidden"
            @change="onDataInputChange"
        />

        <!-- Data import error dialog -->
        <p-dialog
            v-if="dataImportError"
            :visible="true"
            modal
            :closable="false"
            header="Import failed"
            class="w-md"
        >
            <p class="text-sm text-red-500">{{ dataImportError }}</p>
            <template #footer>
                <p-button label="Close" @click="dataImportError = null" />
            </template>
        </p-dialog>

        <!-- Large-file import confirmation -->
        <p-dialog
            v-if="pendingLargeImport"
            :visible="true"
            modal
            :closable="false"
            header="Large file"
            class="w-md"
        >
            <p class="text-sm text-gray-600">
                This file is large ({{ (pendingLargeImport.byteLength / (1024 * 1024)).toFixed(1) }} MB).
                Embedding it may slow the sheet. Import anyway?
            </p>
            <template #footer>
                <p-button label="Cancel" severity="secondary" text @click="cancelLargeImport" />
                <p-button label="Import" @click="confirmLargeImport" />
            </template>
        </p-dialog>
    </div>
</template>
