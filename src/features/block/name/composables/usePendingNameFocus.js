import { ref } from 'vue';

const pendingFocusBlockName = ref(null);

export function usePendingNameFocus() {
    return { pendingFocusBlockName };
}
