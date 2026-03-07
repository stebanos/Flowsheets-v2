import { generateUniqueId } from '@/shared/utils';
import { useBlocks, useBlockNameGenerators, useCellDimensions } from '.';

export function useBlockManager() {
    const { blocks } = useBlocks();
    const { cellWidth, unitY } = useCellDimensions();
    const { generateUniqueName, generateUniqueNameFromName } = useBlockNameGenerators();

    function createBlock({x, y}, name = null, code = '1 + 1') {
        const blockIds = blocks.map(block => block.id);

        blocks.push({
            id: generateUniqueId(blockIds),
            name: name ? generateUniqueNameFromName(name) : generateUniqueName(),
            x: Math.floor(x / cellWidth.value) * cellWidth.value,
            y: Math.floor(y / unitY.value) * unitY.value,
            width: cellWidth.value,
            height: 3 * unitY.value,
            code
        });
    }

    return {
        createBlock
    };
}
