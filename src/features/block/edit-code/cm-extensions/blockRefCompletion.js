import { autocompletion, startCompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

const SKIP_NODE_NAMES = new Set([
    'String', 'StringLiteral', 'TemplateString', 'TemplateSpan',
    'LineComment', 'BlockComment', 'Comment', 'RegExp'
]);

export function makeBlockRefCompletion(getBlockNames) {
    function source(context) {
        const match = context.matchBefore(/@\w*/);
        if (!match) { return null; }

        const tree = syntaxTree(context.state);
        let node = tree.resolve(context.pos, -1);
        while (node) {
            if (SKIP_NODE_NAMES.has(node.type.name)) { return null; }
            node = node.parent;
        }

        const names = getBlockNames();

        if (names.length === 0) {
            return {
                from: match.from,
                filter: false,
                options: [{ label: 'No blocks', type: 'text', apply: () => {} }]
            };
        }

        const typed = match.text.slice(1);
        const options = names
            .filter(n => n.startsWith(typed))
            .map(name => ({ label: name, apply: name }));

        return { from: match.from, filter: false, options };
    }

    const atTrigger = EditorView.updateListener.of((update) => {
        if (!update.docChanged) { return; }
        let triggered = false;
        update.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
            if (!triggered && inserted.toString() === '@') { triggered = true; }
        });
        if (triggered) { startCompletion(update.view); }
    });

    return [
        autocompletion({ override: [source], activateOnTyping: false }),
        atTrigger
    ];
}
