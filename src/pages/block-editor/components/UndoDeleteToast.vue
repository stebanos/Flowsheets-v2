<script setup>
defineProps({
    pending: { type: Object, default: null }
});
defineEmits(['undo', 'dismiss']);
</script>

<template>
    <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2">
        <div v-if="pending"
             class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl z-50 whitespace-nowrap">
            <span>
                Deleted "{{ pending.block.name }}"<span v-if="pending.hasDownstream"> (downstream blocks affected)</span> —
            </span>
            <button class="font-semibold underline cursor-pointer hover:text-gray-200 transition-colors"
                    @click="$emit('undo')">Undo</button>
            <button class="text-gray-400 hover:text-white cursor-pointer transition-colors leading-none"
                    @click="$emit('dismiss')">✕</button>
        </div>
    </transition>
</template>
