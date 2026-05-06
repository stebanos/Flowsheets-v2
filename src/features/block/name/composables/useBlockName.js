import { nextTick, ref } from 'vue';
import { renameIdentifier } from '@/shared/lib/evaluator';
import { generateUniqueNameFromName, useBlockStore } from '@/entities/block';

const JS_RESERVED = new Set([
    'break','case','catch','class','const','continue','debugger','default','delete','do',
    'else','enum','export','extends','finally','for','function','if','implements','import',
    'in','instanceof','interface','let','new','null','package','private','protected',
    'public','return','static','super','switch','this','throw','true','false','try',
    'typeof','undefined','var','void','while','with','yield'
]);

function isValidIdentifier(name) {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) && !JS_RESERVED.has(name);
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
                if (!ids.includes(oldName)) { continue; }
                updateBlock(b.id, { code: renameIdentifier(b.code || '', oldName, newName) });
            }
        } catch {
        }
    }

    function saveName() {
        const trimmed = (editName.value ?? '').trim();

        if (!trimmed || trimmed.length === 0 || trimmed === name.value) {
            return finishEdit();
        }

        if (!isValidIdentifier(trimmed)) {
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
