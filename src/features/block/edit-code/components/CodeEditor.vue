<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { autocompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, keymap } from '@codemirror/view';
import { useHoveredReference } from '../composables/useHoveredReference';
import { useExtractSelection } from '../composables/useExtractSelection';
import { templateLiteralHighlighting, findExpressionRanges } from '../cm-extensions/templateLiteralLanguage';

const props = defineProps({
    code: {
        type: String,
        required: true
    },
    blocks: {
        type: Array,
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
    isStringConcat: {
        type: Boolean,
        default: false
    },
    inputModes: {
        type: Object,
        default: () => ({})
    },
    onExtract: {
        type: Function,
        default: null
    }
});

const emit = defineEmits(['update:code', 'update:contentHeight', 'update:contentWidth']);

const lang = computed(() => props.isStringConcat ? null : javascript());

const fillTheme = EditorView.theme({
    '&': { height: '100%' }
});

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DECLARATION_NODE_NAMES = new Set([
    'VariableDeclaration', 'VariableDefinition', 'VarDecl', 'LetDecl', 'ConstDecl',
    'FunctionDeclaration', 'FunctionDef', 'ClassDeclaration',
    'PropertyName', 'PropertyDefinition', 'ObjectProperty', 'MethodDefinition',
    'ImportDeclaration', 'ImportSpecifier', 'ExportSpecifier',
    'FormalParameter', 'Parameter', 'ArrowFunction'
]);

function isInDeclaration(tree, pos) {
    if (!tree) { return false; }
    let node = tree.resolve(pos, 1);
    while (node) {
        if (DECLARATION_NODE_NAMES.has(node.type.name)) return true;
        node = node.parent;
    }
    return false;
}


function blockNameHighlighter(blockNames, isStringConcat, inputModes) {
    if (!blockNames || blockNames.length === 0) {
        return ViewPlugin.fromClass(class {
            constructor() { this.decorations = Decoration.none; }
        }, { decorations: v => v.decorations });
    }

    const pattern = new RegExp('\\b(' + blockNames.map(escapeRegExp).join('|') + ')\\b', 'g');

    const SKIP_NODE_NAMES = new Set([
        'String', 'StringLiteral', 'TemplateString', 'TemplateSpan',
        'LineComment', 'BlockComment', 'Comment'
    ]);

    function modeClass(name) {
        return (inputModes[name] ?? 'each') === 'all' ? 'cm-block-name cm-block-name-all' : 'cm-block-name cm-block-name-each';
    }

    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.decorations = this.buildDecorations(view);
        }

        update(update) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view) {
            const builder = new RangeSetBuilder();
            const text = view.state.doc.toString();
            pattern.lastIndex = 0;
            let m;

            if (isStringConcat) {
                const exprRanges = findExpressionRanges(text);
                while ((m = pattern.exec(text)) !== null) {
                    const from = m.index;
                    const to = m.index + m[0].length;
                    if (!exprRanges.some(r => from >= r.from && to <= r.to)) { continue; }
                    builder.add(from, to, Decoration.mark({ class: modeClass(m[0]) }));
                }
            } else {
                const tree = syntaxTree(view.state);
                while ((m = pattern.exec(text)) !== null) {
                    const from = m.index;
                    const to = m.index + m[0].length;

                    if (isInDeclaration(tree, from)) { continue; }

                    let node = tree.resolve(from, 1);
                    let skip = false;
                    while (node) {
                        if (SKIP_NODE_NAMES.has(node.type.name)) { skip = true; break; }
                        node = node.parent;
                    }
                    if (skip) { continue; }

                    builder.add(from, to, Decoration.mark({ class: modeClass(m[0]) }));
                }
            }

            return builder.finish();
        }
    }, { decorations: v => v.decorations });
}

const { attachHoverHandlers, detachHoverHandlers } = useHoveredReference({
    setHovered: props.setHovered,
    clearHovered: props.clearHovered
});

const blockNames = computed(() => props.blocks.map(b => b.name));

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

const extensions = computed(() => {
    const blockPlugin = blockNameHighlighter(blockNames.value, props.isStringConcat, props.inputModes);
    const ext = [
        autocompletion({ activateOnTyping: false }),
        fillTheme,
        blockPlugin,
        updateListenerExtension
    ];
    if (props.isStringConcat) { ext.push(templateLiteralHighlighting()); }
    if (props.onExtract) { ext.push(extractKeymap); }
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

// defaultCharacterWidth starts at 7 (CM6 hardcoded fallback) and becomes accurate
// after the first requestMeasure() cycle. Read it via editorView so it's always current.
const emitWidth = () => {
    const view = editorView.value;
    if (!view) { return; }
    const charWidth = view.defaultCharacterWidth;
    if (charWidth === 0) { return; }
    let maxLen = 0;
    for (const line of view.state.doc.iterLines()) {
        if (line.length > maxLen) { maxLen = line.length; }
    }
    const gutters = view.dom.querySelector('.cm-gutters');
    const gutterWidth = gutters ? gutters.offsetWidth : 0;
    emit('update:contentWidth', maxLen * charWidth + gutterWidth);
};

const emitHeight = () => {
    const view = editorView.value;
    if (!view) { return; }
    const scrollbarH = view.scrollDOM.offsetHeight - view.scrollDOM.clientHeight;
    emit('update:contentHeight', view.contentHeight + scrollbarH);
};

// Watch code changes for both dimensions — same pattern, same rationale:
// Vue reactivity fires on every user edit; by then CM6 measurements are accurate.
// Avoids ResizeObserver firing during container resize (block drag/resize handle),
// which would fight the resize and cause oscillation.
watch(code, emitHeight);
watch(code, emitWidth);

watch(editorView, (view) => {
    if (!view) { return; }
    emitHeight();
    // Defer initial width past CM6's first requestMeasure() cycle
    // so defaultCharacterWidth reflects the real font, not the 7px fallback.
    requestAnimationFrame(emitWidth);
    attachHoverHandlers(editorView);
}, { immediate: true });

onBeforeUnmount(() => {
    detachHoverHandlers(editorView);
});
</script>

<template>
    <div class="extract-wrapper relative h-full w-full">
        <code-mirror ref="cm" basic :lang :extensions v-model="code" :class="{ 'is-string-mode': isStringConcat }" class="h-full w-full" />
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
    background-color: #ddd;
    position: relative;
}

.is-string-mode :deep(.cm-editor)::after {
    content: '\201D';
    position: absolute;
    font-size: 40px;
    opacity: .25;
    font-family: "Helvetica";
    font-weight: bold;
    top: 10px;
    right: 7px;
    pointer-events: none;
    z-index: 10;
}

.is-string-mode :deep(.cm-editor)::after,
.is-string-mode :deep(.cm-content) {
    font-style: italic;
}
</style>
