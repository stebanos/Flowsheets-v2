<script setup>
import { ref, computed } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { autocompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { useBlocks } from '../composables';

const props = defineProps({
    code: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:code']);

const lang = javascript();

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
                if (!isInDeclaration(tree, from)) {
                    builder.add(from, to, Decoration.mark({ class: 'cm-block-name' }));
                }
            }
            return builder.finish();
        }
    }, { decorations: v => v.decorations });
}

const { blocks } = useBlocks();

const blockNames = computed(() => blocks.map(b => b.name));

const extensions = computed(() => {
    const blockPlugin = blockNameHighlighter(blockNames.value);

    return [
        autocompletion({ activateOnTyping: false }),
        blockPlugin
    ];
});

const code = computed({
    get() { return props.code; },
    set(code) { emit('update:code', code); }
});

const cm = ref();
const editorView = computed(() => cm.value?.view);
const editorState = computed(() => editorView.value?.state);
</script>

<template>
    <code-mirror ref="cm" basic :lang :extensions v-model="code" />
</template>

<style scoped>
.vue-codemirror :deep(.cm-block-name) {
    background: #000;
    color: #fff;
    padding: 0 .165rem;
    border-radius: 2px;
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
