<script setup>
defineProps({
    open: { type: Boolean, default: false }
});
defineEmits(['toggle']);
</script>

<template>
    <button
        class="flex items-center justify-center w-8 h-7 rounded transition-colors ml-1"
        :class="open
            ? 'text-white bg-white/15'
            : 'text-gray-400 hover:text-white'"
        @click="$emit('toggle')"
    >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="12" height="12" rx="1"></rect>
            <line x1="11" y1="2" x2="11" y2="14"></line>
        </svg>
    </button>
</template>
