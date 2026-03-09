/**
 * Pure naming logic for blocks.
 * No Vue, no reactivity. All functions accept existing names as parameters.
 */

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

/**
 * Returns true if the given name is a reserved keyword or a globalThis property.
 * @param {string} name
 * @returns {boolean}
 */
export function isReservedOrGlobal(name) {
    if (!name || typeof name !== 'string') { return true; }
    const candidate = name.trim();
    if (candidate.length === 0) { return true; }
    if (RESERVED_KEYWORDS.has(candidate)) { return true; }
    if (GLOBAL_NAMES.has(candidate)) { return true; }

    return false;
}

/**
 * Generate a unique name not in existingNames using sequential letters ('a', 'b', 'c', ...).
 * @param {string[]} existingNames
 * @returns {string}
 */
export function generateUniqueName(existingNames) {
    let alpha_index = 'a';
    let current_test_name = alpha_index;
    while (existingNames.indexOf(current_test_name) >= 0) {
        alpha_index = String.fromCharCode(alpha_index.charCodeAt(0) + 1);
        current_test_name = alpha_index;
    }
    return current_test_name;
}

/**
 * Generate a unique name derived from testName and not in existingNames.
 * Spaces are converted to underscores; reserved names get a leading underscore.
 * @param {string} testName
 * @param {string[]} existingNames
 * @returns {string}
 */
export function generateUniqueNameFromName(testName, existingNames) {
    const baseRaw = String(testName).replace(/\s+/g, '_');
    const base = isReservedOrGlobal(baseRaw) ? '_' + baseRaw : baseRaw;

    let current_test_name = base;
    let number_index = 0;
    while (existingNames.indexOf(current_test_name) >= 0) {
        number_index += 1;
        current_test_name = base + '_' + number_index;
    }
    return current_test_name;
}
