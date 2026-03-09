import { generateUniqueId } from '@/shared/utils';
import { generateUniqueName, generateUniqueNameFromName } from '@/entities/block';
import { useBlocks } from './useBlocks';
import { useCellDimensions } from './useCellDimensions';

export function useBlockManager() {
    const { blocks } = useBlocks();
    const { cellWidth, unitY } = useCellDimensions();

    function createBlock({x, y}, name = null, code = '1 + 1') {
        const blockIds = blocks.map(block => block.id);
        const existingNames = blocks.map(block => block.name);

        blocks.push({
            id: generateUniqueId(blockIds),
            name: name ? generateUniqueNameFromName(name, existingNames) : generateUniqueName(existingNames),
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
