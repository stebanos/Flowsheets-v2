<script setup>
import { computed } from 'vue';
import { useCellDimensions } from '@/shared/composables';

const props = defineProps({
    panX: { type: Number, default: 0 },
    panY: { type: Number, default: 0 }
});

const { cellWidth, cellHeight } = useCellDimensions();

const bgPosition = computed(() => {
    const x = ((props.panX % cellWidth.value) + cellWidth.value) % cellWidth.value;
    const y = ((props.panY % cellHeight.value) + cellHeight.value) % cellHeight.value;
    return `${x}px ${y}px`;
});
</script>

<template>
    <div class="relative h-screen w-screen overflow-hidden grid-pattern bg-repeat" :style="{ backgroundPosition: bgPosition }"></div>
</template>

<style scoped>
.grid-pattern {
    background-image:
        linear-gradient(to right, #e6e6e6 1px, transparent 1px attr(data-cell-width px)),
        linear-gradient(to bottom, #e6e6e6 1px, transparent 1px attr(data-cell-height px));
    background-size: attr(data-cell-width px) attr(data-cell-height px);
}
</style>
