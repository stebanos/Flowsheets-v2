<script setup>
defineEmits(['reset']);
</script>

<template>
    <button
        class="flex items-center justify-center w-8 h-7 rounded transition-colors ml-1 text-gray-400 hover:text-white"
        title="Reset canvas position"
        @click="$emit('reset')"
    >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="2" />
            <line x1="8" y1="1" x2="8" y2="5" />
            <line x1="8" y1="11" x2="8" y2="15" />
            <line x1="1" y1="8" x2="5" y2="8" />
            <line x1="11" y1="8" x2="15" y2="8" />
        </svg>
    </button>
</template>
