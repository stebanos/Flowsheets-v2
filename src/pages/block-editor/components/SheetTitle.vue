<script setup>
defineProps({
    sheetName: { type: String, default: '' },
    statusText: { type: String, default: '' },
    statusColor: { type: String, default: 'text-[#9ca3af]' }
});
</script>

<template>
    <span data-sheet-name class="text-white/80 font-medium truncate shrink-0 max-w-48">{{ sheetName }}</span>
    <span class="text-[#9ca3af] shrink-0">·</span>
    <span class="text-ellipsis overflow-hidden whitespace-nowrap" :class="statusColor">{{ statusText }}</span>
</template>
