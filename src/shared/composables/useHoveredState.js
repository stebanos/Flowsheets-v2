import { ref } from 'vue';

const hovered = ref(null);

export function useHoveredState() {
    function setHovered(name) {
        hovered.value = name || null;
    }

    function clearHovered() {
        hovered.value = null;
    }

    return { hovered, setHovered, clearHovered };
}
