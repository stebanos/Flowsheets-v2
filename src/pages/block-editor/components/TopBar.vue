<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useSheetStore } from '@/entities/sheet';
import { useFileIO, useSheetStorage, useSheetManager } from '@/features/sheet';

const props = defineProps({
    toggleSheetSidebar: {
        type: Function,
        required: false,
        default: null
    },
    sheetSidebarOpen: {
        type: Boolean,
        required: false,
        default: false
    }
});

const { activeSheetName } = useSheetStore();
const { localStatus, localError } = useSheetStorage();
const { fileStatus, fileName, fileDirty, saveSheet } = useFileIO();
const { deletedNotice } = useSheetManager();

// Cmd+S
function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveSheet();
    }
}

onMounted(() => { document.addEventListener('keydown', handleKeydown); });
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown); });

// Status zone
const statusText = computed(() => {
    if (deletedNotice.value) { return `"${deletedNotice.value}" deleted`; }
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
    <div class="relative z-1200 flex items-center h-10 px-3 bg-gray-900 text-white shrink-0">
        <!-- Left: sheet sidebar toggle + sheet name -->
        <div class="flex items-center gap-1.5 min-w-0">
            <button
                v-if="props.toggleSheetSidebar"
                class="flex items-center justify-center w-7 h-7 rounded transition-colors shrink-0"
                :class="props.sheetSidebarOpen
                    ? 'text-white bg-white/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'"
                aria-label="Toggle sheets sidebar"
                @click="props.toggleSheetSidebar"
            >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1" y="2" width="14" height="12" rx="1.5" />
                    <line x1="5" y1="2" x2="5" y2="14" />
                    <line x1="7.5" y1="5.5" x2="13" y2="5.5" />
                    <line x1="7.5" y1="8" x2="13" y2="8" />
                    <line x1="7.5" y1="10.5" x2="11" y2="10.5" />
                </svg>
            </button>
            <span v-if="fileDirty" class="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
            <span
                data-sheet-name
                class="text-white text-sm font-medium cursor-default select-none truncate"
            >{{ activeSheetName }}</span>
        </div>

        <!-- Center: status zone (absolutely centered so left/right sections don't affect it) -->
        <div
            class="absolute left-1/2 -translate-x-1/2 text-xs pointer-events-none max-w-[40%] overflow-hidden text-ellipsis whitespace-nowrap"
            :class="[statusClass, 'text-[#9ca3af]']"
        >
            {{ statusText }}
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1 shrink-0 ml-auto">
            <button
                v-if="showSaveFile"
                class="text-gray-400 hover:text-white hover:bg-white/10 text-xs px-2 py-1 rounded transition-colors"
                @click="saveSheet"
            >Save file</button>
            <slot name="actions" />
        </div>
    </div>
</template>
