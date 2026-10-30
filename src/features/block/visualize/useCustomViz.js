import * as Vue from 'vue';
import { markRaw } from 'vue';
import { injectStyle } from '@/shared/lib/css-scope';
import { useCustomVizStore, useVizLibrary } from '@/entities/viz';

const { saveLibraryEntry } = useVizLibrary();
const { customVizes, activeVizName, createViz, deleteViz, renameViz, resetVizes, saveDraft, revertDraft } = useCustomVizStore();

function runViz(name, draft) {
    const entry = customVizes[name];
    if (!entry) { return; }
    entry.draft = { ...draft };
    try {
        const scriptIsEmpty = !draft.script.trim();
        const setupFn = scriptIsEmpty
            ? () => ({})
            : new Function('Vue', 'props', draft.script);

        const scopeId = `data-v-viz-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        injectStyle(name, draft.style || '', scopeId);

        entry.component = markRaw({
            __scopeId: scopeId,
            props: ['value', 'error', 'block'],
            template: draft.template,
            setup(innerProps) {
                const result = setupFn(Vue, innerProps);
                if (result === undefined) {
                    throw new Error('Script returned nothing — add `return { … }` to expose bindings to your template.');
                }
                return result;
            }
        });
        entry.source = { ...draft };
        entry.error = null;
        entry.errorPanel = null;
        saveLibraryEntry(name, draft);
    } catch (err) {
        entry.error = err.message;
        entry.component = null;
        // Attribute error to script panel (style errors are also caught here)
        entry.errorPanel = 'script';
    }
}

function setErrorPanel(name, panel) {
    if (customVizes[name]) { customVizes[name].errorPanel = panel; }
}

function getComponent(name) {
    return customVizes[name]?.component ?? null;
}

// Bulk-load vizes from a persisted map { [name]: { source: {template,script,style} } }.
// The store resets the map; each viz is then compiled via runViz.
function loadVizes(vizMap) {
    resetVizes(vizMap);
    for (const [name, { source }] of Object.entries(vizMap)) {
        runViz(name, source);
    }
}

export function useCustomViz() {
    return { customVizes, activeVizName, createViz, deleteViz, renameViz, runViz, saveDraft, revertDraft, getComponent, loadVizes, setErrorPanel };
}
