import { reactive } from 'vue';
import { generateUniqueId } from '@/shared/utils';
import { useCellDimensions } from './useCellDimensions';
import { useBlockNameGenerators } from './useBlockName';

const blocks = reactive([]);

export function useBlockManager() {
    const { cellWidth, unitY } = useCellDimensions();
    const { generateUniqueName, generateUniqueNameFromName } = useBlockNameGenerators(blocks);

    function createBlock(event, name = null, code = '') {
        const blockIds = blocks.map(block => block.id);
        const gridRect = event.target.getBoundingClientRect();
        const x = Math.floor((event.clientX - gridRect.left) / cellWidth.value) * cellWidth.value;
        const y = Math.floor((event.clientY - gridRect.top) / unitY.value) * unitY.value;

        const block = {
            id: generateUniqueId(blockIds),
            x,
            y,
            width: cellWidth.value,
            height: 3 * unitY.value,
        };

        if (name) {
            block.name = generateUniqueNameFromName(name);
        } else {
            block.name = generateUniqueName();
        }

        blocks.push(block);
    }

    return {
        blocks,
        createBlock
    };
}
