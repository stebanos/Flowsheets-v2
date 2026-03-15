import { ref, nextTick } from 'vue';
import { generateUniqueNameFromName, useBlockStore } from '@/entities/block';
import { renameIdentifier } from '@/shared/lib/evaluator';

/**
 * @param {import('vue').WritableComputedRef<string>} name
 * @param {import('vue').Ref} nameInput
 * @param {import('@/entities/block').Block[]} blocks - reactive blocks array from the page
 * @param {Object} identifiersByBlock - reactive map of block name → identifier array
 */
export function useBlockName(name, nameInput, blocks, identifiersByBlock) {
    const { updateBlock } = useBlockStore();

    const isEditing = ref(false);
    const editName = ref('');

    function startEdit() {
        editName.value = name.value;
        isEditing.value = true;
        nextTick(() => nameInput.value?.$el.focus());
    }

    function renameReferences(oldName, newName) {
        try {
            for (const b of blocks) {
                const ids = identifiersByBlock[b.name] || [];
                if (ids.includes(oldName)) {
                    updateBlock(b.id, { code: renameIdentifier(b.code || '', oldName, newName) });
                }
            }
        } catch {
        }
    }

    function saveName() {
        const trimmed = (editName.value ?? '').trim();

        if (!trimmed || trimmed.length === 0 || trimmed === name.value) {
            return finishEdit();
        }

        const existingNames = blocks.map(b => b.name);
        const newName = generateUniqueNameFromName(trimmed, existingNames);
        const old = name.value;

        name.value = newName;
        renameReferences(old, newName);

        finishEdit();
    }

    function cancelEdit() {
        isEditing.value = false;
        editName.value = '';
    }

    function finishEdit() {
        cancelEdit();
    }

    return {
        isEditing,
        editName,
        startEdit,
        saveName,
        cancelEdit
    };
}
