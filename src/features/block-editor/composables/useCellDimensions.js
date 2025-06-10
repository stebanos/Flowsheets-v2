import { ref, computed } from 'vue';

const cellWidth = ref(30);
const cellHeight = ref(30);

const unitX = computed(() => {
    const divisors = [4, 3, 2];
    const unit = cellWidth.value;

    for (const divisor of divisors) {
        if (unit % divisor === 0) {
            return unit / divisor;
        }
    }

    return unit;
});

const unitY = computed(() => {
    return cellHeight.value;
});

function setCellDimensions(width, height) {
    cellWidth.value = width;
    cellHeight.value = height;
}

function snapX(value) {
    return Math.round(value / unitX.value) * unitX.value;
}

function snapY(value) {
    return Math.round(value / cellHeight.value) * cellHeight.value;
}

export function useCellDimensions() {
    return {
        cellWidth,
        cellHeight,
        unitX,
        unitY,
        setCellDimensions,
        snapX,
        snapY
    };
}