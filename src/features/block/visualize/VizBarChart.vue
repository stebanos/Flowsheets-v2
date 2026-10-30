<script setup>
import { computed } from 'vue';
import { coerceNumberSeries, extent, niceTicks } from './chartHelpers';
import { useChartSize } from './useChartSize';
import { VIZ_PROPS } from './viz-props';

const props = defineProps(VIZ_PROPS);

const { containerRef, width, height } = useChartSize();

const series = computed(() => coerceNumberSeries(props.value));

const MARGIN_LEFT = 32;
const MARGIN_BOTTOM = 16;
const MARGIN_TOP = 4;
const MARGIN_RIGHT = 4;
const BAR_GAP_RATIO = 0.3;

const geometry = computed(() => {
    const empty = { bars: [], ticks: [], plotLeft: 0, plotRight: 0, plotTop: 0, plotBottom: 0 };
    if (!series.value || width.value <= 0 || height.value <= 0) { return empty; }

    const plotLeft = MARGIN_LEFT;
    const plotRight = width.value - MARGIN_RIGHT;
    const plotTop = MARGIN_TOP;
    const plotBottom = height.value - MARGIN_BOTTOM;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const values = series.value.map(item => item.value);
    const [min, max] = extent([...values, 0]);
    const ticks = niceTicks(min, max).map(tick => ({
        value: tick,
        y: plotBottom - ((tick - min) / (max - min)) * plotHeight
    }));

    const n = series.value.length;
    const slotWidth = plotWidth / n;
    const barWidth = slotWidth * (1 - BAR_GAP_RATIO);

    const bars = series.value.map((item, i) => {
        const barHeight = ((item.value - min) / (max - min)) * plotHeight;
        return {
            x: plotLeft + i * slotWidth + (slotWidth - barWidth) / 2,
            y: plotBottom - barHeight,
            width: barWidth,
            height: barHeight,
            labelX: plotLeft + i * slotWidth + slotWidth / 2,
            label: item.label,
            value: item.value
        };
    });

    return { bars, ticks, plotLeft, plotRight, plotTop, plotBottom };
});
</script>

<template>
    <div class="h-full overflow-hidden" @wheel.stop>
        <div v-if="error" class="px-2 py-1 text-red-600 text-[13px] font-mono">{{ error }}</div>
        <div v-else-if="!series" class="px-2 py-1 text-gray-400 text-[12px] font-mono italic">expects an array of numbers</div>
        <div v-else ref="containerRef" class="h-full w-full">
            <svg :width="width" :height="height">
                <g v-for="tick in geometry.ticks" :key="tick.value">
                    <line :x1="geometry.plotLeft" :x2="geometry.plotRight" :y1="tick.y" :y2="tick.y"
                        stroke="#e5e7eb" stroke-width="1" />
                    <text :x="geometry.plotLeft - 4" :y="tick.y" text-anchor="end" dominant-baseline="middle"
                        class="fill-gray-500" font-size="9">{{ tick.value }}</text>
                </g>
                <g v-for="(bar, i) in geometry.bars" :key="i">
                    <rect :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" fill="#60a5fa">
                        <title>{{ bar.label }}: {{ bar.value }}</title>
                    </rect>
                    <text :x="bar.labelX" :y="geometry.plotBottom + 12" text-anchor="middle"
                        class="fill-gray-500" font-size="9">{{ bar.label }}</text>
                </g>
            </svg>
        </div>
    </div>
</template>
