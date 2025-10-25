import { reactive } from 'vue';
import { useCellDimensions } from './useCellDimensions';

const blocks = reactive([]);

const hasRandomUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

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

function generateRandomId() {
    return hasRandomUUID
        ? crypto.randomUUID()
        : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateId() {
    let id = generateRandomId();

    while (blocks.some(b => b.id === id)) {
        id = generateRandomId();
    }

    return id;
}

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

export function useBlockManager() {
    const { cellWidth, unitY } = useCellDimensions();

    function createBlock(event, name = null, code = '') {
        const gridRect = event.target.getBoundingClientRect();
        const x = Math.floor((event.clientX - gridRect.left) / cellWidth.value) * cellWidth.value;
        const y = Math.floor((event.clientY - gridRect.top) / unitY.value) * unitY.value;

        const block = {
            id: generateId(),
            name: blocks.length + 1,
            x,
            y,
            width: cellWidth.value,
            height: 3 * unitY.value,
        };

        if (name) {
            block.name = generateUniqueNameFromName(name);
        } else {
            block.name = generateUniqueName();
        }

        blocks.push(block);
    }

    return {
        blocks,
        createBlock,
        generateUniqueName,
        generateUniqueNameFromName
    };
}
