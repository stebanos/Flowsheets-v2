<script setup>
defineEmits(['create']);
</script>

<template>
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white">
        <h1 class="text-2xl font-semibold text-gray-700">Flowsheets</h1>
        <p class="text-sm text-gray-400">No sheets yet</p>
        <button
            class="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
            @click="$emit('create')"
        >Create a sheet</button>
    </div>
</template>
