<template>
    <div class="flex flex-col h-full">
        <!-- Tab strip -->
        <div class="flex items-end border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
            <div v-for="name in vizNames" :key="name"
                 class="flex items-center px-3 h-8 border-r border-gray-200 cursor-pointer select-none text-sm whitespace-nowrap"
                 :class="name === activeVizName ? 'bg-white border-t-2 border-t-black -mt-px' : 'text-gray-500 hover:text-gray-800'"
                 @click="switchTab(name)"
                 @dblclick="startRename(name)">
                <template v-if="editingTabName === name">
                    <input ref="renameInput"
                           v-model="renameValue"
                           class="w-24 border border-blue-400 rounded px-1 text-xs outline-none"
                           @keydown.enter.prevent="confirmRename"
                           @keydown.escape.prevent="cancelRename"
                           @blur="confirmRename"
                           @click.stop />
                </template>
                <template v-else>
                    <span>{{ name }}</span>
                    <span v-if="isDirtyTab(name)"
                          class="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block flex-shrink-0"
                          title="Unsaved changes" />
                </template>
            </div>
            <button class="px-3 h-8 text-gray-400 hover:text-gray-700 cursor-pointer text-xl leading-none flex-shrink-0"
                    title="New visualization"
                    @click="handleCreate">+</button>
        </div>

        <!-- Empty state -->
        <div v-if="vizNames.length === 0"
             class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <p class="text-sm">No custom visualizations yet.</p>
            <button class="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 cursor-pointer"
                    @click="handleCreate">Create your first visualization</button>
        </div>

        <!-- Editor -->
        <div v-else class="flex-1 min-h-0 overflow-hidden">
            <code-mirror ref="cm" basic :lang="jsLang" :extensions v-model="editorCode" class="h-full" />
        </div>

        <!-- Run bar -->
        <div v-if="vizNames.length > 0"
             class="flex items-center gap-3 px-3 py-2 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <div class="flex-1 text-xs min-w-0">
                <span v-if="runBarStatus === 'dirty'" class="text-gray-400 italic">Run to apply changes</span>
                <span v-else-if="runBarStatus === 'success'" class="text-green-600">✓ Compiled</span>
                <template v-else-if="runBarStatus === 'error'">
                    <span class="text-red-600 break-all">{{ activeEntry?.error }}</span>
                    <button v-if="activeEntry?.source"
                            class="ml-2 text-red-500 underline cursor-pointer"
                            @click="handleRevert">Revert</button>
                </template>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">{{ isMac ? '⌘' : 'Ctrl' }}+Enter</span>
            <button class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer flex-shrink-0"
                    @click="handleRun">Run</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { javascript } from '@codemirror/lang-javascript';
import { keymap, EditorView } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { useCustomViz } from '@/features/block/visualize/useCustomViz';

const { customVizes, activeVizName, createViz, renameViz, runViz, saveDraft, revertDraft } = useCustomViz();

const jsLang = javascript();
const fillTheme = EditorView.theme({ '&': { height: '100%' } });

const editorCode = ref('');

// --- Tab state ---
const editingTabName = ref(null);
const renameValue = ref('');
const renameInput = ref(null);

const vizNames = computed(() => Object.keys(customVizes));
const activeEntry = computed(() => activeVizName.value ? customVizes[activeVizName.value] : null);
const isDirty = computed(() => !!activeEntry.value && activeEntry.value.draft !== activeEntry.value.source);

function isDirtyTab(name) {
    const entry = customVizes[name];
    return entry && entry.draft !== entry.source;
}

// --- Run bar state ---
const showSuccess = ref(false);
let successTimeout = null;

const runBarStatus = computed(() => {
    if (!activeEntry.value) { return null; }
    if (activeEntry.value.error) { return 'error'; }
    if (showSuccess.value) { return 'success'; }
    if (isDirty.value) { return 'dirty'; }
    return null;
});

// --- CM6 extensions ---
const extensions = computed(() => [
    fillTheme,
    Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { handleRun(); return true; } }]))
]);

// --- Tab switching ---
function switchTab(name) {
    if (name === activeVizName.value) { return; }
    activeVizName.value = name;
}

watch(activeVizName, (newName) => {
    editingTabName.value = null;
    showSuccess.value = false;
    editorCode.value = newName && customVizes[newName] ? customVizes[newName].draft : '';
}, { immediate: true });

// Save draft on every edit
watch(editorCode, (code) => {
    if (activeVizName.value) { saveDraft(activeVizName.value, code); }
    showSuccess.value = false;
});

// --- Create ---
async function handleCreate() {
    createViz();
    await nextTick();
    startRename(activeVizName.value);
}

// --- Rename ---
function startRename(name) {
    if (name !== activeVizName.value) { switchTab(name); }
    editingTabName.value = name;
    renameValue.value = name;
    nextTick(() => {
        const el = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value;
        el?.select();
    });
}

function confirmRename() {
    if (!editingTabName.value) { return; }
    const oldName = editingTabName.value;
    const newName = renameValue.value.trim();
    editingTabName.value = null;
    if (newName && newName !== oldName) { renameViz(oldName, newName); }
}

function cancelRename() {
    editingTabName.value = null;
}

// --- Run ---
function handleRun() {
    if (!activeVizName.value) { return; }
    runViz(activeVizName.value, editorCode.value);
    if (!activeEntry.value?.error) {
        showSuccess.value = true;
        clearTimeout(successTimeout);
        successTimeout = setTimeout(() => { showSuccess.value = false; }, 2500);
    }
}

function handleRevert() {
    if (!activeVizName.value) { return; }
    revertDraft(activeVizName.value);
    editorCode.value = activeEntry.value?.source ?? '';
}

// --- Platform ---
const isMac = navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac');

onBeforeUnmount(() => { clearTimeout(successTimeout); });
</script>
