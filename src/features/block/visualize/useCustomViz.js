import { reactive, ref, markRaw } from 'vue';
import * as Vue from 'vue';
import { useBlockStore } from '@/entities/block/blockStore';

const DEFAULT_TEMPLATE = `<div class="root">\n  {{ display }}\n</div>`;
const DEFAULT_SCRIPT = `const { computed } = Vue;\nconst display = computed(() => props.value);\nreturn { display };`;
const DEFAULT_STYLE = `.root { padding: .5rem; }`;

function makeDefaultDraft() {
    return { template: DEFAULT_TEMPLATE, script: DEFAULT_SCRIPT, style: DEFAULT_STYLE };
}

// { [name]: { source: {template,script,style}|null, draft: {template,script,style}, component, error, errorPanel } }
// source = last successfully compiled panels (null = never compiled)
// draft = current editor text (may differ from source)
const customVizes = reactive({});

const activeVizName = ref(null);

function createViz() {
    let n = 1;
    while (customVizes[`Viz ${n}`]) { n++; }
    const name = `Viz ${n}`;
    customVizes[name] = { source: null, draft: makeDefaultDraft(), component: null, error: null, errorPanel: null };
    activeVizName.value = name;
}

function renameViz(oldName, newName) {
    if (!customVizes[oldName] || customVizes[newName]) { return false; }
    // Rebuild in original key order so the renamed tab stays in place
    const entries = Object.entries(customVizes).map(([k, v]) => [k === oldName ? newName : k, v]);
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    for (const [k, v] of entries) { customVizes[k] = v; }
    if (activeVizName.value === oldName) { activeVizName.value = newName; }
    const { blocks, updateBlock } = useBlockStore();
    for (const block of blocks) {
        if (block.vizOptions?.customVizName === oldName) {
            updateBlock(block.id, { vizOptions: { ...block.vizOptions, customVizName: newName } });
        }
    }
    return true;
}

// Prefix each comma-separated selector with the scope attribute selector.
// At-rules (lines starting with @) are passed through unchanged.
// Rules inside at-rule blocks are not prefixed in v1 (known limitation).
function scopeCSS(css, scopeId) {
    const attr = `[${scopeId}]`;
    // Split into rule tokens using a simple brace-depth approach
    let result = '';
    let i = 0;
    let depth = 0;
    let ruleStart = 0;

    while (i < css.length) {
        const ch = css[i];
        if (ch === '{') {
            if (depth === 0) {
                // selector region: ruleStart..i
                const selector = css.slice(ruleStart, i);
                const trimmed = selector.trim();
                // If this is an at-rule, pass the whole block through unchanged
                if (trimmed.startsWith('@')) {
                    // find matching closing brace, pass through unchanged
                    depth++;
                    i++;
                    while (i < css.length && depth > 0) {
                        if (css[i] === '{') { depth++; }
                        else if (css[i] === '}') { depth--; }
                        i++;
                    }
                    result += css.slice(ruleStart, i);
                    ruleStart = i;
                    continue;
                } else {
                    // prefix each comma-separated selector
                    const prefixed = trimmed
                        .split(',')
                        .map(s => `${s.trim()}${attr}`)
                        .join(', ');
                    result += prefixed + ' {';
                    depth++;
                }
            } else {
                depth++;
                result += ch;
            }
        } else if (ch === '}') {
            depth--;
            result += ch;
            if (depth === 0) {
                ruleStart = i + 1;
            }
        } else if (depth === 0) {
            // whitespace between rules — skip (will be added implicitly via ruleStart tracking)
        } else {
            result += ch;
        }
        i++;
    }
    return result;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
}

function injectStyle(name, css, scopeId) {
    const scoped = scopeCSS(css, scopeId);
    let el = document.head.querySelector(`style[data-viz-name="${escapeAttr(name)}"]`);
    if (!el) {
        el = document.createElement('style');
        el.setAttribute('data-viz-name', name);
        document.head.appendChild(el);
    }
    el.textContent = scoped;
}

function runViz(name, draft) {
    const entry = customVizes[name];
    if (!entry) { return; }
    entry.draft = { ...draft };
    try {
        const scriptIsEmpty = !draft.script.trim();
        const setupFn = scriptIsEmpty
            ? () => ({})
            : new Function('Vue', 'props', draft.script);

        const scopeId = `data-v-viz-${name.toLowerCase().replace(/\s+/g, '-')}`;
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

function getComponent(name) {
    return customVizes[name]?.component ?? null;
}

// Bulk-load vizes from a persisted map { [name]: { source: {template,script,style} } }.
// Clears existing state (delete old keys — never replace the reactive object).
// Each viz is compiled via runViz; draft initializes to source.
function loadVizes(vizMap) {
    for (const key of Object.keys(customVizes)) { delete customVizes[key]; }
    activeVizName.value = null;
    for (const [name, { source }] of Object.entries(vizMap)) {
        customVizes[name] = { source: null, draft: { ...source }, component: null, error: null, errorPanel: null };
        runViz(name, source);
    }
    const names = Object.keys(customVizes);
    if (names.length > 0) { activeVizName.value = names[0]; }
}

export function useCustomViz() {
    return { customVizes, activeVizName, createViz, renameViz, runViz, saveDraft, revertDraft, getComponent, loadVizes, setErrorPanel };
}
