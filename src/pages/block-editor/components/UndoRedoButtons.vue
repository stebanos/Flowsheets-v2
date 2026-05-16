<script setup>
defineProps({
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false }
});

const emit = defineEmits(['undo', 'redo']);
</script>

<template>
    <button
        class="flex items-center justify-center w-8 h-8 rounded transition-colors"
        :class="canUndo
            ? 'text-gray-400 hover:text-white hover:bg-white/10'
            : 'text-gray-600 cursor-default'"
        :disabled="!canUndo"
        title="Undo (⌘Z)"
        @click="canUndo && emit('undo')"
    >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9L2 6l4-3" />
            <path d="M2 6h8a4 4 0 0 1 0 8" />
        </svg>
    </button>
    <button
        class="flex items-center justify-center w-8 h-8 rounded transition-colors"
        :class="canRedo
            ? 'text-gray-400 hover:text-white hover:bg-white/10'
            : 'text-gray-600 cursor-default'"
        :disabled="!canRedo"
        title="Redo (⌘⇧Z)"
        @click="canRedo && emit('redo')"
    >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 9l4-3-4-3" />
            <path d="M14 6H6a4 4 0 0 0 0 8" />
        </svg>
    </button>
</template>
