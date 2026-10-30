<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap } from '@codemirror/view';
import { codeTheme } from '@/shared/lib/codeTheme';
import { detectStringMode } from '@/shared/lib/evaluator';
import { blockNameHighlighter } from '../cm-extensions/blockNameHighlighter';
import { makeBlockRefCompletion } from '../cm-extensions/blockRefCompletion';
import { templateLiteralHighlighting } from '../cm-extensions/templateLiteralLanguage';
import { useExtractSelection } from '../composables/useExtractSelection';
import { useHoveredReference } from '../composables/useHoveredReference';

const props = defineProps({
    code: {
        type: String,
        required: true
    },
    blocks: {
        type: Array,
        required: true
    },
    blockName: {
        type: String,
        required: true
    },
    setHovered: {
        type: Function,
        required: true
    },
    clearHovered: {
        type: Function,
        required: true
    },
    inputModes: {
        type: Object,
        default: () => ({})
    },
    onExtract: {
        type: Function,
        default: null
    },
    onNavigate: {
        type: Function,
        default: null
    }
});

const emit = defineEmits(['update:code']);

const isStringConcat = computed(() => detectStringMode(props.code));
const lang = computed(() => isStringConcat.value ? null : javascript());

const fillTheme = EditorView.theme({
    '&': { height: '100%' }
});

const { attachHoverHandlers, detachHoverHandlers } = useHoveredReference({
    setHovered: props.setHovered,
    clearHovered: props.clearHovered
});

const otherBlockNames = computed(() => props.blocks.map(b => b.name).filter(n => n !== props.blockName));

const extractKeymap = keymap.of([{
    key: 'Mod-Shift-x',
    run() {
        if (props.onExtract && hasSelection.value && selectionIsValid.value) {
            extractSelection();
            return true;
        }
        return false;
    }
}]);

const navigationKeymap = keymap.of([
    {
        key: 'Ctrl-ArrowDown',
        run(view) {
            const { state } = view;
            const cursorPos = state.selection.main.head;
            const lastLineFrom = state.doc.line(state.doc.lines).from;
            if (cursorPos < lastLineFrom) { return false; }
            props.onNavigate?.('next');
            return true;
        }
    },
    {
        key: 'Ctrl-ArrowUp',
        run(view) {
            const { state } = view;
            const cursorPos = state.selection.main.head;
            const firstLineTo = state.doc.line(1).to;
            if (cursorPos > firstLineTo) { return false; }
            props.onNavigate?.('prev');
            return true;
        }
    },
    {
        key: 'Escape',
        run() {
            props.onNavigate?.('escape');
            return true;
        }
    }
]);

const refCompletion = makeBlockRefCompletion(() => otherBlockNames.value);

const extensions = computed(() => {
    const blockPlugin = blockNameHighlighter(otherBlockNames.value, isStringConcat.value, props.inputModes);
    const ext = [
        ...refCompletion,
        codeTheme,
        fillTheme,
        blockPlugin,
        updateListenerExtension
    ];
    if (isStringConcat.value) { ext.push(templateLiteralHighlighting()); }
    if (props.onExtract) { ext.push(extractKeymap); }
    if (props.onNavigate) { ext.push(navigationKeymap); }
    return ext;
});

const code = computed({
    get() { return props.code; },
    set(code) { emit('update:code', code); }
});

const cm = ref();
const editorView = computed(() => cm.value?.view);

const {
    hasSelection,
    selectionIsValid,
    selectionInvalidReason,
    extractSelection,
    updateListenerExtension
} = useExtractSelection(editorView, props.onExtract);

watch(editorView, (view) => {
    if (!view) { return; }
    attachHoverHandlers(editorView);
}, { immediate: true });

onBeforeUnmount(() => {
    detachHoverHandlers(editorView);
});

// transform(code, cursorOrNull) → { code, cursor }; cursor is null when the editor is
// unfocused, so callers can fall back to a position of their choosing (e.g. end of doc)
function editAtCursor(transform) {
    const view = editorView.value;
    if (!view) { return false; }
    const doc = view.state.doc.toString();
    const cursorPos = view.hasFocus ? view.state.selection.main.head : null;
    const next = transform(doc, cursorPos);
    view.dispatch({
        changes: { from: 0, to: doc.length, insert: next.code },
        selection: { anchor: next.cursor },
        scrollIntoView: true
    });
    return true;
}

defineExpose({
    editAtCursor,
    focus() { editorView.value?.focus(); }
});
</script>

<template>
    <div class="extract-wrapper relative h-full w-full">
        <code-mirror ref="cm" basic :lang :extensions v-model="code" :class="{ 'is-string-mode': isStringConcat }" class="h-full w-full text-xs" />
        <button
            v-if="onExtract && hasSelection"
            class="extract-btn absolute top-0.5 right-0.5 z-10 h-5 w-5 flex items-center justify-center text-xs font-bold leading-none rounded cursor-pointer border select-none"
            :class="selectionIsValid ? 'bg-black text-white border-black hover:bg-gray-700' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'"
            :disabled="!selectionIsValid"
            :title="selectionIsValid ? 'Extract to new block (⌘⇧X)' : selectionInvalidReason"
            @mousedown.prevent="extractSelection">
            →
        </button>
    </div>
</template>

<style scoped>
.vue-codemirror :deep(.cm-block-name) {
    border: 2px solid transparent;
    border-radius: 2px;
    padding: 0 .165rem;
}

.vue-codemirror :deep(.cm-block-name-each) {
    background: #000;
    border-color: transparent;
    color: #fff;
}

.vue-codemirror :deep(.cm-block-name-all) {
    background: transparent;
    border-color: #000;
    color: #000;
}

.vue-codemirror :deep(.cm-block-name:hover) {
    background: var(--color-yellow-200);
    border-color: var(--color-yellow-300);
    color: #000;
    cursor: default;
}

.vue-codemirror :deep(.cm-scroller) {
    line-height: 1.5rem;
}

.vue-codemirror :deep(.cm-content) {
    padding: 0;
}

.vue-codemirror :deep(.cm-focused) {
    outline: none;
}

.is-string-mode :deep(.cm-gutters) {
    display: none;
}

.is-string-mode :deep(.cm-editor) {
    position: relative;
}

.is-string-mode :deep(.cm-editor)::after {
    content: '\201D';
    position: absolute;
    font-size: 40px;
    opacity: .25;
    font-family: "Helvetica";
    font-weight: bold;
    top: -7px;
    right: 7px;
    pointer-events: none;
    z-index: 10;
}

.is-string-mode :deep(.cm-editor)::after,
.is-string-mode :deep(.cm-content) {
    font-style: italic;
}
</style>
