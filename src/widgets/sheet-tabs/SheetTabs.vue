<script setup>
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';

const { sheets, activeSheetId } = useSheetStore();
const { openSheetIds, switchSheet, closeSheet } = useSheetStorage();

function sheetName(id) {
    const sheet = sheets.find(s => s.id === id);
    return sheet ? sheet.name : id;
}
</script>

<template>
    <div class="flex items-end overflow-x-auto overflow-y-hidden shrink-0 h-8 bg-gray-100 border-t border-gray-300 [scrollbar-width:none]">
        <div
            v-for="id in openSheetIds"
            :key="id"
            class="group flex items-center gap-1.5 h-7 px-3 text-xs cursor-pointer select-none shrink-0 rounded-t-sm border border-b-0 -mb-px"
            :class="id === activeSheetId
                ? 'bg-white border-gray-300 text-slate-800 font-semibold'
                : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'"
            @click="switchSheet(id)"
        >
            <span class="max-w-32 truncate">{{ sheetName(id) }}</span>
            <button
                class="flex items-center justify-center w-4 h-4 rounded shrink-0 leading-none text-gray-400 transition-opacity hover:bg-red-100 hover:text-red-600"
                :class="id === activeSheetId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                :aria-label="`Close ${sheetName(id)}`"
                @click.stop="closeSheet(id)"
            >×</button>
        </div>
    </div>
</template>
