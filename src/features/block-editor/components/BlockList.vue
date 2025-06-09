<script setup>
import { defineProps } from 'vue';

defineProps({
    blocks: {
        type: Array,
        default: () => []
    }
});
</script>

<template>
    <div>
        <template v-for="block in blocks" :key="block.id">
            <slot :block="block" />
        </template>
    </div>
</template>