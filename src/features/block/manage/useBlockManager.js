import { generateUniqueId } from '@/shared/utils';
import { generateUniqueName, generateUniqueNameFromName, useBlockStore } from '@/entities/block';

export function useBlockManager() {
    const { blocks, addBlock } = useBlockStore();

    function createBlock({x, y}, name = null, code = '1 + 1', cellWidth, unitY) {
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
            userMinWidth: null,
            userMinEditorHeight: null
        });

        return resolvedName;
    }

    return {
        createBlock
    };
}
