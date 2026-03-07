import { ref, nextTick } from 'vue';
import { useBlocks, useBlockDependencies } from '.';

const RESERVED_KEYWORDS = new Set([
    // ECMAScript keywords + common literals
    'break','case','catch','class','const','continue','debugger','default','delete',
    'do','else','enum','export','extends','finally','for','function','if','import',
    'in','instanceof','new','return','super','switch','this','throw','try','typeof',
    'var','void','while','with','yield','let','static','implements','package',
    'protected','interface','private','public','null','true','false','await'
]);

const GLOBAL_NAMES = typeof globalThis !== 'undefined'
    ? new Set(Object.getOwnPropertyNames(globalThis))
    : new Set();

function isReservedOrGlobal(name) {
    if (!name || typeof name !== 'string') { return true; }
    const candidate = name.trim();
    if (candidate.length === 0) { return true; }
    if (RESERVED_KEYWORDS.has(candidate)) { return true; }
    if (GLOBAL_NAMES.has(candidate)) { return true; }

    return false;
}

export function useBlockNameGenerators() {

    const { blocks } = useBlocks();

    function generateUniqueName() {
        // 'a', 'b', 'c', ...
        const existing_names = blocks.map(block => block.name);
        let alpha_index = 'a';
        let current_test_name = alpha_index;
        while (existing_names.indexOf(current_test_name) >= 0) {
            alpha_index = String.fromCharCode(alpha_index.charCodeAt(0) + 1);
            current_test_name = alpha_index;
        }
        return current_test_name;
    }

    function generateUniqueNameFromName(test_name) {
        // 'usernames' => 'usernames_1' => 'usernames_2'
        const existing_names = blocks.map(block => block.name);
        const baseRaw = String(test_name).replace(/\s+/g, '_');
        const base = isReservedOrGlobal(baseRaw) ? '_' + baseRaw : baseRaw;

        let current_test_name = base;
        let number_index = 0;
        while (existing_names.indexOf(current_test_name) >= 0) {
            number_index += 1;
            current_test_name = base + '_' + number_index;
        }
        return current_test_name;
    }

    return { generateUniqueName, generateUniqueNameFromName };
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceIdentifierInCode(code, oldName, newName) {
    if (!code || typeof code !== 'string') { return code; }
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
                            i++;
                            while (i < len) {
                                if (code[i] === '\\') { i += 2; continue; }
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

    const idRegex = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g');
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

        out += code.slice(lastIndex, from) + newName;
        lastIndex = to;
    }
    if (lastIndex < code.length) {
        out += code.slice(lastIndex);
    }
    return out;
}

export function useBlockName(name, nameInput) {

    const isEditing = ref(false);
    const editName = ref('');

    const { blocks } = useBlocks();
    const { generateUniqueNameFromName } = useBlockNameGenerators();
    const { identifiersByBlock } = useBlockDependencies();

    function startEdit() {
        editName.value = name.value;
        isEditing.value = true;
        nextTick(() => nameInput.value?.$el.focus());
    }

    function renameReferences(oldName, newName) {
        try {
            for (const b of blocks) {
                const ids = identifiersByBlock[b.name] || [];
                if (ids.includes(oldName)) {
                    b.code = replaceIdentifierInCode(b.code || '', oldName, newName);
                }
            }
        } catch {
        }
    }

    function saveName() {
        const trimmed = (editName.value ?? '').trim();

        if (!trimmed || trimmed.length === 0 || trimmed === name.value) {
            return finishEdit();
        }

        const newName = generateUniqueNameFromName(trimmed);
        const old = name.value;

        name.value = newName;
        renameReferences(old, newName);

        finishEdit();
    }

    function cancelEdit() {
        isEditing.value = false;
        editName.value = '';
    }

    function finishEdit() {
        cancelEdit();
    }

    return {
        isEditing,
        editName,
        startEdit,
        saveName,
        cancelEdit
    };
}
