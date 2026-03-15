<script setup>
import { ref, computed } from 'vue';
import { useBlockStore } from '@/entities/block';
import { VIZ_TYPES } from '@/features/block/visualize';

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

const vizType = computed(() => props.block.visualizationType ?? 'default');

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
        label: 'Visualizations',
        items: Object.entries(VIZ_TYPES).map(([key, { label }]) => ({
            label: vizType.value === key ? `✔ ${label}` : label,
            command: () => updateBlock(props.block.id, { visualizationType: key })
        }))
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
    <p-tiered-menu ref="menu" :id="menuId" :model="menuItems" popup @show="emit('menu-toggle', true)" @hide="emit('menu-toggle', false)" />
</template>
