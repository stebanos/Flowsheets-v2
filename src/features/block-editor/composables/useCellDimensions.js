import { ref } from 'vue';

const cellWidth = ref(30);
const cellHeight = ref(30);

export function useCellDimensions() {
    function setCellDimensions(width, height) {
        cellWidth.value = width;
        cellHeight.value = height;
    }

    return {
        cellWidth,
        cellHeight,
        setCellDimensions,
    };
}