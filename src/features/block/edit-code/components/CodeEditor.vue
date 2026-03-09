<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { autocompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { useHoveredReference } from '../composables/useHoveredReference';

const props = defineProps({
    code: {
        type: String,
        required: true
    },
    blocks: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['update:code', 'update:contentHeight', 'update:contentWidth']);

const lang = javascript();

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

function blockNameHighlighter(blockNames) {
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
            const tree = syntaxTree(view.state);
            while ((m = pattern.exec(text)) !== null) {
                const from = m.index;
                const to = m.index + m[0].length;

                if (isInDeclaration(tree, from)) { continue; }

                let node = tree.resolve(from, 1);
                let skip = false;
                while (node) {
                    if (SKIP_NODE_NAMES.has(node.type.name)) {
                        skip = true;
                        break;
                    }
                    node = node.parent;
                }
                if (skip) { continue; }

                builder.add(from, to, Decoration.mark({ class: 'cm-block-name' }));
            }
            return builder.finish();
        }
    }, { decorations: v => v.decorations });
}

const { attachHoverHandlers, detachHoverHandlers } = useHoveredReference();

const blockNames = computed(() => props.blocks.map(b => b.name));

const extensions = computed(() => {
    const blockPlugin = blockNameHighlighter(blockNames.value);

    return [
        autocompletion({ activateOnTyping: false }),
        fillTheme,
        blockPlugin
    ];
});

const code = computed({
    get() { return props.code; },
    set(code) { emit('update:code', code); }
});

const cm = ref();
const editorView = computed(() => cm.value?.view);

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
}, { immediate: true });

onBeforeUnmount(() => {
    detachHoverHandlers(editorView);
});
</script>

<template>
    <code-mirror ref="cm" basic :lang :extensions v-model="code" />
</template>

<style scoped>
.vue-codemirror :deep(.cm-block-name) {
    background: #000;
    border: 1px solid transparent;
    border-radius: 2px;
    color: #fff;
    padding: 0 .165rem;
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
</style>
