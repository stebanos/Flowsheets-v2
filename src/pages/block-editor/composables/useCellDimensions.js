import { ref, computed } from 'vue';
import { computeUnitX, snapX as pureSnapX, snapY as pureSnapY } from '@/shared/layout/cellDimensions';

const cellWidth = ref(30);
const cellHeight = ref(30);

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
