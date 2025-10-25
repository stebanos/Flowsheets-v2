import { ref, nextTick } from 'vue';
import { useBlockManager } from '.';

export function useBlockName(name, nameInput) {

    const isEditing = ref(false);
    const editName = ref('');

    const { generateUniqueNameFromName } = useBlockManager();

    function startEdit() {
        editName.value = name.value;
        isEditing.value = true;
        nextTick(() => nameInput.value?.focus());
    }

    function saveName() {
        const trimmed = (editName.value ?? '').trim();
        if (trimmed.length) {
            name.value = generateUniqueNameFromName(trimmed);
        }
        isEditing.value = false;
        editName.value = '';
    }

    function cancelEdit() {
        isEditing.value = false;
        editName.value = '';
    }

    return {
        isEditing,
        editName,
        startEdit,
        saveName,
        cancelEdit
    };
}
