import { parse } from 'acorn';

/**
 * Return a Set of identifier names that appear as *free* references in `code`:
 * names not bound by any enclosing declaration, parameter, import, catch clause,
 * class or function name.
 *
 * Scope rules follow the language. `var` and function declarations hoist to the
 * nearest function (or program) scope; `let`, `const` and `class` are block-scoped;
 * loop heads, catch clauses, switch bodies and class bodies open their own scope.
 * A use before its declaration still resolves to the local binding.
 *
 * Assignment targets (`a = 1`, `[a, b] = arr`) are references, not bindings.
 * Non-computed member properties, object keys, labels and meta properties are never
 * identifiers in this sense.
 *
 * Returns an empty Set on parse errors (caller can choose to fallback).
 */
export function extractFreeIdentifiers(code) {
    let ast;
    try {
        ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    } catch (_e) {
        return new Set();
    }

    const ctx = { found: new Set(), refs: null };
    _resolve(ast, ctx);
    return ctx.found;
}

/**
 * Locate every free reference to `name` in `code`, with source positions.
 * A shorthand property (`{ a }`) is flagged so a rewrite can expand it to `{ a: b }`.
 *
 * @returns {Array<{ start: number, end: number, shorthand: boolean }>|null} null on parse errors
 */
export function findFreeReferences(code, name) {
    let ast;
    try {
        ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    } catch (_e) {
        return null;
    }

    const ctx = { found: new Set(), refs: [] };
    _resolve(ast, ctx);
    return ctx.refs.filter(r => r.name === name).map(({ start, end, shorthand }) => ({ start, end, shorthand }));
}

function _resolve(ast, ctx) {
    const program = _makeScope(null, true);
    _hoist(ast.body, program, program);
    _visitAll(ast.body, program, ctx);
}

// ── scopes ──────────────────────────────────────────────────────────────────

function _makeScope(parent, isFunction) {
    return { parent, isFunction, names: new Set() };
}

function _functionScopeOf(scope) {
    let s = scope;
    while (!s.isFunction) { s = s.parent; }
    return s;
}

function _isBound(scope, name) {
    for (let s = scope; s; s = s.parent) {
        if (s.names.has(name)) { return true; }
    }
    return false;
}

/** Names bound by a binding pattern (declarator id, parameter, catch param). */
function _patternNames(pattern, out = []) {
    if (!pattern) { return out; }
    switch (pattern.type) {
    case 'Identifier':
        out.push(pattern.name);
        break;
    case 'ObjectPattern':
        for (const p of pattern.properties) {
            _patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
        }
        break;
    case 'ArrayPattern':
        for (const el of pattern.elements) { _patternNames(el, out); }
        break;
    case 'AssignmentPattern':
        _patternNames(pattern.left, out);
        break;
    case 'RestElement':
        _patternNames(pattern.argument, out);
        break;
    default:
        break;
    }
    return out;
}

function _bindAll(scope, names) {
    for (const n of names) { scope.names.add(n); }
}

// ── hoisting ────────────────────────────────────────────────────────────────

/**
 * Declare the bindings a statement list introduces: lexical ones (let/const/class/
 * function/import) into `block`, `var` ones — found at any nesting depth short of a
 * nested function — into `fn`.
 */
function _hoist(statements, block, fn) {
    for (const stmt of statements) { _collect(stmt, block, fn, true); }
}

function _collect(node, block, fn, top) {
    if (!node) { return; }
    switch (node.type) {
    case 'VariableDeclaration': {
        const target = node.kind === 'var' ? fn : (top ? block : null);
        if (!target) { return; }
        for (const d of node.declarations) { _bindAll(target, _patternNames(d.id)); }
        return;
    }
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
        if (top && node.id) { block.names.add(node.id.name); }
        return;
    case 'ImportDeclaration':
        if (top) { for (const s of node.specifiers) { block.names.add(s.local.name); } }
        return;
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
        _collect(node.declaration, block, fn, top);
        return;
    case 'BlockStatement':
        for (const s of node.body) { _collect(s, block, fn, false); }
        return;
    case 'IfStatement':
        _collect(node.consequent, block, fn, false);
        _collect(node.alternate, block, fn, false);
        return;
    case 'ForStatement':
        _collect(node.init, block, fn, false);
        _collect(node.body, block, fn, false);
        return;
    case 'ForInStatement':
    case 'ForOfStatement':
        _collect(node.left, block, fn, false);
        _collect(node.body, block, fn, false);
        return;
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'LabeledStatement':
        _collect(node.body, block, fn, false);
        return;
    case 'TryStatement':
        _collect(node.block, block, fn, false);
        if (node.handler) { _collect(node.handler.body, block, fn, false); }
        _collect(node.finalizer, block, fn, false);
        return;
    case 'SwitchStatement':
        for (const c of node.cases) {
            for (const s of c.consequent) { _collect(s, block, fn, false); }
        }
        return;
    default:
        return;
    }
}

// ── reference resolution ────────────────────────────────────────────────────

const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'range']);

function _visitAll(nodes, scope, ctx) {
    for (const n of nodes) { _visit(n, scope, ctx); }
}

function _reference(node, scope, ctx, shorthand) {
    if (_isBound(scope, node.name)) { return; }
    ctx.found.add(node.name);
    if (ctx.refs) { ctx.refs.push({ name: node.name, start: node.start, end: node.end, shorthand }); }
}

function _visit(node, scope, ctx) {
    if (!node || typeof node.type !== 'string') { return; }
    switch (node.type) {
    case 'Identifier':
        _reference(node, scope, ctx, false);
        return;

        // never references
    case 'PrivateIdentifier':
    case 'Literal':
    case 'TemplateElement':
    case 'ThisExpression':
    case 'Super':
    case 'MetaProperty':
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'EmptyStatement':
    case 'DebuggerStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
        return;

    case 'LabeledStatement':
        _visit(node.body, scope, ctx);
        return;
    case 'ExportNamedDeclaration':  // bare specifiers name local bindings — nothing free
    case 'ExportDefaultDeclaration':
        _visit(node.declaration, scope, ctx);
        return;

    case 'MemberExpression':
        _visit(node.object, scope, ctx);
        if (node.computed) { _visit(node.property, scope, ctx); }
        return;
    case 'Property':
        if (node.shorthand) {
            // `{ a }` or, as an assignment target, `{ a = 1 }`
            const target = node.value.type === 'AssignmentPattern' ? node.value.left : node.value;
            if (target.type === 'Identifier') { _reference(target, scope, ctx, true); }
            if (node.value.type === 'AssignmentPattern') { _visit(node.value.right, scope, ctx); }
            return;
        }
        if (node.computed) { _visit(node.key, scope, ctx); }
        _visit(node.value, scope, ctx);
        return;
    case 'MethodDefinition':
    case 'PropertyDefinition':
    case 'AccessorProperty':
        if (node.computed) { _visit(node.key, scope, ctx); }
        _visit(node.value, scope, ctx);
        return;

    case 'VariableDeclaration':
        for (const d of node.declarations) {
            _visitPattern(d.id, scope, ctx);
            _visit(d.init, scope, ctx);
        }
        return;

    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
        _visitFunction(node, scope, ctx);
        return;
    case 'ClassDeclaration':
    case 'ClassExpression':
        _visitClass(node, scope, ctx);
        return;

    case 'BlockStatement': {
        const inner = _makeScope(scope, false);
        _hoist(node.body, inner, _functionScopeOf(scope));
        _visitAll(node.body, inner, ctx);
        return;
    }
    case 'StaticBlock': {
        const inner = _makeScope(scope, true);
        _hoist(node.body, inner, inner);
        _visitAll(node.body, inner, ctx);
        return;
    }
    case 'SwitchStatement': {
        _visit(node.discriminant, scope, ctx);
        const inner = _makeScope(scope, false);
        _hoist(node.cases.flatMap(c => c.consequent), inner, _functionScopeOf(scope));
        for (const c of node.cases) {
            _visit(c.test, inner, ctx);
            _visitAll(c.consequent, inner, ctx);
        }
        return;
    }
    case 'ForStatement': {
        const inner = _loopScope(node.init, scope);
        _visit(node.init, inner, ctx);
        _visit(node.test, inner, ctx);
        _visit(node.update, inner, ctx);
        _visit(node.body, inner, ctx);
        return;
    }
    case 'ForInStatement':
    case 'ForOfStatement': {
        const inner = _loopScope(node.left, scope);
        _visit(node.left, inner, ctx);
        _visit(node.right, inner, ctx);
        _visit(node.body, inner, ctx);
        return;
    }
    case 'CatchClause': {
        const inner = _makeScope(scope, false);
        _bindAll(inner, _patternNames(node.param));
        _visitPattern(node.param, inner, ctx);
        _visit(node.body, inner, ctx);
        return;
    }
    default:
        _visitChildren(node, scope, ctx);
    }
}

function _visitChildren(node, scope, ctx) {
    for (const key of Object.keys(node)) {
        if (SKIP_KEYS.has(key)) { continue; }
        const child = node[key];
        if (Array.isArray(child)) {
            for (const c of child) { _visit(c, scope, ctx); }
        } else if (child && typeof child.type === 'string') {
            _visit(child, scope, ctx);
        }
    }
}

/** Expressions inside a binding pattern: defaults and computed keys. */
function _visitPattern(p, scope, ctx) {
    if (!p) { return; }
    switch (p.type) {
    case 'Identifier':
        return;
    case 'ObjectPattern':
        for (const prop of p.properties) {
            if (prop.type === 'RestElement') {
                _visitPattern(prop.argument, scope, ctx);
            } else {
                if (prop.computed) { _visit(prop.key, scope, ctx); }
                _visitPattern(prop.value, scope, ctx);
            }
        }
        return;
    case 'ArrayPattern':
        for (const el of p.elements) { _visitPattern(el, scope, ctx); }
        return;
    case 'AssignmentPattern':
        _visitPattern(p.left, scope, ctx);
        _visit(p.right, scope, ctx);
        return;
    case 'RestElement':
        _visitPattern(p.argument, scope, ctx);
        return;
    default:
        _visit(p, scope, ctx);
    }
}

function _loopScope(head, scope) {
    if (!head || head.type !== 'VariableDeclaration' || head.kind === 'var') { return scope; }
    const inner = _makeScope(scope, false);
    for (const d of head.declarations) { _bindAll(inner, _patternNames(d.id)); }
    return inner;
}

function _visitFunction(node, scope, ctx) {
    const inner = _makeScope(scope, true);
    // a declaration's name is hoisted into the enclosing scope; an expression's is local
    if (node.type === 'FunctionExpression' && node.id) { inner.names.add(node.id.name); }
    if (node.type !== 'ArrowFunctionExpression') { inner.names.add('arguments'); }
    for (const p of node.params) { _bindAll(inner, _patternNames(p)); }
    const isBlock = node.body.type === 'BlockStatement';
    if (isBlock) { _hoist(node.body.body, inner, inner); }
    for (const p of node.params) { _visitPattern(p, inner, ctx); }
    if (isBlock) {
        _visitAll(node.body.body, inner, ctx);
    } else {
        _visit(node.body, inner, ctx);
    }
}

function _visitClass(node, scope, ctx) {
    const inner = _makeScope(scope, false);
    if (node.type === 'ClassExpression' && node.id) { inner.names.add(node.id.name); }
    _visit(node.superClass, inner, ctx);
    for (const member of node.body.body) { _visit(member, inner, ctx); }
}
