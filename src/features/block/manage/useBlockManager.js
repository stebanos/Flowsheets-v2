import { generateUniqueId } from '@/shared/utils';
import { generateUniqueName, generateUniqueNameFromName, useBlockStore } from '@/entities/block';
import { useCellDimensions } from '@/shared/composables';

export function useBlockManager() {
    const { blocks, addBlock } = useBlockStore();
    const { cellWidth, unitY } = useCellDimensions();

    function createBlock({x, y}, name = null, code = '1 + 1') {
        const blockIds = blocks.map(block => block.id);
        const existingNames = blocks.map(block => block.name);
        const resolvedName = name ? generateUniqueNameFromName(name, existingNames) : generateUniqueName(existingNames);

        addBlock({
            id: generateUniqueId(blockIds),
            name: resolvedName,
            x: Math.floor(x / cellWidth.value) * cellWidth.value,
            y: Math.floor(y / unitY.value) * unitY.value,
            width: cellWidth.value,
            height: 3 * unitY.value,
            code,
            inputModes: {},
            visualizationType: 'default',
            vizOptions: {},
            isStringConcat: false,
            userMinWidth: null,
            userMinEditorHeight: null,
            filterClause: null,
            sortClause: null
        });

        return resolvedName;
    }

    return {
        createBlock
    };
}
