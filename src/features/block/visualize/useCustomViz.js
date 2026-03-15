import { reactive, ref, shallowRef } from 'vue';
import * as Vue from 'vue';

const DEFAULT_STUB = `{
  props: ['value', 'error', 'block'],
  template: '<div>{{ value }}</div>'
}`;

// { [name]: { source: string|null, draft: string, component: shallowRef, error: null|string } }
// source = last successfully compiled source (null = never compiled)
// draft = current editor text (may differ from source)
const customVizes = reactive({});

const activeVizName = ref(null);

function createViz() {
    let n = 1;
    while (customVizes[`Viz ${n}`]) { n++; }
    const name = `Viz ${n}`;
    customVizes[name] = { source: null, draft: DEFAULT_STUB, component: shallowRef(null), error: null };
    activeVizName.value = name;
}

function renameViz(oldName, newName) {
    if (!customVizes[oldName] || customVizes[newName]) { return false; }
    customVizes[newName] = customVizes[oldName];
    delete customVizes[oldName];
    if (activeVizName.value === oldName) { activeVizName.value = newName; }
    return true;
}

function runViz(name, draft) {
    const entry = customVizes[name];
    if (!entry) { return; }
    entry.draft = draft;
    try {
         
        entry.component.value = new Function('Vue', `return (${draft})`)(Vue);
        entry.source = draft;
        entry.error = null;
    } catch (err) {
        entry.error = err.message;
    }
}

function saveDraft(name, draft) {
    if (customVizes[name]) { customVizes[name].draft = draft; }
}

function revertDraft(name) {
    const entry = customVizes[name];
    if (!entry || !entry.source) { return; }
    entry.draft = entry.source;
    entry.error = null;
}

function getComponent(name) {
    return customVizes[name]?.component.value ?? null;
}

export function useCustomViz() {
    return { customVizes, activeVizName, createViz, renameViz, runViz, saveDraft, revertDraft, getComponent };
}
