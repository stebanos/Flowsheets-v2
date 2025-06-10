import { reactive } from 'vue';
import { useCellDimensions } from './useCellDimensions';

const blocks = reactive([]);

export function useBlockManager() {
    const { cellWidth, unitY } = useCellDimensions();

    function addBlock(event) {
        const gridRect = event.target.getBoundingClientRect();
        const x = Math.floor((event.clientX - gridRect.left) / cellWidth.value) * cellWidth.value;
        const y = Math.floor((event.clientY - gridRect.top) / unitY.value) * unitY.value;

        blocks.push({
            id: blocks.length + 1,
            x,
            y,
            width: cellWidth.value,
            height: 3 * unitY.value,
        });
    }

    return {
        blocks,
        addBlock
    };
}