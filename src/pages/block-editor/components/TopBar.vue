<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useFileIO } from '../composables';
import { useSheetStorage } from '@/features/sheet/storage';

const props = defineProps({
    toggleSheetSidebar: {
        type: Function,
        required: false,
        default: null,
    },
    sheetSidebarOpen: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const { activeSheetName, renameActiveSheet } = useSheetStore();
const { localStatus, localError } = useSheetStorage();
const { fileStatus, fileName, fileDirty, pendingImport, saveSheet, saveSheetAs, prepareImport, confirmImport, cancelImport, prepareBundleImport, bundleImportState } = useFileIO();

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
    if (fileStatus.value === 'dirty' || fileDirty.value) { return 'File not up to date · ⌘S'; }
    if (fileStatus.value === 'saved') { return `✓ Saved to ${fileName.value}`; }
    if (fileStatus.value === 'ambient' && fileName.value) { return fileName.value; }
    if (localStatus.value === 'error') { return localError.value ?? 'Save error'; }
    return 'Auto-saved';
});

const statusClass = computed(() => ({
    'text-green-400': fileStatus.value === 'saved',
    'text-red-400': localStatus.value === 'error'
}));

// Save button visibility
const showSaveFile = computed(() => fileName.value !== null);
</script>

<template>
    <div class="relative z-[1200] flex items-center h-10 px-3 bg-gray-900 text-white flex-shrink-0">
        <!-- Left: sheet sidebar toggle + sheet name -->
        <div class="flex items-center gap-1.5 min-w-0">
            <button
                v-if="props.toggleSheetSidebar"
                class="flex items-center justify-center w-7 h-7 rounded transition-colors flex-shrink-0"
                :class="props.sheetSidebarOpen
                    ? 'text-white bg-white/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'"
                aria-label="Toggle sheets sidebar"
                @click="props.toggleSheetSidebar"
            >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <rect x="1" y="2" width="14" height="12" rx="1.5" />
                    <line x1="5" y1="2" x2="5" y2="14" />
                    <line x1="7.5" y1="5.5" x2="13" y2="5.5" />
                    <line x1="7.5" y1="8" x2="13" y2="8" />
                    <line x1="7.5" y1="10.5" x2="11" y2="10.5" />
                </svg>
            </button>
            <span v-if="fileDirty" class="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
            <span
                v-if="!renaming"
                data-sheet-name
                class="text-white text-sm font-medium cursor-default select-none truncate"
                @dblclick="startRename"
            >{{ activeSheetName }}</span>
            <input
                v-else
                ref="renameEl"
                data-sheet-name-input
                v-model="renameInput"
                class="bg-transparent text-white text-sm font-medium border-b border-white/40 outline-none px-0 w-32"
                @keydown.enter.stop="commitRename"
                @keydown.esc="cancelRename"
                @blur="commitRename"
            />
        </div>

        <!-- Center: status zone (absolutely centered so left/right sections don't affect it) -->
        <div
            class="absolute left-1/2 -translate-x-1/2 text-xs pointer-events-none max-w-[40%] overflow-hidden text-ellipsis whitespace-nowrap"
            :class="[statusClass, 'text-[#9ca3af]']"
        >
            {{ statusText }}
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1 flex-shrink-0 ml-auto">
            <button
                class="text-gray-400 hover:text-white hover:bg-white/10 text-xs px-2 py-1 rounded transition-colors"
                @click="openFilePicker"
            >Open</button>
            <button
                v-if="showSaveFile"
                class="text-gray-400 hover:text-white hover:bg-white/10 text-xs px-2 py-1 rounded transition-colors"
                @click="saveSheet"
            >Save file</button>
            <button
                class="text-gray-400 hover:text-white hover:bg-white/10 text-xs px-2 py-1 rounded transition-colors"
                @click="saveSheetAs"
            >Save As</button>
            <slot name="actions" />
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
