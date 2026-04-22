<script setup>
defineProps({
    open: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle']);
</script>

<template>
    <button
        class="flex items-center justify-center w-8 h-8 rounded transition-colors shrink-0"
        :class="open
            ? 'text-white bg-white/15'
            : 'text-gray-400 hover:text-white hover:bg-white/10'"
        aria-label="Toggle sheets sidebar"
        @click="emit('toggle')"
    >
        <slot></slot>
    </button>
</template>