<script setup>
import { computed, ref } from 'vue';
import { formatValue } from '@/shared/lib/format-value';
import { useBlockStore } from '@/entities/block';
import { CodeEditor } from '@/features/block/edit-code';
import { ParamWidgetBar } from '@/features/block/parameter';
import { useVizMenu } from '@/features/block/visualize';

const DEFAULT_OUTPUT_HEIGHT = 72;
const DEFAULT_VIZ_MAX_HEIGHT = 480;
const PARAM_BAR_HEIGHT = 24;

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    context: {
        type: Object,
        required: true
    },
    blocks: {
        type: Array,
        required: true
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

const emit = defineEmits(['drag-start']);

const { updateBlock } = useBlockStore();
const { activeVizComponent } = useVizMenu(props.block, () => {});

const cellEl = ref(null);
const codeExpanded = ref(false);

const blockEval = computed(() => props.context.getEvaluation(props.block.name));
const status = computed(() => props.context.getStatus(props.block.name));
// undefined = no usable value (error or missing) — the widget bar shows its "no value" state
const paramValue = computed(() => blockEval.value?.error ? undefined : blockEval.value?.value);

const outputValue = computed(() => blockEval.value?.value);
const isList = computed(() => Array.isArray(outputValue.value));
const outputItems = computed(() => isList.value ? outputValue.value.map(formatValue) : []);

const isDefaultViz = computed(() => (props.block.visualizationType ?? 'default') === 'default');
// Charts and custom vizes fill their container, so they need a definite height; default text grows (capped)
const outputStyle = computed(() => isDefaultViz.value
    ? { overflowY: 'auto', maxHeight: `${DEFAULT_VIZ_MAX_HEIGHT}px` }
    : { overflowY: 'hidden', height: `${props.block.outputHeight ?? DEFAULT_OUTPUT_HEIGHT}px` }
);

function onUpdateCode(code) {
    updateBlock(props.block.id, { code }, `code:${props.block.id}`);
}

// Escape leaves the editor so page-level shortcuts (undo/redo) apply again; next/prev stay inert in v1
function onNavigate(dir) {
    if (dir === 'escape') { cellEl.value?.focus(); }
}
</script>

<template>
    <div ref="cellEl" tabindex="-1" class="list-cell bg-white border border-gray-300 rounded shadow-sm overflow-hidden text-[.875rem] leading-4 outline-none">
        <div class="list-cell-header flex items-center h-7 px-2 bg-black text-white cursor-move select-none"
             @mousedown="emit('drag-start', $event)">
            <span class="list-cell-name flex-1 min-w-0 truncate font-mono text-[13px]">{{ block.name }}</span>
            <button class="list-cell-code-toggle h-full px-1 flex items-center opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                :title="codeExpanded ? 'Hide code' : 'Show code'"
                :aria-expanded="codeExpanded"
                @mousedown.stop
                @click.stop="codeExpanded = !codeExpanded">
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"
                     class="transition-transform" :class="{ 'rotate-180': codeExpanded }">
                    <polyline points="3,5 7,9 11,5" />
                </svg>
            </button>
        </div>
        <param-widget-bar v-if="block.param"
            :block="block"
            :value="paramValue"
            :style="{ height: PARAM_BAR_HEIGHT + 'px' }" />
        <div v-if="codeExpanded" class="list-cell-code min-h-24 border-b border-gray-200">
            <code-editor class="w-full" :code="block.code" :blocks :setHovered :clearHovered
                :inputModes="block.inputModes || {}"
                :blockName="block.name"
                :onNavigate="onNavigate"
                @update:code="onUpdateCode($event)" />
        </div>
        <div class="list-cell-output relative" :style="outputStyle">
            <div v-if="status === 'blocked'"
                 class="h-6 w-full flex items-center bg-amber-50 text-amber-700 font-mono text-[.8125rem] px-2">
                blocked — upstream error
            </div>
            <component
                v-else
                :is="activeVizComponent"
                :value="outputValue"
                :error="blockEval?.error ?? null"
                :block="block"
                :is-list="isList"
                :output-items="outputItems"
                :get-evaluation="context.getEvaluation"
                class="h-full w-full" />
        </div>
    </div>
</template>
