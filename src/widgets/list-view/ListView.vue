<script setup>
import { ref } from 'vue';
import { useListOrder } from '@/features/block/list-view';
import ListCell from './ListCell.vue';
import { useListReorder } from './useListReorder';

defineProps({
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

const { includedBlocks, moveTo } = useListOrder();

const columnEl = ref(null);

function getCellElements() {
    return [...(columnEl.value?.querySelectorAll('[data-list-cell]') ?? [])];
}

const { dragging, dropIndex, startDrag } = useListReorder(includedBlocks, getCellElements, moveTo);
</script>

<template>
    <div class="list-view bg-gray-100 overflow-y-auto h-full">
        <div v-if="includedBlocks.length === 0" class="list-view-empty h-full flex flex-col items-center justify-center text-center text-gray-500 px-4">
            <h2 class="text-base font-medium text-gray-600">No blocks included yet</h2>
            <p class="mt-1 text-sm">Use the ⊞ button in a block's header on the canvas to include it here.</p>
        </div>
        <div v-else ref="columnEl"
             class="list-view-column max-w-3xl mx-auto px-6 py-8 flex flex-col gap-4"
             :class="{ 'select-none': dragging }">
            <div v-for="(block, i) in includedBlocks" :key="block.id"
                 data-list-cell
                 class="relative transition-opacity"
                 :class="{ 'opacity-50': dragging === block.id }">
                <div v-if="dropIndex === i" class="list-drop-indicator absolute -top-[9px] left-0 right-0 h-0.5 bg-black pointer-events-none" />
                <list-cell :block :context :blocks :setHovered :clearHovered
                    @drag-start="startDrag(block.id, $event)" />
                <div v-if="dropIndex === includedBlocks.length && i === includedBlocks.length - 1"
                     class="list-drop-indicator absolute -bottom-[9px] left-0 right-0 h-0.5 bg-black pointer-events-none" />
            </div>
        </div>
    </div>
</template>
