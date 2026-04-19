<script setup>
defineEmits(['save']);
</script>

<template>
    <button
        class="text-gray-400 hover:text-white hover:bg-white/10 text-xs px-2 py-1 rounded transition-colors"
        @click="$emit('save')"
    >Save file</button>
</template>
