import { parser as jsParser } from '@lezer/javascript';
import { highlightTree } from '@lezer/highlight';
import { defaultHighlightStyle } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';

// Parse expressions as standalone JS — avoids needing a full template-literal lezer grammar.
const expressionParser = jsParser.configure({ top: 'SingleExpression' });

// Returns [{from, to}] of each ${...} expression body (brace-depth aware, excludes delimiters).
function findExpressionRanges(text) {
    const ranges = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '$' && text[i + 1] === '{') {
            const start = i + 2;
            let depth = 1;
            let j = start;
            while (j < text.length && depth > 0) {
                if (text[j] === '{') { depth++; }
                else if (text[j] === '}') { depth--; }
                j++;
            }
            if (depth === 0) { ranges.push({ from: start, to: j - 1 }); }
            i = j;
        } else {
            i++;
        }
    }
    return ranges;
}

function buildDecorations(view) {
    const builder = new RangeSetBuilder();
    const text = view.state.doc.toString();
    const exprRanges = findExpressionRanges(text);

    for (const { from, to } of exprRanges) {
        const exprText = text.slice(from, to);
        const tree = expressionParser.parse(exprText);
        highlightTree(tree, defaultHighlightStyle, (start, end, classes) => {
            builder.add(from + start, from + end, Decoration.mark({ class: classes }));
        });
    }

    return builder.finish();
}

export { findExpressionRanges };

export function templateLiteralHighlighting() {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.decorations = buildDecorations(view);
        }
        update(update) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildDecorations(update.view);
            }
        }
    }, { decorations: v => v.decorations });
}
