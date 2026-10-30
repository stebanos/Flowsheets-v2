<script>
// Module-level so gesture ids stay unique across remounts — a reused id could coalesce
// a new gesture into an older undo entry.
let gestureCounter = 0;
</script>

<script setup>
import { computed } from 'vue';
import { useBlockStore } from '@/entities/block';
import { codeToValue, valueToCode } from '../paramCodec';
import { WIDGET_TYPES } from '../widget-types';

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
const bar = computed(() => WIDGET_TYPES[widget.value].bar);
const hasValue = computed(() => props.value !== undefined);
// Rendered from the evaluated value, never local state, so manual code edits show through
const displayValue = computed(() => codeToValue(widget.value, props.value, props.block.param));

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
            <component :is="bar.component"
                v-bind="bar.props(block.param, displayValue)"
                @update:model-value="write" />
            <span v-if="bar.showValue" class="font-mono text-[11px] text-gray-600 shrink-0">{{ displayValue }}</span>
        </div>
        <span v-if="!hasValue" class="text-[10px] text-gray-400 italic shrink-0">no value</span>
    </div>
</template>
