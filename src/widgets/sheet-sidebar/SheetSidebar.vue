<script setup>
import { ref, nextTick } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';
import { useSheetManager } from '@/features/sheet/manage/useSheetManager';

defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
});

defineEmits(['update:visible']);

const { sheets, activeSheetId } = useSheetStore();
const { switchSheet } = useSheetStorage();
const { createSheet, deleteSheet, renameSheet, renamingSheetId, clearRenamingId } = useSheetManager();

// Local editing state (double-click / pencil rename)
const editingId    = ref(null);
const editingValue = ref('');
const editInputEl  = ref(null);

function startEditing(id, currentName) {
    editingId.value    = id;
    editingValue.value = currentName;
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

// renamingSheetId path (triggered by createSheet)
const renamingValue = ref('');

function commitRenaming(id) {
    const val = renamingValue.value;
    clearRenamingId();
    if (val.trim()) { renameSheet(id, val.trim()); }
}

function cancelRenaming() {
    clearRenamingId();
}

function handleCreateSheet() {
    createSheet();
    renamingValue.value = '';
}

function handleDeleteSheet(id) {
    if (!window.confirm('Delete this sheet? This cannot be undone.')) { return; }
    deleteSheet(id);
}

function isEditing(id) { return editingId.value === id; }
function isRenaming(id) { return renamingSheetId.value === id; }
</script>

<template>
    <p-drawer
        :visible="visible"
        position="left"
        class="w-52 top-9.75"
        @update:visible="$emit('update:visible', $event)"
    >
        <template #container>
            <div class="flex flex-col h-full bg-gray-50 text-slate-800 overflow-hidden">

                <!-- Header -->
                <div class="flex items-center h-8 shrink-0 px-2.5 border-b border-gray-200 bg-gray-100">
                    <span class="text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">Sheets</span>
                </div>

                <!-- Sheet list -->
                <ul class="flex-1 overflow-y-auto py-1">
                    <li
                        v-for="sheet in sheets"
                        :key="sheet.id"
                        class="group flex items-center h-8 pl-[7px] pr-1.5 gap-1.5 cursor-pointer select-none border-l-[3px]"
                        :class="sheet.id === activeSheetId
                            ? 'bg-[#e8edf2] border-l-gray-700'
                            : 'bg-transparent border-l-transparent hover:bg-[#eef0f2]'"
                        @click="switchSheet(sheet.id)"
                        @dblclick.stop="startEditing(sheet.id, sheet.name)"
                    >
                        <!-- Inline rename for newly created sheet -->
                        <input
                            v-if="isRenaming(sheet.id)"
                            :data-renaming-input="sheet.id"
                            v-model="renamingValue"
                            class="flex-1 min-w-0 text-[13px] text-slate-800 bg-white border-none rounded-sm px-1 py-px ring-2 ring-blue-500 outline-none"
                            @keydown.enter.stop="commitRenaming(sheet.id)"
                            @keydown.esc.stop="cancelRenaming"
                            @blur="commitRenaming(sheet.id)"
                            @click.stop
                            @vue:mounted="el => el?.select()"
                        />

                        <!-- Inline rename for double-click -->
                        <input
                            v-else-if="isEditing(sheet.id)"
                            ref="editInputEl"
                            v-model="editingValue"
                            class="flex-1 min-w-0 text-[13px] text-slate-800 bg-white border-none rounded-sm px-1 py-px ring-2 ring-blue-500 outline-none"
                            @keydown.enter.stop="commitEditing(sheet.id)"
                            @keydown.esc.stop="cancelEditing"
                            @blur="commitEditing(sheet.id)"
                            @click.stop
                        />

                        <!-- Name -->
                        <span
                            v-else
                            class="flex-1 min-w-0 truncate text-[13px] text-slate-800"
                            :class="sheet.id === activeSheetId ? 'font-semibold' : ''"
                        >{{ sheet.name }}</span>

                        <!-- Action buttons (hidden until hover or active) -->
                        <div
                            v-if="!isRenaming(sheet.id) && !isEditing(sheet.id)"
                            class="flex items-center shrink-0 opacity-0 group-hover:opacity-100"
                            :class="sheet.id === activeSheetId ? 'opacity-100' : ''"
                        >
                            <!-- Rename -->
                            <button
                                class="flex items-center justify-center w-[22px] h-[22px] rounded text-gray-400 hover:bg-gray-300 hover:text-gray-700"
                                aria-label="Rename sheet"
                                @click.stop="startEditing(sheet.id, sheet.name)"
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z" />
                                </svg>
                            </button>
                            <!-- Delete -->
                            <button
                                class="flex items-center justify-center w-[22px] h-[22px] rounded text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                                :disabled="sheets.length <= 1"
                                aria-label="Delete sheet"
                                @click.stop="handleDeleteSheet(sheet.id)"
                            >×</button>
                        </div>
                    </li>
                </ul>

                <!-- New sheet button -->
                <button
                    class="flex items-center gap-1.5 h-8 shrink-0 px-2.5 text-xs text-gray-500 border-t border-gray-200 hover:bg-[#eef0f2] hover:text-gray-700 w-full text-left"
                    @click="handleCreateSheet"
                >
                    <span class="text-base leading-none">+</span> New sheet
                </button>

            </div>
        </template>
    </p-drawer>
</template>
