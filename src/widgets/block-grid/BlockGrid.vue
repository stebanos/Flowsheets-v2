<script setup>
import { computed } from 'vue';
import { useCellDimensions } from '@/features/block/grid';

const props = defineProps({
    panX: { type: Number, default: 0 },
    panY: { type: Number, default: 0 }
});

const { cellWidth, cellHeight } = useCellDimensions();

const gridStyle = computed(() => {
    const w = cellWidth.value;
    const h = cellHeight.value;
    const x = ((props.panX % w) + w) % w;
    const y = ((props.panY % h) + h) % h;
    return {
        backgroundImage: [
            'linear-gradient(to right, #e6e6e6 1px, transparent 1px)',
            'linear-gradient(to bottom, #e6e6e6 1px, transparent 1px)'
        ].join(', '),
        backgroundSize: `${w}px ${h}px`,
        backgroundPosition: `${x}px ${y}px`
    };
});
</script>

<template>
    <div class="relative h-full w-full bg-repeat" :style="gridStyle"></div>
</template>
