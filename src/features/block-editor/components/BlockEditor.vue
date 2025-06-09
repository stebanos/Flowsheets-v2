<script setup>
import { reactive } from 'vue';
import { useCellDimensions } from '../composables';
import BlockList from './BlockList.vue';
import Block from '@/features/block-editor/components/Block.vue';

const cellWidth = 150;
const cellHeight = 30;

const blocks = reactive([
    { id: 1, x: cellWidth * 1, y: cellHeight, width: cellWidth * 2, height: cellHeight },
    { id: 2, x: cellWidth * 3, y: cellHeight, width: cellWidth * 2, height: cellHeight },
]);

const { setCellDimensions } = useCellDimensions();
setCellDimensions(cellWidth, cellHeight);
</script>

<template>
    <block-list :blocks="blocks" class="grid">
        <template #default="{ block }">
            <block :block="block" />
        </template>
    </block-list>
</template>

<style scoped>
.grid {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-image:
        linear-gradient(to right, #e6e6e6 1px, transparent 1px 150px),
        linear-gradient(to bottom, #e6e6e6 1px, transparent 1px 30px);
    background-size: 150px 30px;
    background-repeat: repeat;
    background-position: 0 0;
    overflow: hidden;
}
</style>