<script setup>
import { ref, computed } from 'vue';
import { useBlockStore } from '@/entities/block';

defineOptions({
    inheritAttrs: false
});

const props = defineProps({
    block: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['menu-toggle']);

const { removeBlock, updateBlock } = useBlockStore();

const menuItems = computed(() => [
    {
        label: 'Delete',
        command: () => removeBlock(props.block.id)
    },
    {
        label: props.block.isStringConcat ? '✔ Make string' : 'Make string',
        command: () => updateBlock(props.block.id, { isStringConcat: !props.block.isStringConcat })
    },
    {
        label: 'Add filter'
    },
    {
        label: 'Visualizations'
    }
]);

const menu = ref(null);
const menuId = computed(() => `block-menu-${props.block.name}`);
const toggle = (event) => menu.value?.toggle(event);
</script>

<template>
    <p-button
        size="small"
        :aria-controls="menuId"
        @click="toggle"
        icon="pi pi-caret-down"
        class="p-button-text p-button-sm bg-black hover:bg-gray-700 text-white w-1 h-full -ml-1"
        v-bind="$attrs"
    />
    <p-menu ref="menu" :id="menuId" :model="menuItems" popup @show="emit('menu-toggle', true)" @hide="emit('menu-toggle', false)" />
</template>
