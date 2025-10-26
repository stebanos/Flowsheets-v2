import { generateUniqueId } from '@/shared/utils';
import { useBlocks, useBlockNameGenerators, useCellDimensions } from '.';

export function useBlockManager() {
    const { blocks } = useBlocks();
    const { cellWidth, unitY } = useCellDimensions();
    const { generateUniqueName, generateUniqueNameFromName } = useBlockNameGenerators();

    function createBlock(event, name = null, code = '') {
        const blockIds = blocks.map(block => block.id);
        const gridRect = event.target.getBoundingClientRect();
        const x = Math.floor((event.clientX - gridRect.left) / cellWidth.value) * cellWidth.value;
        const y = Math.floor((event.clientY - gridRect.top) / unitY.value) * unitY.value;

        blocks.push({
            id: generateUniqueId(blockIds),
            name: name ? generateUniqueNameFromName(name) : generateUniqueName(),
            x,
            y,
            width: cellWidth.value,
            height: 3 * unitY.value,
            code: '1 + 1'
        });
    }

    return {
        createBlock
    };
}
