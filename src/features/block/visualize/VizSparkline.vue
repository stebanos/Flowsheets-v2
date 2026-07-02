<script setup>
import { computed } from 'vue';
import { coerceNumbers, extent } from './chartHelpers';
import { useChartSize } from './useChartSize';

const props = defineProps({
    value: {},
    error: { type: String, default: null }
});

const { containerRef, width, height } = useChartSize();

const numbers = computed(() => coerceNumbers(props.value));

const PADDING = 3;

const geometry = computed(() => {
    const empty = { points: '', dot: null };
    if (!numbers.value || width.value <= 0 || height.value <= 0) { return empty; }

    const [min, max] = extent(numbers.value);
    const n = numbers.value.length;
    const plotWidth = width.value - PADDING * 2;
    const plotHeight = height.value - PADDING * 2;

    const coords = numbers.value.map((v, i) => {
        const x = n === 1 ? PADDING + plotWidth / 2 : PADDING + (i / (n - 1)) * plotWidth;
        const y = PADDING + plotHeight - ((v - min) / (max - min)) * plotHeight;
        return { x, y };
    });

    const last = coords[coords.length - 1];

    return {
        points: coords.map(c => `${c.x},${c.y}`).join(' '),
        dot: last
    };
});

const lastValue = computed(() => {
    if (!numbers.value) { return ''; }
    return String(numbers.value[numbers.value.length - 1]);
});
</script>

<template>
    <div class="h-full overflow-hidden" @wheel.stop>
        <div v-if="error" class="px-2 py-1 text-red-600 text-[13px] font-mono">{{ error }}</div>
        <div v-else-if="!numbers" class="px-2 py-1 text-gray-400 text-[12px] font-mono italic">expects numbers</div>
        <div v-else ref="containerRef" class="h-full w-full relative">
            <svg :width="width" :height="height">
                <polyline :points="geometry.points" fill="none" stroke="#60a5fa" stroke-width="1.5" />
                <circle v-if="geometry.dot" :cx="geometry.dot.x" :cy="geometry.dot.y" r="2" fill="#2563eb" />
            </svg>
            <span class="absolute top-0.5 right-1 text-[10px] font-mono text-gray-500">{{ lastValue }}</span>
        </div>
    </div>
</template>
