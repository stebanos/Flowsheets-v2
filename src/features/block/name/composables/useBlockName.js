import { ref, nextTick } from 'vue';
import { generateUniqueNameFromName, useBlockStore } from '@/entities/block';

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

/**
 * @param {import('vue').WritableComputedRef<string>} name
 * @param {import('vue').Ref} nameInput
 * @param {import('@/entities/block').Block[]} blocks - reactive blocks array from the page
 * @param {Object} identifiersByBlock - reactive map of block name → identifier array
 */
export function useBlockName(name, nameInput, blocks, identifiersByBlock) {
    const { updateBlock } = useBlockStore();

    const isEditing = ref(false);
    const editName = ref('');

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
                    updateBlock(b.id, { code: replaceIdentifierInCode(b.code || '', oldName, newName) });
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

        const existingNames = blocks.map(b => b.name);
        const newName = generateUniqueNameFromName(trimmed, existingNames);
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
