import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { findExpressionRanges } from './templateLiteralLanguage';

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

export function blockNameHighlighter(blockNames, isStringConcat, inputModes) {
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
