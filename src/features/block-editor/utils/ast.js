import { parse } from 'acorn';
import * as walk from 'acorn-walk';

/**
 * Return a Set of identifier names that appear as *free* uses in `code`.
 * - Skips declaration identifiers, non-computed member properties, and object literal keys.
 * - Uses a simple ancestor-based shadowing heuristic (function params, var/let/const declarators, catch param).
 * - Returns empty Set on parse errors (caller can choose to fallback).
 */
export function extractFreeIdentifiers(code) {
    let ast;
    try {
        ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    } catch (e) {
        return new Set();
    }

    function isDeclaredInAncestors(ancestors, name) {
        // walk ancestors from nearest parent up to program root (skip current node)
        for (let i = ancestors.length - 2; i >= 0; --i) {
            const anc = ancestors[i];
            // function params
            if ((anc.type === 'FunctionDeclaration' || anc.type === 'FunctionExpression' || anc.type === 'ArrowFunctionExpression') && anc.params) {
                for (const p of anc.params) {
                    if (p && p.type === 'Identifier' && p.name === name) return true;
                    // note: does not fully handle patterns (ArrayPattern/ObjectPattern) — extend if needed
                }
            }
            // variable declarator id
            if (anc.type === 'VariableDeclarator' && anc.id && anc.id.type === 'Identifier' && anc.id.name === name) return true;
            // function or class declaration id
            if ((anc.type === 'FunctionDeclaration' || anc.type === 'ClassDeclaration') && anc.id && anc.id.name === name) return true;
            // catch clause param
            if (anc.type === 'CatchClause' && anc.param && anc.param.type === 'Identifier' && anc.param.name === name) return true;
        }
        return false;
    }

    const found = new Set();

    walk.ancestor(ast, {
        Identifier(node, ancestors) {
            const parent = ancestors[ancestors.length - 2];

            // skip object property keys: { key: ... }
            if (parent && parent.type === 'Property' && parent.key === node && parent.computed === false) return;

            // skip non-computed member expression property: obj.prop
            if (parent && parent.type === 'MemberExpression' && parent.property === node && parent.computed === false) return;

            // skip import/export specifiers / labels
            if (parent && (parent.type.startsWith('Import') || parent.type === 'ExportSpecifier' || parent.type === 'LabeledStatement')) return;

            // skip declaration identifiers themselves
            if (parent && ((parent.type === 'VariableDeclarator' && parent.id === node) ||
                ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') && parent.id === node) ||
                (parent.type === 'ClassDeclaration' && parent.id === node))) return;

            // skip if shadowed by a nearer ancestor
            if (isDeclaredInAncestors(ancestors, node.name)) return;

            // record the identifier (exact token) as a free use
            found.add(node.name);
        }
    });

    return found;
}
