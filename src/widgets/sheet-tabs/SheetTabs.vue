<script setup>
import { ref, nextTick } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage, useSheetManager } from '@/features/sheet';

const { sheets, activeSheetId } = useSheetStore();
const { openSheetIds, switchSheet, closeSheet } = useSheetStorage();
const { renameSheet } = useSheetManager();

function sheetName(id) {
    const sheet = sheets.find(s => s.id === id);
    return sheet ? sheet.name : id;
}

const editingId = ref(null);
const editingValue = ref('');
const editInputEl = ref(null);

function startEditing(id) {
    editingId.value = id;
    editingValue.value = sheetName(id);
    nextTick(() => editInputEl.value?.select());
}

function commitEditing(id) {
    if (editingId.value !== id) { return; }
    const val = editingValue.value;
    editingId.value = null;
    if (val.trim()) { renameSheet(id, val.trim()); }
}

function cancelEditing() {
    editingId.value = null;
}
</script>

<template>
    <div class="flex items-end overflow-x-auto overflow-y-hidden shrink-0 h-8 bg-gray-100 border-t border-gray-300 [scrollbar-width:none]">
        <div
            v-for="id in openSheetIds"
            :key="id"
            data-sheet-tab
            class="group flex items-center gap-1.5 h-7 px-3 text-xs cursor-pointer select-none shrink-0 rounded-t-sm border border-b-0 -mb-px"
            :class="id === activeSheetId
                ? 'bg-white border-gray-300 text-slate-800 font-semibold'
                : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'"
            @click="switchSheet(id)"
            @dblclick.stop="startEditing(id)"
        >
            <input
                v-if="editingId === id"
                ref="editInputEl"
                v-model="editingValue"
                class="max-w-32 min-w-0 bg-transparent outline-none border-b border-current"
                @keydown.enter.stop="commitEditing(id)"
                @keydown.esc.stop="cancelEditing"
                @blur="commitEditing(id)"
                @click.stop
            />
            <span v-else class="max-w-32 truncate">{{ sheetName(id) }}</span>
            <button
                class="flex items-center justify-center w-4 h-4 rounded shrink-0 leading-none text-gray-400 transition-opacity hover:bg-red-100 hover:text-red-600"
                :class="id === activeSheetId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                :aria-label="`Close ${sheetName(id)}`"
                @click.stop="closeSheet(id)"
            >×</button>
        </div>
    </div>
</template>
