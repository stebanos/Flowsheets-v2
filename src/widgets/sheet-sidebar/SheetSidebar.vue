<script setup>
import { ref, nextTick, computed } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useSheetStorage } from '@/features/sheet/storage';
import { useSheetManager } from '@/features/sheet/manage/useSheetManager';
import { useFileIO } from '@/features/sheet/file-io';

const props = defineProps({
    open: {
        type: Boolean,
        required: true,
    },
});

const { sheets, activeSheetId } = useSheetStore();
const { switchSheet } = useSheetStorage();
const { createSheet, deleteSheet, renameSheet, renamingSheetId, clearRenamingId } = useSheetManager();
const { prepareImport, confirmImport, cancelImport, pendingImport, prepareBundleImport, bundleImportState, confirmBundleImport, cancelBundleImport, saveSheetAs, exportBundle } = useFileIO();

const panelPt = computed(() => ({
    root: {
        class: [
            'flex flex-col shrink-0 overflow-hidden transition-[width] duration-200',
            'border-r border-gray-200 bg-gray-50 text-slate-800',
            props.open ? 'w-52' : 'w-0',
        ],
    },
    header: { class: 'flex items-center h-8 shrink-0 px-2.5 border-b border-gray-200 bg-gray-100' },
    content: { class: 'flex-1 overflow-y-auto p-0' },
    footer: { class: 'shrink-0' },
}));

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

// File import/export
const fileInputEl = ref(null);
const importError = ref(null);

function openFilePicker() {
    fileInputEl.value?.click();
}

async function onFileInputChange(e) {
    const file = e.target.files[0];
    if (!file) { return; }
    e.target.value = '';
    importError.value = null;
    if (file.name.endsWith('.flowbundle.json')) {
        const result = await prepareBundleImport(file);
        if (result.error) { importError.value = result.error; }
        return;
    }
    const result = await prepareImport(file);
    if (result.error) { importError.value = result.error; }
}

function handleConfirmImport() {
    importError.value = null;
    confirmImport();
}

function handleCancelImport() {
    importError.value = null;
    cancelImport();
}

function handleCancelBundleImport() {
    importError.value = null;
    cancelBundleImport();
}
</script>

<template>
    <p-panel unstyled :pt="panelPt">
        <template #header>
            <span class="text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">Sheets</span>
        </template>

        <ul class="py-1">
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

        <template #footer>
            <button
                class="flex items-center gap-1.5 h-8 w-full px-2.5 text-xs text-gray-500 border-t border-gray-200 hover:bg-[#eef0f2] hover:text-gray-700 text-left"
                @click="handleCreateSheet"
            >
                <span class="text-base leading-none">+</span> New sheet
            </button>
            <div class="border-t border-gray-200">
                <button
                    class="flex items-center gap-1.5 h-7 w-full px-2.5 text-[11px] text-gray-400 hover:bg-[#eef0f2] hover:text-gray-600 text-left"
                    @click="openFilePicker"
                >Import sheet...</button>
                <button
                    class="flex items-center gap-1.5 h-7 w-full px-2.5 text-[11px] text-gray-400 hover:bg-[#eef0f2] hover:text-gray-600 text-left"
                    @click="saveSheetAs"
                >Export sheet</button>
                <button
                    class="flex items-center gap-1.5 h-7 w-full px-2.5 text-[11px] text-gray-400 hover:bg-[#eef0f2] hover:text-gray-600 text-left"
                    @click="exportBundle"
                >Export all sheets</button>
            </div>
        </template>
    </p-panel>

    <!-- Hidden file input -->
    <input
        ref="fileInputEl"
        type="file"
        accept=".flowsheet.json,.flowbundle.json"
        class="hidden"
        @change="onFileInputChange"
    />

    <!-- Import sheet confirmation dialog -->
    <p-dialog
        v-if="pendingImport || importError"
        :visible="true"
        modal
        :closable="false"
        header="Import sheet"
        class="w-[28rem]"
    >
        <div v-if="importError" class="text-sm text-red-400 mb-4">
            {{ importError }}
        </div>
        <div v-else-if="pendingImport" class="text-sm text-[#d1d5db] space-y-3">
            <p>
                <span class="text-white font-medium">{{ pendingImport.summary.name }}</span>
                — {{ pendingImport.summary.blockCount }} block<span v-if="pendingImport.summary.blockCount !== 1">s</span>,
                {{ pendingImport.summary.vizCount }} viz<span v-if="pendingImport.summary.vizCount !== 1">es</span>
            </p>
            <div v-if="Object.keys(pendingImport.summary.renamedVizes).length > 0">
                <p class="text-[#9ca3af] mb-1">Visualizations renamed to avoid conflicts:</p>
                <ul class="space-y-0.5">
                    <li
                        v-for="(newName, oldName) in pendingImport.summary.renamedVizes"
                        :key="oldName"
                        class="font-mono text-xs"
                    >
                        {{ oldName }} → {{ newName }}
                    </li>
                </ul>
            </div>
            <p class="text-[#9ca3af] text-xs">This will replace the current sheet.</p>
        </div>
        <template #footer>
            <p-button label="Cancel" severity="secondary" text @click="handleCancelImport" />
            <p-button v-if="!importError" label="Import" @click="handleConfirmImport" />
            <p-button v-else label="Close" @click="handleCancelImport" />
        </template>
    </p-dialog>

    <!-- Bundle import confirmation dialog -->
    <p-dialog
        v-if="bundleImportState.pending || (importError && !pendingImport)"
        :visible="true"
        modal
        :closable="false"
        header="Import bundle"
        class="w-[32rem]"
    >
        <div v-if="importError" class="text-sm text-red-400 mb-4">
            {{ importError }}
        </div>
        <div v-else class="text-sm text-[#d1d5db] space-y-3">
            <p class="text-[#9ca3af] text-xs">Choose which sheets to import. Sheets already present are skipped by default.</p>
            <ul class="space-y-1">
                <li
                    v-for="entry in bundleImportState.entries"
                    :key="entry.id"
                    class="flex items-center justify-between gap-2 py-0.5"
                >
                    <span class="truncate">{{ entry.name }}</span>
                    <div class="flex items-center gap-1 shrink-0">
                        <button
                            class="text-[11px] px-2 py-0.5 rounded transition-colors"
                            :class="entry.action === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'"
                            @click="entry.action = entry.action === 'import' ? 'skip' : 'import'"
                        >Import</button>
                        <button
                            v-if="entry.action !== 'import'"
                            class="text-[11px] px-2 py-0.5 rounded transition-colors bg-gray-700 text-gray-400 hover:text-white"
                            @click="entry.action = 'copy'"
                        >Copy</button>
                        <span v-if="entry.action === 'skip'" class="text-[11px] text-gray-500">Skip</span>
                        <span v-else-if="entry.action === 'copy'" class="text-[11px] text-gray-400">as copy</span>
                    </div>
                </li>
            </ul>
        </div>
        <template #footer>
            <p-button label="Cancel" severity="secondary" text @click="handleCancelBundleImport" />
            <p-button v-if="!importError" label="Import" @click="confirmBundleImport" />
            <p-button v-else label="Close" @click="handleCancelBundleImport" />
        </template>
    </p-dialog>
</template>
