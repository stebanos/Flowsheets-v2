import { findFreeReferences } from './ast';
import { detectStringMode } from './string-template';

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite every free reference to `oldName` in `code` as `newName`.
 *
 * Resolution is AST-based (see `findFreeReferences`): declarations that shadow the
 * name, member properties, object keys, labels, strings, comments and regex bodies
 * are left alone, and a shorthand property `{ a }` becomes `{ a: b }`. String-mode
 * code (a template body) is parsed as a template literal, so prose is never touched.
 * Code that does not parse falls back to a word-boundary scan that skips strings and
 * comments.
 */
export function renameIdentifier(code, oldName, newName) {
    return renameIdentifiers(code, { [oldName]: newName });
}

/**
 * Apply several renames at once. `map` is `{ oldName: newName }` (or a Map); every
 * replacement is resolved against the original code, so chained mappings such as
 * `{ a: 'a2', a2: 'a3' }` never cascade.
 */
export function renameIdentifiers(code, map) {
    if (!code || typeof code !== 'string') { return code; }
    const entries = map instanceof Map ? [...map] : Object.entries(map ?? {});
    const pairs = entries.filter(([from, to]) => from !== to);
    if (!pairs.length) { return code; }

    if (detectStringMode(code)) {
        const wrapped = '`' + code.replace(/`/g, '\\`') + '`';
        const refs = _collectRefs(wrapped, pairs);
        if (refs === null) { return _renameByScan(code, pairs); }
        return _splice(wrapped, refs).slice(1, -1).replace(/\\`/g, '`');
    }

    const refs = _collectRefs(code, pairs);
    if (refs === null) { return _renameByScan(code, pairs); }
    return _splice(code, refs);
}

function _collectRefs(code, pairs) {
    const all = [];
    for (const [from, to] of pairs) {
        const refs = findFreeReferences(code, from);
        if (refs === null) { return null; }
        for (const ref of refs) { all.push({ ...ref, from, to }); }
    }
    return all;
}

function _splice(code, refs) {
    let out = '';
    let last = 0;
    for (const ref of [...refs].sort((a, b) => a.start - b.start)) {
        out += code.slice(last, ref.start);
        out += ref.shorthand ? `${ref.from}: ${ref.to}` : ref.to;
        last = ref.end;
    }
    return out + code.slice(last);
}

// ── fallback: lexical scan for code that does not parse ─────────────────────

function _renameByScan(code, pairs) {
    const len = code.length;
    const skip = new Uint8Array(len); // 1 = skip (inside string/comment/template raw), 0 = ok

    let i = 0;
    while (i < len) {
        const ch = code[i];

        if (ch === '/' && code[i + 1] === '/') {
            let j = i;
            while (j < len && code[j] !== '\n') {
                skip[j] = 1;
                j++;
            }
            i = j;
            continue;
        }

        if (ch === '/' && code[i + 1] === '*') {
            let j = i + 2;
            skip[i] = 1;
            skip[i + 1] = 1;
            while (j < len) {
                skip[j] = 1;
                if (code[j] === '*' && code[j + 1] === '/') {
                    skip[j + 1] = 1;
                    j += 2;
                    break;
                }
                j++;
            }
            i = j;
            continue;
        }

        if (ch === "'") {
            skip[i] = 1;
            i++;
            while (i < len) {
                skip[i] = 1;
                if (code[i] === '\\') {
                    if (i + 1 < len) { skip[i + 1] = 1; i += 2; } else { i++; }
                    continue;
                }
                if (code[i] === "'") { i++; break; }
                i++;
            }
            continue;
        }

        if (ch === '"') {
            skip[i] = 1;
            i++;
            while (i < len) {
                skip[i] = 1;
                if (code[i] === '\\') {
                    if (i + 1 < len) { skip[i + 1] = 1; i += 2; } else { i++; }
                    continue;
                }
                if (code[i] === '"') { i++; break; }
                i++;
            }
            continue;
        }

        if (ch === '`') {
            skip[i] = 1;
            i++;
            while (i < len) {
                skip[i] = 1;
                if (code[i] === '\\') {
                    if (i + 1 < len) { skip[i + 1] = 1; i += 2; } else { i++; }
                    continue;
                }

                if (code[i] === '$' && code[i + 1] === '{') {
                    skip[i] = 1;
                    skip[i + 1] = 1;
                    i += 2;

                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        const c = code[i];

                        if (c === '/' && code[i + 1] === '/') {
                            let j = i;
                            while (j < len && code[j] !== '\n') j++;
                            i = j;
                            continue;
                        }
                        if (c === '/' && code[i + 1] === '*') {
                            let j = i + 2;
                            while (j < len) {
                                if (code[j] === '*' && code[j + 1] === '/') { j += 2; break; }
                                j++;
                            }
                            i = j;
                            continue;
                        }

                        if (c === "'" || c === '"') {
                            const delim = c;
                            skip[i] = 1;
                            i++;
                            while (i < len) {
                                skip[i] = 1;
                                if (code[i] === '\\') { if (i + 1 < len) { skip[i + 1] = 1; } i += 2; continue; }
                                if (code[i] === delim) { i++; break; }
                                i++;
                            }
                            continue;
                        }

                        if (c === '`') {
                            i++;
                            while (i < len) {
                                if (code[i] === '\\') { i += 2; continue; }
                                if (code[i] === '`') { i++; break; }
                                if (code[i] === '$' && code[i + 1] === '{') {
                                    braceDepth++;
                                    i += 2;
                                    continue;
                                }
                                i++;
                            }
                            continue;
                        }

                        if (c === '{') { braceDepth++; i++; continue; }
                        if (c === '}') { braceDepth--; i++; continue; }
                        i++;
                    }
                    continue;
                }

                if (code[i] === '`') { skip[i] = 1; i++; break; }
                i++;
            }
            continue;
        }

        i++;
    }

    // identifier boundaries — `$` is an identifier character, so \b would miss `$a`
    const lookup = new Map(pairs);
    const alternation = pairs.map(([from]) => escapeRegExp(from)).join('|');
    const idRegex = new RegExp('(?<![\\w$])(?:' + alternation + ')(?![\\w$])', 'g');
    let out = '';
    let lastIndex = 0;
    let m;
    while ((m = idRegex.exec(code)) !== null) {
        const from = m.index;
        const to = from + m[0].length;

        let shouldSkip = false;
        for (let k = from; k < to; k++) {
            if (skip[k]) { shouldSkip = true; break; }
        }

        if (shouldSkip) {
            out += code.slice(lastIndex, to);
            lastIndex = to;
            continue;
        }

        out += code.slice(lastIndex, from) + lookup.get(m[0]);
        lastIndex = to;
    }
    if (lastIndex < code.length) {
        out += code.slice(lastIndex);
    }
    return out;
}
