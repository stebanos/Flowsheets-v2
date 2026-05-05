import { useFocusedBlock } from './useFocusedBlock';

export function useBlockNavigation(blocks) {
    const { setWrapIndicator, announce, focusBlockWrapper } = useFocusedBlock();

    function getSorted() {
        return [...blocks].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    }

    function focusNext(fromName) {
        const sorted = getSorted();
        if (sorted.length === 0) { return; }
        const idx = sorted.findIndex(b => b.name === fromName);
        const nextIdx = idx === -1 ? 0 : (idx + 1) % sorted.length;
        if (idx === sorted.length - 1) {
            setWrapIndicator(true);
            announce('Wrapped to first block');
        }
        focusBlockWrapper(sorted[nextIdx].name);
    }

    function focusPrev(fromName) {
        const sorted = getSorted();
        if (sorted.length === 0) { return; }
        const idx = sorted.findIndex(b => b.name === fromName);
        const prevIdx = idx === -1 ? sorted.length - 1 : (idx - 1 + sorted.length) % sorted.length;
        if (idx === 0) {
            setWrapIndicator(true);
            announce('Wrapped to last block');
        }
        focusBlockWrapper(sorted[prevIdx].name);
    }

    function focusFirst() {
        const sorted = getSorted();
        if (sorted.length > 0) {
            focusBlockWrapper(sorted[0].name);
        }
    }

    return { focusNext, focusPrev, focusFirst };
}
