<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useFocusedBlock, useBlockNavigation } from '@/features/block/navigate';
import { detectStringMode } from '@/shared/lib/evaluator';
import { useCellDimensions } from '@/shared/composables';
import { useBlockStore } from '@/entities/block';
import { useDeleteBlock } from '@/features/block/manage';
import { useDrag } from '@/features/block/drag';
import { BlockName } from '@/features/block/name';
import { CodeEditor } from '@/features/block/edit-code';
import { useVizMenu } from '@/features/block/visualize';
import { useBlockExtract } from './useBlockExtract';
import { useBlockDimensions } from './useBlockDimensions';
import { useBlockOutput } from './useBlockOutput';

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

const emit = defineEmits(['edit-viz']);

const { blocks, updateBlock } = useBlockStore();

const { focusedBlockName, wrapIndicator, register, unregister, selectBlock, focusCanvas } = useFocusedBlock();
const { focusNext, focusPrev } = useBlockNavigation(blocks);

const wrapperEl = ref(null);
const codeEditorRef = ref(null);
const isEditing = ref(false);
const wrapFlash = ref(false);

const isFocused = computed(() => focusedBlockName.value === props.block.name);

watch(isFocused, (val) => {
    if (!val) { isEditing.value = false; }
});

watch(() => props.block.name, (newName, oldName) => {
    if (oldName) { unregister(oldName); }
    register(newName, () => wrapperEl.value?.focus(), () => codeEditorRef.value?.focus());
}, { immediate: true });

function onFocusIn() {
    selectBlock(props.block.name);
    isEditing.value = document.activeElement !== wrapperEl.value;
    if (wrapIndicator.value) {
        wrapIndicator.value = false;
        wrapFlash.value = true;
        setTimeout(() => { wrapFlash.value = false; }, 800);
    }
}

function onFocusOut() {
    setTimeout(() => {
        if (
            !wrapperEl.value?.contains(document.activeElement) &&
            focusedBlockName.value === props.block.name
        ) {
            focusCanvas();
            isEditing.value = false;
        }
    }, 0);
}

function onWrapperKeyDown(e) {
    if (document.activeElement !== wrapperEl.value) { return; }
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        focusNext(props.block.name);
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        focusPrev(props.block.name);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        codeEditorRef.value?.focus();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        focusCanvas();
    }
}

function onNavigate(dir) {
    if (dir === 'next') { focusNext(props.block.name); }
    else if (dir === 'prev') { focusPrev(props.block.name); }
    else { wrapperEl.value?.focus(); }
}

const { cellHeight, cellWidth, unitX, snapX, snapY } = useCellDimensions();
const { deleteBlock } = useDeleteBlock();
const { startDrag } = useDrag(snapX, snapY);

const showVizBar = ref(false);
const panelOpen = ref(false);

const blockDeps = computed(() => {
    const ids = props.identifiersByBlock[props.block.name] || [];
    const names = new Set(blocks.map(b => b.name));
    return ids.filter(id => names.has(id) && id !== props.block.name);
});
const hasInputs = computed(() => blockDeps.value.length > 0);
const snappedInputsPanelHeight = computed(() => panelOpen.value && hasInputs.value ? blockDeps.value.length * cellHeight.value : 0);

const blockEval = computed(() => props.context.getEvaluation(props.block.name));

const { outputValue, isList, outputItems, outputOverflowY, snappedOutputHeight, rawOutputHeight, manualMinOutputHeight } =
    useBlockOutput(props.block, { cellHeight, blockEval });

const editorCollapsed = ref(props.block.editorCollapsed ?? false);

const {
    snappedEditorHeight,
    snappedEditorWidth,
    snappedBlockHeight,
    manualMinEditorHeight,
    manualMinWidth,
    handleContentWidth,
    handleContentHeight
} = useBlockDimensions(props.block, { cellWidth, cellHeight, unitX, snappedInputsPanelHeight, snappedOutputHeight, editorCollapsed });

onBeforeUnmount(() => {
    resizeCleanup?.();
    unregister(props.block.name);
});

const blockPositionStyle = computed(() => ({
    top: `${props.block.y + 1}px`,
    left: `${props.block.x + 1}px`,
    width: `${snappedEditorWidth.value - 1}px`,
    height: `${snappedBlockHeight.value - 1}px`
}));

const formattedResult = computed(() => {
    const evaluation = blockEval.value;
    if (evaluation?.error) { return 'null'; }
    const v = evaluation ? evaluation.value : undefined;
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    try { return JSON.stringify(v); } catch { return String(v); }
});

// Viz selector bar
const vizMenu = ref(null);
const { vizMenuItems, currentVizLabel, activeVizComponent } =
    useVizMenu(props.block, (vizName) => emit('edit-viz', vizName));

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

function handleStartResizeEditor(event) {
    const startY = event.clientY;
    const startH = snappedEditorHeight.value;
    isResizingLocal.value = true;
    const onMove = (e) => {
        manualMinEditorHeight.value = Math.max(cellHeight.value, snapY(startH + e.clientY - startY));
    };
    const onUp = () => {
        isResizingLocal.value = false;
        updateBlock(props.block.id, { userMinEditorHeight: manualMinEditorHeight.value });
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

function handleStartResizeOutput(event) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startOutH = snappedOutputHeight.value;
    const startW = snappedEditorWidth.value;
    isResizingLocal.value = true;
    const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        manualMinOutputHeight.value = Math.max(cellHeight.value, snapY(startOutH + dy));
        manualMinWidth.value = Math.max(cellWidth.value, snapX(startW + dx));
    };
    const onUp = () => {
        isResizingLocal.value = false;
        updateBlock(props.block.id, { userMinOutputHeight: manualMinOutputHeight.value, userMinWidth: manualMinWidth.value });
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

function toggleEditorCollapse() {
    editorCollapsed.value = !editorCollapsed.value;
    updateBlock(props.block.id, { editorCollapsed: editorCollapsed.value });
}

const { onExtract } = useBlockExtract(
    props.block, props.context.getEvaluation, snappedEditorWidth, cellWidth
);

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
    <div data-block class="group absolute select-none outline bg-white shadow-md text-[.875rem] leading-4 flex flex-col"
         ref="wrapperEl"
         tabindex="0"
         :aria-label="isEditing ? `Block: ${block.name}, editing` : `Block: ${block.name}`"
         :style="blockPositionStyle"
         :class="[
             isEditing ? 'outline-amber-400 z-10'
             : isFocused ? 'outline-blue-400 z-10'
             : isHighlighted ? 'outline-black z-10'
             : 'outline-gray-300 hover:outline-black hover:z-10',
             wrapFlash ? 'ring-2 ring-offset-1 ring-amber-300 animate-pulse' : '',
             {'resizing-local': isResizingLocal, 'inputs-panel-open': panelOpen, 'viz-bar-open': showVizBar}
         ]"
         @focusin="onFocusIn"
         @focusout="onFocusOut"
         @keydown="onWrapperKeyDown">
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
            <div class="flex items-center shrink-0 h-full ml-auto relative z-10 group-[.resizing-local]:invisible">
                <button
                    class="h-full pl-1.5 pr-0.5 flex items-center opacity-50 group-hover:opacity-75 hover:opacity-100! cursor-pointer transition-opacity"
                    title="Delete block"
                    @click.stop="deleteBlock(block)"
                    @mousedown.stop>
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M3.5 3.5l.75 8h5.5l.75-8"/>
                    </svg>
                </button>
                <button v-if="hasInputs"
                    class="h-full pl-1.5 pr-0.5 flex items-center opacity-50 group-hover:opacity-75 hover:opacity-100! cursor-pointer transition-opacity"
                    :class="panelOpen ? 'opacity-100!' : ''"
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
                <button class="h-full px-1.5 flex items-center opacity-75 group-hover:opacity-75 hover:opacity-100! cursor-pointer transition-opacity"
                        :class="showVizBar ? 'opacity-100!' : ''"
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
        <div class="block-code w-full relative" :class="{ 'is-string': detectStringMode(block.code) }" :style="{ height: snappedEditorHeight + 'px' }">
            <button class="absolute top-0.5 right-0.5 z-10 opacity-0 group-hover:opacity-50 hover:opacity-100! cursor-pointer text-[10px] leading-none px-0.5 bg-transparent border-none"
                    title="Toggle editor"
                    @click.stop="toggleEditorCollapse"
                    @mousedown.stop>{{ editorCollapsed ? '▸' : '▾' }}</button>
            <div v-if="editorCollapsed" class="block-code-preview w-full h-full font-mono text-[11px] px-1 py-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-gray-400">{{ block.code.slice(0, 60) }}</div>
            <code-editor v-else ref="codeEditorRef" class="block-code-editor h-full w-full" :code="block.code" :blocks :setHovered :clearHovered
                :inputModes="block.inputModes || {}"
                :onExtract
                :onNavigate="onNavigate"
                @update:code="updateBlock(block.id, { code: $event })"
                @update:content-height="handleContentHeight($event)" @update:content-width="handleContentWidth($event)" />
            <div v-if="!editorCollapsed" class="block-code-handle absolute bottom-0 left-0 right-0 h-1 cursor-row-resize"
                 title="Resize editor"
                 @mousedown.stop.prevent="handleStartResizeEditor($event)" />
        </div>
        <div v-if="panelOpen && hasInputs" class="inputs-panel w-full border-t border-gray-300 bg-gray-50 shrink-0">
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
            :class="{ 'output-flash-ok': flashType === 'ok', 'output-flash-error': flashType === 'error', 'pointer-events-none': isResizingLocal }"
            @animationend="flashType = null"
            @wheel="outputOverflowY === 'auto' && $event.stopPropagation()">
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
            <div class="block-output-handle absolute bottom-0 left-0 right-0 h-1 cursor-se-resize"
                 title="Resize output"
                 @mousedown.stop.prevent="handleStartResizeOutput($event)" />
        </div>
    </div>
</template>

<style scoped>
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
