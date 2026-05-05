import { ref } from 'vue';

// Module-level singleton — one pending focus target at a time across the block list.
const pendingFocusBlockName = ref(null);

export function usePendingNameFocus() {
    function requestFocus(name) {
        pendingFocusBlockName.value = name;
    }

    function consumeFocus(name) {
        if (pendingFocusBlockName.value !== name) { return false; }
        pendingFocusBlockName.value = null;
        return true;
    }

    return { requestFocus, consumeFocus };
}
