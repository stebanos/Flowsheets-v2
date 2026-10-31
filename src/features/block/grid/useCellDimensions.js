import { computed, ref } from 'vue';
import { computeUnitX, DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, snapX as pureSnapX, snapY as pureSnapY } from '@/shared/layout/cellDimensions';

const cellWidth = ref(DEFAULT_CELL_WIDTH);
const cellHeight = ref(DEFAULT_CELL_HEIGHT);

const unitX = computed(() => computeUnitX(cellWidth.value));

const unitY = computed(() => cellHeight.value);

function setCellDimensions(width, height) {
    cellWidth.value = width;
    cellHeight.value = height;
}

function snapX(value) {
    return pureSnapX(value, unitX.value);
}

function snapY(value) {
    return pureSnapY(value, cellHeight.value);
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
