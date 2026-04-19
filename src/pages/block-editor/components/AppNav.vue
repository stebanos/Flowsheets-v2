<script setup>
defineProps({
    open: { type: Boolean, default: false }
});
defineEmits(['toggle']);
</script>

<template>
    <span class="text-gray-500 font-bold text-sm select-none mr-0.5" aria-hidden="true">FL</span>
    <button
        class="flex items-center justify-center w-7 h-7 rounded transition-colors shrink-0"
        :class="open
            ? 'text-white bg-white/15'
            : 'text-gray-400 hover:text-white hover:bg-white/10'"
        aria-label="Toggle sheets sidebar"
        @click="$emit('toggle')"
    >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="2" width="14" height="12" rx="1.5" />
            <line x1="5" y1="2" x2="5" y2="14" />
            <line x1="7.5" y1="5.5" x2="13" y2="5.5" />
            <line x1="7.5" y1="8" x2="13" y2="8" />
            <line x1="7.5" y1="10.5" x2="11" y2="10.5" />
        </svg>
    </button>
</template>
