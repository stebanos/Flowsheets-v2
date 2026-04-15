<template>
    <div class="h-full w-full relative overflow-hidden">
        <div v-if="!renderError && component"
             class="h-full w-full"
             :class="{ 'viz-flash': isFlashing }"
             @animationend="isFlashing = false">
            <component :is="component" :value="props.value" :error="props.error" :block="props.block" class="h-full w-full" />
        </div>
        <div v-if="renderError" class="p-2 text-red-600 text-xs font-mono">{{ renderError }}</div>
        <div v-else-if="!component && name" class="p-2 text-gray-400 text-xs italic">
            "{{ name }}" is not compiled yet. Open the sidebar and press Run.
        </div>
        <div v-else-if="!component" class="p-2 text-gray-400 text-xs italic">
            No custom visualization selected.
        </div>
        <div v-if="isStale && component && !renderError"
             class="absolute bottom-0 left-0 right-0 px-2 py-0.5 bg-white/80 text-center text-[11px] text-gray-400 italic">
            Changes not applied — press Run
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onErrorCaptured } from 'vue';
import { useCustomViz } from './useCustomViz';

const props = defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, required: true }
});

const { getComponent, customVizes, setErrorPanel } = useCustomViz();

const name = computed(() => props.block.vizOptions?.customVizName ?? null);
const component = computed(() => name.value ? getComponent(name.value) : null);

const isStale = computed(() => {
    if (!name.value || !customVizes[name.value]) { return false; }
    const entry = customVizes[name.value];
    if (entry.source === null) { return false; }
    return entry.draft.template !== entry.source.template
        || entry.draft.script !== entry.source.script
        || entry.draft.style !== entry.source.style;
});

const renderError = ref(null);
const isFlashing = ref(false);

onErrorCaptured((err) => {
    renderError.value = String(err?.message ?? err);
    if (name.value) { setErrorPanel(name.value, 'template'); }
    return false;
});

watch(component, (newComp, oldComp) => {
    if (newComp && newComp !== oldComp) {
        renderError.value = null;
        isFlashing.value = false;
        nextTick(() => { isFlashing.value = true; });
    }
});
</script>

<style scoped>
.viz-flash {
    animation: viz-fade-in 0.4s ease-out;
}
@keyframes viz-fade-in {
    from { opacity: 0.3; }
    to { opacity: 1; }
}
</style>
