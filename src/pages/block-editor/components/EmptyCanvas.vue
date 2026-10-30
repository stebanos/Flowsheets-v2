<script setup>
defineProps({
    unreadable: {
        type: Boolean,
        default: false
    }
});
defineEmits(['create', 'reload']);
</script>

<template>
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white">
        <h1 class="text-2xl font-semibold text-gray-700">Flowsheets</h1>
        <template v-if="unreadable">
            <p class="text-sm text-red-400">Your sheets could not be loaded. Nothing has been overwritten.</p>
            <button
                class="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
                @click="$emit('reload')"
            >Reload to try again</button>
        </template>
        <template v-else>
            <p class="text-sm text-gray-400">No sheets yet</p>
            <button
                class="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
                @click="$emit('create')"
            >Create a sheet</button>
        </template>
    </div>
</template>
