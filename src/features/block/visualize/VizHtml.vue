<script setup>
defineProps({
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] }
});
</script>

<template>
    <iframe
        v-if="typeof value === 'string' && value"
        :src="`data:text/html;charset=utf-8,${encodeURIComponent(value)}`"
        sandbox="allow-scripts"
        class="w-full h-full border-0"
    />
    <div v-else class="px-2 py-1 text-red-600 text-[12px]">
        HTML viz requires a string value.
    </div>
</template>
