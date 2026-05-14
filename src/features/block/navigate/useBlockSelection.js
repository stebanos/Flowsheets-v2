import { readonly, ref } from 'vue';

const selectedNames = ref(new Set());

export function useBlockSelection() {
    function selectOne(name) {
        selectedNames.value = new Set([name]);
    }

    function toggleSelect(name) {
        const next = new Set(selectedNames.value);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        selectedNames.value = next;
    }

    function selectAll(blocks) {
        selectedNames.value = new Set(blocks.map(b => b.name));
    }

    function setSelection(names) {
        selectedNames.value = new Set(names);
    }

    function clearSelection() {
        selectedNames.value = new Set();
    }

    function isSelected(name) {
        return selectedNames.value.has(name);
    }

    return {
        selectedNames: readonly(selectedNames),
        selectOne,
        toggleSelect,
        selectAll,
        setSelection,
        clearSelection,
        isSelected
    };
}
