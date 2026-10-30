<script setup>
defineProps({
    modelValue: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:modelValue']);

const modes = [
    { value: 'canvas', label: 'Canvas' },
    { value: 'list', label: 'List' }
];
</script>

<template>
    <div class="flex items-center gap-0.5 shrink-0" role="group" aria-label="View mode">
        <button v-for="mode in modes" :key="mode.value"
            class="h-8 px-2 rounded text-xs transition-colors"
            :class="modelValue === mode.value
                ? 'text-white bg-white/15'
                : 'text-gray-400 hover:text-white hover:bg-white/10'"
            :aria-pressed="modelValue === mode.value"
            @click="emit('update:modelValue', mode.value)">
            {{ mode.label }}
        </button>
    </div>
</template>
