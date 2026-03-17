<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useLocalStorage } from '../composables/useLocalStorage';
import { useFileIO } from '../composables/useFileIO';
import { useSidebar } from '@/shared/composables';

const { activeSheetName, renameActiveSheet } = useSheetStore();
const { localStatus, localError } = useLocalStorage();
const { fileStatus, fileName, fileDirty, pendingImport, saveSheet, saveSheetAs, prepareImport, confirmImport, cancelImport } = useFileIO();
const { toggle: toggleSidebar } = useSidebar();

// Inline rename
const renaming = ref(false);
const renameInput = ref('');
const renameEl = ref(null);

function startRename() {
    renameInput.value = activeSheetName.value;
    renaming.value = true;
    nextTick(() => renameEl.value?.select());
}

function commitRename() {
    if (!renaming.value) { return; }
    renaming.value = false;
    const trimmed = renameInput.value.trim();
    if (trimmed) { renameActiveSheet(trimmed); }
}

function cancelRename() {
    renaming.value = false;
}

// File import
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

// Cmd+S
function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (renaming.value) { return; }
        saveSheet();
    }
}

onMounted(() => { document.addEventListener('keydown', handleKeydown); });
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown); });

// Status zone
const statusText = computed(() => {
    if (fileStatus.value === 'saving' || localStatus.value === 'saving') { return 'Saving...'; }
    if (fileStatus.value === 'dirty' || fileDirty.value) { return 'Unsaved changes · ⌘S'; }
    if (fileStatus.value === 'saved') { return `✓ Saved to ${fileName.value}`; }
    if (fileStatus.value === 'ambient' && fileName.value) { return fileName.value; }
    if (localStatus.value === 'restored') { return 'Restored from browser'; }
    if (localStatus.value === 'error') { return localError.value ?? 'Save error'; }
    if (localStatus.value === 'saved' && fileName.value) { return `Saved · ${fileName.value}`; }
    if (localStatus.value === 'saved') { return 'Saved in browser'; }
    return 'In browser';
});

const statusClass = computed(() => ({
    'text-green-400': fileStatus.value === 'saved',
    'text-red-400': localStatus.value === 'error'
}));

// Save button visibility
const showSaveFile = computed(() => fileName.value !== null);
</script>

<template>
    <div class="flex items-center h-10 px-3 bg-[#111827] text-white flex-shrink-0 gap-4">
        <!-- Left: sheet name -->
        <div class="flex items-center gap-1.5 min-w-0">
            <span
                v-if="fileDirty"
                class="w-1.5 h-1.5 rounded-full bg-[#6b7280] flex-shrink-0"
            />
            <span
                v-if="!renaming"
                class="text-white text-sm font-medium cursor-default select-none truncate"
                @dblclick="startRename"
            >{{ activeSheetName }}</span>
            <input
                v-else
                ref="renameEl"
                v-model="renameInput"
                class="bg-transparent text-white text-sm font-medium border-b border-white/40 outline-none px-0 w-32"
                @keydown.enter.stop="commitRename"
                @keydown.escape="cancelRename"
                @blur="commitRename"
            />
            <span class="text-[#6b7280] text-xs select-none">▾</span>
        </div>

        <!-- Center: status zone -->
        <div class="flex-1 text-center text-xs" :class="[statusClass, 'text-[#9ca3af]']">
            {{ statusText }}
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1 flex-shrink-0">
            <p-button
                label="Open"
                severity="secondary"
                text
                size="small"
                class="text-[#9ca3af] hover:text-white px-2"
                @click="openFilePicker"
            />
            <p-button
                v-if="showSaveFile"
                label="Save file"
                severity="secondary"
                text
                size="small"
                class="text-[#9ca3af] hover:text-white px-2"
                @click="saveSheet"
            />
            <p-button
                label="Save As"
                severity="secondary"
                text
                size="small"
                class="text-[#9ca3af] hover:text-white px-2"
                @click="saveSheetAs"
            />
            <p-button
                icon="pi pi-code"
                severity="secondary"
                text
                rounded
                size="small"
                class="text-[#9ca3af] hover:text-white"
                @click="toggleSidebar"
            />
        </div>
    </div>

    <!-- Hidden file input for Open -->
    <input
        ref="fileInputEl"
        type="file"
        accept=".flowsheet.json"
        class="hidden"
        @change="onFileInputChange"
    />

    <!-- Import confirmation dialog -->
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
            <p-button
                label="Cancel"
                severity="secondary"
                text
                @click="handleCancelImport"
            />
            <p-button
                v-if="!importError"
                label="Import"
                @click="handleConfirmImport"
            />
            <p-button
                v-else
                label="Close"
                @click="handleCancelImport"
            />
        </template>
    </p-dialog>
</template>
