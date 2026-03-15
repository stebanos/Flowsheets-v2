import { generateUniqueId } from '@/shared/utils';
import { generateUniqueName, generateUniqueNameFromName, useBlockStore } from '@/entities/block';
import { useCellDimensions } from '@/shared/composables';

export function useBlockManager() {
    const { blocks, addBlock } = useBlockStore();
    const { cellWidth, unitY } = useCellDimensions();

    function createBlock({x, y}, name = null, code = '1 + 1') {
        const blockIds = blocks.map(block => block.id);
        const existingNames = blocks.map(block => block.name);

        addBlock({
            id: generateUniqueId(blockIds),
            name: name ? generateUniqueNameFromName(name, existingNames) : generateUniqueName(existingNames),
            x: Math.floor(x / cellWidth.value) * cellWidth.value,
            y: Math.floor(y / unitY.value) * unitY.value,
            width: cellWidth.value,
            height: 3 * unitY.value,
            code,
            inputModes: {}
        });
    }

    return {
        createBlock
    };
}
