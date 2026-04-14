import { ref } from 'vue';

export function useHoveredState() {
    const hovered = ref(null);

    function setHovered(name) {
        hovered.value = name || null;
    }

    function clearHovered() {
        hovered.value = null;
    }

    return { hovered, setHovered, clearHovered };
}
