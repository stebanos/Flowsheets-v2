<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, toRaw } from 'vue';
import { useCellDimensions } from '@/shared/composables';
import { useSidebar } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useDrag } from '@/features/block/drag';
import { useResize } from '@/features/block/resize';
import { BlockName, usePendingNameFocus } from '@/features/block/name';
import { CodeEditor } from '@/features/block/edit-code';
import { useBlockManager } from '@/features/block/manage';
import { BlockMenu } from '@/widgets/block-menu';
import { VIZ_TYPES } from '@/features/block/visualize';
import { useCustomViz } from '@/features/block/visualize/useCustomViz';

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
const { pendingFocusBlockName } = usePendingNameFocus();
const { startDrag } = useDrag(snapX, snapY);
const { startResize } = useResize(snapX, snapY, cellWidth, cellHeight);

const rawEditorHeight = ref(cellHeight.value);
const rawEditorWidth = ref(props.block.width);
const rawFilterHeight = ref(cellHeight.value);
const rawOutputHeight = ref(cellHeight.value);

// Minimums set by manual resize — prevent auto-grow from shrinking below user-set size.
const manualMinEditorHeight = ref(props.block.userMinEditorHeight ?? 0);
const manualMinWidth = ref(props.block.userMinWidth ?? 0);

const MAX_OUTPUT_ROWS = 15;

const snappedEditorHeight = computed(() => {
    const contentHeight = Math.max(1, Math.ceil(rawEditorHeight.value / cellHeight.value)) * cellHeight.value;
    return Math.max(contentHeight, manualMinEditorHeight.value);
});
const snappedFilterHeight = computed(() => {
    if (props.block.filterClause === null) { return 0; }
    return Math.max(1, Math.ceil(rawFilterHeight.value / cellHeight.value)) * cellHeight.value;
});
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

// Total block height: header + editor + filter (if any) + output, always snapped to grid rows.
// Drives the visual outline directly. block.height kept in sync for serialization/resize.
const snappedBlockHeight = computed(() =>
    cellHeight.value + snappedEditorHeight.value + snappedFilterHeight.value + snappedOutputHeight.value
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
        // block.height = header (1 row) + editor + filter + output; isolate the editor portion
        rawEditorHeight.value = h - cellHeight.value - snappedFilterHeight.value - snappedOutputHeight.value;
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
const showVizBar = ref(false);
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

// Inputs panel
const panelOpen = ref(false);

const blockDeps = computed(() => {
    const ids = props.identifiersByBlock[props.block.name] || [];
    const names = new Set(blocks.map(b => b.name));
    return ids.filter(id => names.has(id) && id !== props.block.name);
});

const hasInputs = computed(() => blockDeps.value.length > 0);

function modeFor(ref) {
    return (props.block.inputModes || {})[ref] ?? 'each';
}

function setMode(ref, mode) {
    updateBlock(props.block.id, { inputModes: { ...props.block.inputModes, [ref]: mode } });
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

const isMenuOpen = ref(false);
const isHighlighted = computed(() => props.hovered === props.block.name);

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
         :class="[isHighlighted ? 'outline-black' : 'outline-gray-300', {'menu-visible': isMenuOpen, 'resizing-local': isResizingLocal, 'inputs-panel-open': panelOpen, 'viz-bar-open': showVizBar}]">
        <div class="block-header relative px-2 has-[input]:px-0.25 border-b border-gray-300" :class="isHighlighted ? 'bg-yellow-200 text-black' : 'bg-black text-white'">
            <block-menu :block class="block-menu absolute not-group-hover:invisible group-[.menu-visible]:visible group-[.resizing-local]:invisible" @menu-toggle="isMenuOpen = $event" />
            <block-name :name="block.name" :blocks :identifiersByBlock="props.identifiersByBlock"
                class="block-name min-h-6 h-6 flex items-center justify-center w-full cursor-move"
                @update:name="updateBlock(block.id, { name: $event })"
                @mousedown="startDrag(block, $event)" />
            <div class="absolute right-0 top-0 h-full flex items-center group-[.resizing-local]:invisible">
                <button v-if="hasInputs"
                        class="h-full px-1.5 flex items-center opacity-30 group-hover:opacity-60 hover:!opacity-100 cursor-pointer transition-opacity"
                        :class="{ '!opacity-100 bg-white/20': panelOpen }"
                        title="Inputs"
                        @click.stop="panelOpen = !panelOpen">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                        <rect x="2" y="3" width="12" height="2" rx="1"/>
                        <rect x="2" y="7" width="12" height="2" rx="1"/>
                        <rect x="2" y="11" width="12" height="2" rx="1"/>
                    </svg>
                </button>
                <button class="h-full px-1.5 flex items-center opacity-30 group-hover:opacity-60 hover:!opacity-100 cursor-pointer transition-opacity"
                        :class="{ '!opacity-100 bg-white/20': showVizBar }"
                        title="Visualization"
                        @click.stop="showVizBar = !showVizBar">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                        <rect x="1" y="1" width="6" height="6" rx="1"/>
                        <rect x="9" y="1" width="6" height="6" rx="1"/>
                        <rect x="1" y="9" width="6" height="6" rx="1"/>
                        <rect x="9" y="9" width="6" height="6" rx="1"/>
                    </svg>
                </button>
            </div>
        </div>
        <div v-if="showVizBar"
             class="absolute left-0 right-0 bg-white border-b border-gray-200 px-2 py-1 flex items-center z-50"
             style="top: 24px;">
            <button class="flex items-center gap-0.5 text-xs border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 cursor-pointer bg-white"
                    @click.stop="vizMenu.toggle($event)">
                {{ currentVizLabel }}<span class="text-[10px] opacity-50">▾</span>
            </button>
            <p-menu ref="vizMenu" :model="vizMenuItems" popup />
        </div>
        <div v-if="panelOpen && hasInputs" class="inputs-panel absolute left-0 right-0 bg-gray-50 border border-gray-300 shadow-md z-50" :style="{ top: showVizBar ? '56px' : '24px' }">
            <div v-for="ref in blockDeps" :key="ref"
                class="input-row flex items-center justify-between h-7 px-2 gap-2"
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
        <div class="block-code w-full" :class="{ 'is-string': block.isStringConcat }" :style="{ height: snappedEditorHeight + 'px' }">
            <code-editor class="block-code-editor h-full w-full" :code="block.code" :blocks :setHovered :clearHovered
                :isStringConcat="block.isStringConcat"
                :inputModes="block.inputModes || {}"
                :onExtract
                @update:code="updateBlock(block.id, { code: $event })"
                @update:content-height="rawEditorHeight = $event" @update:content-width="rawEditorWidth = $event" />
        </div>
        <div v-if="block.filterClause !== null" class="block-filter w-full border-t border-gray-300 flex items-stretch" :style="{ height: snappedFilterHeight + 'px' }">
            <span class="flex items-center px-1.5 text-[10px] text-gray-400 font-mono select-none border-r border-gray-200 bg-gray-50">filter:</span>
            <code-editor class="block-filter-editor flex-1 h-full min-w-0" :code="block.filterClause" :blocks :setHovered :clearHovered
                :isStringConcat="false"
                :inputModes="{}"
                @update:code="updateBlock(block.id, { filterClause: $event })"
                @update:content-height="rawFilterHeight = $event" />
        </div>
        <div class="block-output w-full border-t border-gray-300 bg-white"
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
                class="h-full w-full"
                @update:content-height="rawOutputHeight = $event"
            />
        </div>
        <div class="block-handle absolute box-border h-3 w-3 mb-0.5 mr-0.5 cursor-se-resize select-none border-r-2 border-b-2 border-gray-300 bg-transparent"
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
.block-header {
    anchor-name: --block-header;
}
.block-menu {
    position-anchor: --block-header;
    left: anchor(left);
    top: anchor(top);
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
