import { onBeforeUnmount, ref, watch } from 'vue';

export function useChartSize() {
    const containerRef = ref(null);
    const width = ref(0);
    const height = ref(0);

    let ro = null;

    watch(containerRef, el => {
        ro?.disconnect();
        if (!el) { return; }

        width.value = el.offsetWidth;
        height.value = el.offsetHeight;

        if (typeof ResizeObserver === 'undefined') { return; }

        ro = new ResizeObserver(() => {
            width.value = el.offsetWidth;
            height.value = el.offsetHeight;
        });
        ro.observe(el);
    }, { immediate: true });

    onBeforeUnmount(() => { ro?.disconnect(); });

    return { containerRef, height, width };
}
