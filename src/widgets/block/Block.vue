<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, toRaw } from 'vue';
import { useCellDimensions } from '@/shared/composables';
import { useSidebar } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useDrag } from '@/features/block/drag';
import { useResize } from '@/features/block/resize';
import { BlockName, usePendingNameFocus } from '@/features/block/name';
import { CodeEditor } from '@/features/block/edit-code';
import { useBlockManager, useDeleteBlock } from '@/features/block/manage';
import { detectStringMode } from '@/shared/lib/evaluator';
import { VIZ_TYPES } from '@/features/block/visualize';
import { useCustomViz } from '@/features/block/visualize';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    context: {
        type: Object
    },
    identifiersByBlock: {
        type: Object,
        required: true
    },
    hovered: {
        type: String,
        default: null
    },
    setHovered: {
        type: Function,
        required: true
    },
    clearHovered: {
        type: Function,
        required: true
    }
});

const { blocks, updateBlock } = useBlockStore();
const { cellHeight, cellWidth, unitX, snapX, snapY } = useCellDimensions();
const { createBlock } = useBlockManager();
const { deleteBlock } = useDeleteBlock();
const { pendingFocusBlockName } = usePendingNameFocus();
const { startDrag } = useDrag(snapX, snapY);
const { startResize } = useResize(snapX, snapY, cellWidth, cellHeight);

const rawEditorHeight = ref(cellHeight.value);
const rawEditorWidth = ref(props.block.width);
const rawOutputHeight = ref(cellHeight.value);

// Minimums set by manual resize — prevent auto-grow from shrinking below user-set size.
const manualMinEditorHeight = ref(props.block.userMinEditorHeight ?? 0);
const manualMinWidth = ref(props.block.userMinWidth ?? 0);

const MAX_OUTPUT_ROWS = 15;

const snappedEditorHeight = computed(() => {
    const contentHeight = Math.max(1, Math.ceil(rawEditorHeight.value / cellHeight.value)) * cellHeight.value;
    return Math.max(contentHeight, manualMinEditorHeight.value);
});

// Viz overlay and inputs panel — hoisted here so snappedBlockHeight can reference them
const showVizBar = ref(false);
const panelOpen = ref(false);

const blockDeps = computed(() => {
    const ids = props.identifiersByBlock[props.block.name] || [];
    const names = new Set(blocks.map(b => b.name));
    return ids.filter(id => names.has(id) && id !== props.block.name);
});
const hasInputs = computed(() => blockDeps.value.length > 0);
const snappedInputsPanelHeight = computed(() => panelOpen.value && hasInputs.value ? blockDeps.value.length * cellHeight.value : 0);

const snappedEditorWidth = computed(() => {
    const contentWidth = Math.max(cellWidth.value, Math.ceil(rawEditorWidth.value / unitX.value) * unitX.value);
    return Math.max(contentWidth, manualMinWidth.value);
});

// Must be defined before snappedOutputHeight, which depends on them.
const blockEval = computed(() => props.context.getEvaluation(props.block.name));

function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
}

const outputValue = computed(() => blockEval.value?.value);
const isList = computed(() => Array.isArray(outputValue.value));
const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

const snappedOutputHeight = computed(() => {
    const vizType = props.block.visualizationType ?? 'default';
    if (vizType === 'default' && isList.value) {
        return Math.max(1, Math.min(outputItems.value.length, MAX_OUTPUT_ROWS)) * cellHeight.value;
    }
    const minRows = vizType !== 'default' ? 3 : 1;
    const rows = Math.max(minRows, Math.ceil(rawOutputHeight.value / cellHeight.value));
    return Math.min(rows, MAX_OUTPUT_ROWS) * cellHeight.value;
});

// Total block height: header + editor + inputs panel + output, always snapped to grid rows.
// Drives the visual outline directly. block.height kept in sync for serialization/resize.
const snappedBlockHeight = computed(() =>
    cellHeight.value + snappedEditorHeight.value + snappedInputsPanelHeight.value + snappedOutputHeight.value
);

watch(snappedBlockHeight, h => {
    updateBlock(props.block.id, { height: h });
}, { immediate: true });

watch(snappedEditorWidth, w => {
    updateBlock(props.block.id, { width: w });
}, { immediate: true });

// Sync external width/height changes (e.g. resize handle) back into raw refs.
// Guard against our own write-back watches above to avoid circular updates.
watch(() => props.block.width, w => {
    if (w !== snappedEditorWidth.value) {
        rawEditorWidth.value = w;
    }
});

watch(() => props.block.height, h => {
    if (h !== snappedBlockHeight.value) {
        // block.height = header + editor + inputs panel + output; isolate the editor portion
        rawEditorHeight.value = h - cellHeight.value - snappedInputsPanelHeight.value - snappedOutputHeight.value;
    }
});

onBeforeUnmount(() => {
    resizeCleanup?.();
});

const blockPositionStyle = computed(() => ({
    top: `${props.block.y + 1}px`,
    left: `${props.block.x + 1}px`,
    width: `${snappedEditorWidth.value - 1}px`,
    height: `${snappedBlockHeight.value - 1}px`
}));

const outputOverflowY = computed(() => {
    const vizType = props.block.visualizationType ?? 'default';
    if (vizType !== 'default') { return 'hidden'; }
    if (isList.value) { return outputItems.value.length > MAX_OUTPUT_ROWS ? 'auto' : 'hidden'; }
    return rawOutputHeight.value > MAX_OUTPUT_ROWS * cellHeight.value ? 'auto' : 'hidden';
});

const formattedResult = computed(() => {
    const evaluation = blockEval.value;
    if (evaluation?.error) { return 'null'; }
    const v = evaluation ? evaluation.value : undefined;
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
});

const activeVizComponent = computed(() =>
    VIZ_TYPES[props.block.visualizationType ?? 'default']?.component ?? VIZ_TYPES.default.component
);

// Viz selector bar
const vizMenu = ref(null);
const { customVizes, activeVizName: sidebarActiveVizName } = useCustomViz();
const { open: openSidebar } = useSidebar();

const currentVizType = computed(() => props.block.visualizationType ?? 'default');
const currentVizLabel = computed(() => {
    if (currentVizType.value === 'custom') {
        return props.block.vizOptions?.customVizName ?? 'Custom';
    }
    return VIZ_TYPES[currentVizType.value]?.label ?? 'Default';
});

const vizMenuItems = computed(() => {
    const items = [];
    for (const [key, { label }] of Object.entries(VIZ_TYPES)) {
        if (key === 'custom') { continue; }
        items.push({
            label: currentVizType.value === key ? `✔ ${label}` : label,
            command: () => updateBlock(props.block.id, { visualizationType: key })
        });
    }
    const customNames = Object.keys(customVizes);
    if (customNames.length > 0) {
        items.push({ separator: true });
        for (const name of customNames) {
            const isActive = currentVizType.value === 'custom' && props.block.vizOptions?.customVizName === name;
            items.push({
                label: isActive ? `✔ ${name}` : name,
                command: () => updateBlock(props.block.id, {
                    visualizationType: 'custom',
                    vizOptions: { ...(props.block.vizOptions ?? {}), customVizName: name }
                })
            });
        }
    }
    if (currentVizType.value === 'custom') {
        items.push({ separator: true });
        items.push({
            label: 'Edit viz code…',
            command: () => {
                openSidebar();
                sidebarActiveVizName.value = props.block.vizOptions?.customVizName ?? null;
            }
        });
    }
    return items;
});

function modeFor(ref) {
    return (props.block.inputModes || {})[ref] ?? 'each';
}

function setMode(ref, mode) {
    updateBlock(props.block.id, { inputModes: { ...props.block.inputModes, [ref]: mode } });
}

function toggleInputsPanel() {
    panelOpen.value = !panelOpen.value;
}

function toggleVizBar() {
    showVizBar.value = !showVizBar.value;
}

const isResizingLocal = ref(false);
let resizeCleanup = null;

function handleStartResize(block, event) {
    isResizingLocal.value = true;
    startResize(block, event);
    // Add listeners AFTER startResize so useResize's mousemove fires first,
    // ensuring block.width/height are already updated when we read them.
    const onMove = () => {
        manualMinWidth.value = block.width;
        manualMinEditorHeight.value = Math.max(
            cellHeight.value,
            block.height - cellHeight.value - snappedOutputHeight.value
        );
    };
    const onUp = () => {
        isResizingLocal.value = false;
        updateBlock(props.block.id, {
            userMinWidth: manualMinWidth.value,
            userMinEditorHeight: manualMinEditorHeight.value
        });
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizeCleanup = null;
    };
    resizeCleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function outputsEqual(a, b) {
    if (a === b) { return true; }
    try { return JSON.stringify(toRaw(a)) === JSON.stringify(toRaw(b)); } catch { return false; }
}

function onExtract(selectedText) {
    const outputBefore = blockEval.value?.error ? null : toRaw(blockEval.value?.value);
    const x = props.block.x + snappedEditorWidth.value + cellWidth.value;
    const y = props.block.y;
    const newName = createBlock({ x, y }, null, selectedText);
    updateBlock(props.block.id, { inputModes: { ...props.block.inputModes, [newName]: 'each' } });
    pendingFocusBlockName.value = newName;

    nextTick(() => {
        const outputAfter = blockEval.value?.error ? null : toRaw(blockEval.value?.value);
        if (!outputsEqual(outputBefore, outputAfter)) {
            updateBlock(props.block.id, { inputModes: { ...props.block.inputModes, [newName]: 'all' } });
        }
    });

    return newName;
}

const isHighlighted = computed(() => props.hovered === props.block.name);
const isNameEditing = ref(false);

const flashType = ref(null);
watch(
    () => {
        const ev = blockEval.value;
        return ev?.error ? `error:${ev.error}` : `ok:${formattedResult.value}`;
    },
    (sig) => {
        flashType.value = null;
        nextTick(() => { flashType.value = sig.startsWith('error') ? 'error' : 'ok'; });
    }
);
</script>

<template>
    <div class="group absolute select-none outline outline-1 bg-white shadow-md text-[.875rem] leading-[1rem] flex flex-col"
         :style="blockPositionStyle"
         :class="[isHighlighted ? 'outline-black z-10' : 'outline-gray-300 hover:outline-black hover:z-10', {'resizing-local': isResizingLocal, 'inputs-panel-open': panelOpen, 'viz-bar-open': showVizBar}]">
        <div class="block-header relative border-b border-gray-300 flex items-center h-6"
             :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <!-- Name — draggable row, absolute so it centers against full header width -->
            <div class="absolute inset-0 flex items-center justify-center cursor-move"
                 :class="{ 'z-20': isNameEditing }"
                 @mousedown="startDrag(block, $event)">
                <block-name :name="block.name" :blocks :identifiersByBlock="props.identifiersByBlock"
                    class="block-name w-full"
                    @update:name="updateBlock(block.id, { name: $event })"
                    @editing-change="isNameEditing = $event" />
            </div>
            <!-- Right icons -->
            <div class="flex items-center flex-shrink-0 h-full ml-auto relative z-10 group-[.resizing-local]:invisible">
                <button
                    class="h-full pl-1.5 pr-0.5 flex items-center opacity-50 group-hover:opacity-75 hover:!opacity-100 cursor-pointer transition-opacity"
                    title="Delete block"
                    @click.stop="deleteBlock(block)"
                    @mousedown.stop>
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M3.5 3.5l.75 8h5.5l.75-8"/>
                    </svg>
                </button>
                <button v-if="hasInputs"
                    class="h-full pl-1.5 pr-0.5 flex items-center opacity-50 group-hover:opacity-75 hover:!opacity-100 cursor-pointer transition-opacity"
                    :class="panelOpen ? '!opacity-100' : ''"
                    title="Inputs"
                    @click.stop="toggleInputsPanel">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="2" cy="4.5" r="1.5" fill="currentColor" stroke="none"/>
                        <circle cx="2" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                        <path d="M3.5 4.5 C6 4.5 6 8 8 8"/>
                        <path d="M3.5 11.5 C6 11.5 6 8 8 8"/>
                        <polyline points="6.5,6.5 8,8 6.5,9.5"/>
                        <rect x="8" y="4" width="6" height="8" rx="1.5"/>
                    </svg>
                </button>
                <button class="h-full px-1.5 flex items-center opacity-50 group-hover:opacity-75 hover:!opacity-100 cursor-pointer transition-opacity"
                        :class="showVizBar ? '!opacity-100' : ''"
                        title="Visualization"
                        @click.stop="toggleVizBar">
                    <svg viewBox="0 0 16 16" width="14" height="14">
                        <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
                        <rect x="3"    y="9"   width="2.5" height="5"   fill="currentColor"/>
                        <rect x="6.75" y="6.5" width="2.5" height="7.5" fill="currentColor"/>
                        <rect x="10.5" y="4"   width="2.5" height="10"  fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="block-code w-full" :class="{ 'is-string': detectStringMode(block.code) }" :style="{ height: snappedEditorHeight + 'px' }">
            <code-editor class="block-code-editor h-full w-full" :code="block.code" :blocks :setHovered :clearHovered
                :inputModes="block.inputModes || {}"
                :onExtract
                @update:code="updateBlock(block.id, { code: $event })"
                @update:content-height="rawEditorHeight = $event" @update:content-width="rawEditorWidth = $event" />
        </div>
        <div v-if="panelOpen && hasInputs" class="inputs-panel w-full border-t border-gray-300 bg-gray-50 flex-shrink-0">
            <div v-for="ref in blockDeps" :key="ref"
                class="input-row flex items-center justify-between px-2 gap-2"
                :style="{ height: cellHeight + 'px' }"
                :class="{ 'border-t border-gray-200': blockDeps.indexOf(ref) > 0 }">
                <span class="font-mono text-[12px] text-gray-700">{{ ref }}</span>
                <div class="flex gap-0.5">
                    <button
                        class="text-[10px] font-bold px-2 py-0.5 rounded-sm border-2 cursor-pointer"
                        :class="modeFor(ref) === 'each' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'"
                        @click="setMode(ref, 'each')">each</button>
                    <button
                        class="text-[10px] font-bold px-2 py-0.5 rounded-sm border-2 cursor-pointer"
                        :class="modeFor(ref) === 'all' ? 'bg-white text-black border-black' : 'bg-white text-gray-400 border-gray-200'"
                        @click="setMode(ref, 'all')">all</button>
                </div>
            </div>
        </div>
        <div class="block-output w-full border-t border-gray-300 bg-white relative"
            :style="{ height: snappedOutputHeight + 'px', overflowY: outputOverflowY }"
            :class="{ 'output-flash-ok': flashType === 'ok', 'output-flash-error': flashType === 'error' }"
            @animationend="flashType = null">
            <component
                :is="activeVizComponent"
                :value="outputValue"
                :error="blockEval?.error ?? null"
                :block="block"
                :is-list="isList"
                :output-items="outputItems"
                :get-evaluation="context.getEvaluation"
                class="h-full w-full"
                @update:content-height="rawOutputHeight = $event"
            />
            <div v-if="showVizBar" class="absolute top-1 right-1 z-10">
                <button class="flex items-center gap-0.5 text-[10px] rounded px-1 py-0 bg-white/90 hover:bg-white shadow-sm cursor-pointer"
                        @click.stop="vizMenu.toggle($event)">
                    {{ currentVizLabel }}<span class="text-[10px] opacity-50">▾</span>
                </button>
                <p-menu ref="vizMenu" :model="vizMenuItems" popup />
            </div>
        </div>
        <div class="block-handle absolute box-border h-3 w-3 mb-0.5 mr-0.5 cursor-se-resize select-none border-r border-b border-gray-300 bg-transparent"
            @mousedown.stop.prevent="handleStartResize(block, $event)">
        </div>
    </div>
</template>

<style scoped>
.block-output {
    anchor-name: --block-output;
}
.block-handle {
    position-anchor: --block-output;
    bottom: anchor(bottom);
    right: anchor(right);
}

.output-flash-ok {
    animation: output-flash-ok 0.5s ease-out;
}
.output-flash-error {
    animation: output-flash-error 0.5s ease-out;
}
@keyframes output-flash-ok {
    0%   { background-color: #fef08a; }
    100% { background-color: white; }
}
@keyframes output-flash-error {
    0%   { background-color: #fca5a5; }
    100% { background-color: white; }
}
</style>
