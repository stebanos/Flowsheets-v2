<script setup>
import { computed } from 'vue';
import { coerceTimeSeries, extent, niceTicks } from './chartHelpers';
import { useChartSize } from './useChartSize';

const props = defineProps({
    value: {},
    error: { type: String, default: null }
});

const { containerRef, width, height } = useChartSize();

const series = computed(() => coerceTimeSeries(props.value));

const MARGIN_LEFT = 32;
const MARGIN_BOTTOM = 16;
const MARGIN_TOP = 4;
const MARGIN_RIGHT = 4;

function formatDate(time) {
    return new Date(time).toISOString().slice(0, 10);
}

const geometry = computed(() => {
    const empty = { points: '', dots: [], yTicks: [], xTicks: [], plotLeft: 0, plotRight: 0, plotTop: 0, plotBottom: 0 };
    if (!series.value || width.value <= 0 || height.value <= 0) { return empty; }

    const plotLeft = MARGIN_LEFT;
    const plotRight = width.value - MARGIN_RIGHT;
    const plotTop = MARGIN_TOP;
    const plotBottom = height.value - MARGIN_BOTTOM;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const values = series.value.map(point => point.value);
    const times = series.value.map(point => point.time);
    const [vMin, vMax] = extent(values);
    const [tMin, tMax] = extent(times);

    const n = series.value.length;
    const dots = series.value.map((point, i) => {
        const x = n === 1 ? plotLeft + plotWidth / 2 : plotLeft + ((point.time - tMin) / (tMax - tMin)) * plotWidth;
        const y = plotBottom - ((point.value - vMin) / (vMax - vMin)) * plotHeight;
        return { x, y, time: point.time, value: point.value };
    });

    const yTicks = niceTicks(vMin, vMax).map(tick => ({
        value: tick,
        y: plotBottom - ((tick - vMin) / (vMax - vMin)) * plotHeight
    }));

    const midIndex = Math.floor((n - 1) / 2);
    const xTickIndices = n === 1 ? [0] : [0, midIndex, n - 1];
    const xTicks = [...new Set(xTickIndices)].map(i => ({
        label: formatDate(series.value[i].time),
        x: dots[i].x
    }));

    return {
        points: dots.map(d => `${d.x},${d.y}`).join(' '),
        dots,
        yTicks,
        xTicks,
        plotLeft,
        plotRight,
        plotTop,
        plotBottom
    };
});
</script>

<template>
    <div class="h-full overflow-hidden" @wheel.stop>
        <div v-if="error" class="px-2 py-1 text-red-600 text-[13px] font-mono">{{ error }}</div>
        <div v-else-if="!series" class="px-2 py-1 text-gray-400 text-[12px] font-mono italic">expects [date, value] pairs</div>
        <div v-else ref="containerRef" class="h-full w-full">
            <svg :width="width" :height="height">
                <g v-for="tick in geometry.yTicks" :key="tick.value">
                    <line :x1="geometry.plotLeft" :x2="geometry.plotRight" :y1="tick.y" :y2="tick.y"
                        stroke="#e5e7eb" stroke-width="1" />
                    <text :x="geometry.plotLeft - 4" :y="tick.y" text-anchor="end" dominant-baseline="middle"
                        class="fill-gray-500" font-size="9">{{ tick.value }}</text>
                </g>
                <polyline :points="geometry.points" fill="none" stroke="#60a5fa" stroke-width="1.5" />
                <circle v-for="(dot, i) in geometry.dots" :key="i" :cx="dot.x" :cy="dot.y" r="2" fill="#2563eb">
                    <title>{{ new Date(dot.time).toISOString() }}: {{ dot.value }}</title>
                </circle>
                <text v-for="(tick, i) in geometry.xTicks" :key="i" :x="tick.x" :y="geometry.plotBottom + 12"
                    text-anchor="middle" class="fill-gray-500" font-size="9">{{ tick.label }}</text>
            </svg>
        </div>
    </div>
</template>
