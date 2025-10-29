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
    const re = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g');
    return code.replace(re, newName);
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
        nextTick(() => nameInput.value?.focus());
    }

    function renameReferences(oldName, newName) {
        try {
            for (const b of blocks) {
                const ids = identifiersByBlock[b.name] || [];
                if (ids.includes(oldName)) {
                    b.code = replaceIdentifierInCode(b.code || '', oldName, newName);
                }
            }
        } catch (err) {
        }
    }

    function saveName() {
        const trimmed = (editName.value ?? '').trim();
        if (trimmed.length) {
            const newName = generateUniqueNameFromName(trimmed);
            name.value = newName;
            renameReferences(name.value, newName);
        }
        isEditing.value = false;
        editName.value = '';
    }

    function cancelEdit() {
        isEditing.value = false;
        editName.value = '';
    }

    return {
        isEditing,
        editName,
        startEdit,
        saveName,
        cancelEdit
    };
}
