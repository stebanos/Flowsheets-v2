import { ref, readonly, nextTick } from 'vue';

const focusedBlockName = ref(null);
const registry = new Map();
const canvasEl = ref(null);
const wrapAnnouncerEl = ref(null);
const wrapIndicator = ref(false);

export function useFocusedBlock() {
    function register(name, focusWrapper, focusEditor) {
        registry.set(name, { focusWrapper, focusEditor });
    }

    function unregister(name) {
        registry.delete(name);
    }

    function registerCanvas(el, announcerEl) {
        canvasEl.value = el;
        wrapAnnouncerEl.value = announcerEl;
    }

    function announce(text) {
        if (!wrapAnnouncerEl.value) { return; }
        wrapAnnouncerEl.value.textContent = text;
        nextTick(() => {
            if (wrapAnnouncerEl.value) { wrapAnnouncerEl.value.textContent = ''; }
        });
    }

    function selectBlock(name) {
        focusedBlockName.value = name;
    }

    function focusBlockWrapper(name) {
        focusedBlockName.value = name;
        registry.get(name)?.focusWrapper();
    }

    function focusCanvas() {
        focusedBlockName.value = null;
        canvasEl.value?.focus();
    }

    return {
        focusedBlockName: readonly(focusedBlockName),
        wrapIndicator,
        register,
        unregister,
        registerCanvas,
        announce,
        selectBlock,
        focusBlockWrapper,
        focusCanvas
    };
}
