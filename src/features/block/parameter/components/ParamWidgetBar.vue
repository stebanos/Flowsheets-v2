<script>
// Module-level so gesture ids stay unique across remounts — a reused id could coalesce
// a new gesture into an older undo entry.
let gestureCounter = 0;
</script>

<script setup>
import { computed } from 'vue';
import { useBlockStore } from '@/entities/block';
import { codeToValue, SLIDER_DEFAULTS, valueToCode } from '../paramCodec';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    value: {
        required: false
    }
});

const { updateBlock } = useBlockStore();

let gestureId = null;

const widget = computed(() => props.block.param.widget);
const hasValue = computed(() => props.value !== undefined);
// Rendered from the evaluated value, never local state, so manual code edits show through
const displayValue = computed(() => codeToValue(widget.value, props.value, props.block.param));
const sliderMin = computed(() => props.block.param.min ?? SLIDER_DEFAULTS.min);
const sliderMax = computed(() => props.block.param.max ?? SLIDER_DEFAULTS.max);
const sliderStep = computed(() => props.block.param.step ?? SLIDER_DEFAULTS.step);
const colorModel = computed(() => displayValue.value.slice(1));

// A gesture is one pointer-down or one focus session; writes within it share an undo entry
function startGesture() {
    gestureCounter += 1;
    gestureId = gestureCounter;
}

function write(value) {
    const code = valueToCode(widget.value, value);
    if (code === props.block.code) { return; }
    if (gestureId === null) { startGesture(); }
    updateBlock(props.block.id, { code }, `param:${props.block.id}:${gestureId}`);
}
</script>

<template>
    <div class="param-widget-bar w-full flex items-center gap-2 px-2 border-b border-gray-200 bg-gray-50 shrink-0"
         :class="{ 'param-no-value': !hasValue }"
         @pointerdown.capture="startGesture"
         @focusin="startGesture">
        <div class="flex-1 min-w-0 flex items-center gap-2" :class="{ 'opacity-50': !hasValue }">
            <template v-if="widget === 'slider'">
                <p-slider class="flex-1 min-w-0"
                    :model-value="displayValue"
                    :min="sliderMin"
                    :max="sliderMax"
                    :step="sliderStep"
                    @update:model-value="write" />
                <span class="font-mono text-[11px] text-gray-600 shrink-0">{{ displayValue }}</span>
            </template>
            <p-toggle-switch v-else-if="widget === 'toggle'"
                class="scale-75 origin-left"
                :model-value="displayValue"
                @update:model-value="write" />
            <p-input-text v-else-if="widget === 'text'"
                class="flex-1 min-w-0 h-5 py-0! px-1! text-[12px]!"
                :model-value="displayValue"
                @update:model-value="write" />
            <p-color-picker v-else-if="widget === 'color'"
                append-to="self"
                :model-value="colorModel"
                @update:model-value="write" />
            <p-select v-else-if="widget === 'options'"
                class="flex-1 min-w-0 h-5 text-[12px]"
                append-to="self"
                placeholder="Select…"
                :options="block.param.options ?? []"
                :model-value="displayValue"
                @update:model-value="write" />
        </div>
        <span v-if="!hasValue" class="text-[10px] text-gray-400 italic shrink-0">no value</span>
    </div>
</template>
