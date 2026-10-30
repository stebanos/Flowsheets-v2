import { reactive, ref } from 'vue';
import { useVizLibrary } from './useVizLibrary';

const DEFAULT_TEMPLATE = `<div class="root">\n  {{ display }}\n</div>`;
const DEFAULT_SCRIPT = `const { computed } = Vue;\nconst display = computed(() => props.value);\nreturn { display };`;
const DEFAULT_STYLE = `.root { padding: .5rem; }`;

function makeDefaultDraft() {
    return { template: DEFAULT_TEMPLATE, script: DEFAULT_SCRIPT, style: DEFAULT_STYLE };
}

function makeEntry(draft) {
    return { source: null, draft, component: null, error: null, errorPanel: null };
}

// { [name]: { source: {template,script,style}|null, draft: {template,script,style}, component, error, errorPanel } }
// source = last successfully compiled panels (null = never compiled)
// draft = current editor text (may differ from source)
// component / error / errorPanel are written by the compiling feature (features/block/visualize)
const customVizes = reactive({});

const activeVizName = ref(null);

function saveDraft(name, panelDrafts) {
    if (customVizes[name]) { customVizes[name].draft = { ...panelDrafts }; }
}

function revertDraft(name) {
    const entry = customVizes[name];
    if (!entry || !entry.source) { return; }
    entry.draft = { ...entry.source };
    entry.error = null;
    entry.errorPanel = null;
}

// Replace the map with uncompiled entries from a persisted map { [name]: { source: {template,script,style} } }.
// Clears existing state (delete old keys — never replace the reactive object); draft initializes to source.
// The first viz becomes active. Compiling the entries is the feature's job (useCustomViz.loadVizes).
function resetVizes(vizMap) {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
    for (const [name, { source }] of Object.entries(vizMap)) {
        customVizes[name] = makeEntry({ ...source });
    }
    const names = Object.keys(customVizes);
    if (names.length > 0) { activeVizName.value = names[0]; }
}

export function useCustomVizStore() {
    const { createLibraryEntry, deleteLibraryEntry, renameLibraryEntry } = useVizLibrary();

    function createViz() {
        let n = 1;
        while (customVizes[`Viz ${n}`]) { n++; }
        const name = `Viz ${n}`;
        customVizes[name] = makeEntry(makeDefaultDraft());
        activeVizName.value = name;
        createLibraryEntry(name);
    }

    function deleteViz(name) {
        if (!customVizes[name]) { return; }
        const names = Object.keys(customVizes);
        const idx = names.indexOf(name);
        delete customVizes[name];
        if (activeVizName.value === name) {
            const remaining = Object.keys(customVizes);
            activeVizName.value = remaining[Math.min(idx, remaining.length - 1)] ?? null;
        }
        deleteLibraryEntry(name);
    }

    function renameViz(oldName, newName) {
        if (!customVizes[oldName] || customVizes[newName]) { return false; }
        const entries = Object.entries(customVizes).map(([k, v]) => [k === oldName ? newName : k, v]);
        for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
        for (const [k, v] of entries) { customVizes[k] = v; }
        if (activeVizName.value === oldName) { activeVizName.value = newName; }
        renameLibraryEntry(oldName, newName);
        return true;
    }

    return { activeVizName, customVizes, createViz, deleteViz, renameViz, resetVizes, revertDraft, saveDraft };
}
