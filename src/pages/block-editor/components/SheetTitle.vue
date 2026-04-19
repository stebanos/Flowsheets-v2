<script setup>
defineProps({
    sheetName: { type: String, default: '' },
    fileDirty: { type: Boolean, default: false },
    statusText: { type: String, default: '' },
    statusColor: { type: String, default: 'text-[#9ca3af]' }
});
</script>

<template>
    <span v-if="fileDirty" class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 flex-none" />
    <span data-sheet-name class="text-white/80 font-medium truncate shrink-0 max-w-48">{{ sheetName }}</span>
    <span class="text-[#9ca3af] shrink-0">·</span>
    <span class="text-ellipsis overflow-hidden whitespace-nowrap" :class="statusColor">{{ statusText }}</span>
</template>
