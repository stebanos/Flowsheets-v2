const PERSISTED_BLOCK_FIELDS = [
    'id',
    'name',
    'x',
    'y',
    'code',
    'isStringConcat',
    'inputModes',
    'visualizationType',
    'vizOptions',
    'userMinWidth',
    'userMinEditorHeight',
    'filterClause',
    'sortClause'
];

/**
 * Serialize a sheet to a plain JSON-serializable object.
 * Only vizes referenced by blocks in this sheet are included (source only, not draft).
 * @param {Array} blocks - array of block objects from blockStore
 * @param {Object} vizes - { [name]: { source, draft } } from useCustomViz
 * @param {string} name - sheet name
 * @returns {Object} - { version: 1, name, blocks: [...], customVizes: {...} }
 */
export function serializeSheet(blocks, vizes, name) {
    const serializedBlocks = blocks.map((block) => {
        const out = {};
        for (const field of PERSISTED_BLOCK_FIELDS) {
            out[field] = block[field];
        }
        return out;
    });

    const referencedVizNames = new Set();
    for (const block of blocks) {
        const customVizName = block.vizOptions?.customVizName;
        if (customVizName != null) {
            referencedVizNames.add(customVizName);
        }
    }

    const customVizes = {};
    for (const vizName of referencedVizNames) {
        if (vizes[vizName] != null) {
            customVizes[vizName] = { source: vizes[vizName].source };
        }
    }

    return {
        version: 1,
        name,
        blocks: serializedBlocks,
        customVizes
    };
}

/**
 * Deserialize a sheet JSON object into blocks and vizes.
 * Applies field defaults for missing optional fields.
 * Does NOT validate version — call migrate() first.
 * @param {Object} json
 * @returns {{ blocks: Array, vizes: Object, name: string }}
 */
export function deserializeSheet(json) {
    const name = json.name ?? 'Untitled';

    const blocks = (json.blocks ?? []).map((block) => ({
        ...block,
        isStringConcat: block.isStringConcat ?? false,
        inputModes: block.inputModes ?? {},
        visualizationType: block.visualizationType ?? 'default',
        vizOptions: block.vizOptions ?? {},
        userMinWidth: block.userMinWidth ?? null,
        userMinEditorHeight: block.userMinEditorHeight ?? null,
        filterClause: block.filterClause ?? null,
        sortClause: block.sortClause ?? null
    }));

    const vizes = json.customVizes ?? {};

    return { blocks, vizes, name };
}

/**
 * Serialize vizes only (for future .flowviz.json library export).
 * @param {Object} vizes - { [name]: { source, draft } }
 * @returns {Object} - { version: 1, customVizes: { [name]: { source } } }
 */
export function serializeVizes(vizes) {
    const customVizes = {};
    for (const [vizName, viz] of Object.entries(vizes)) {
        customVizes[vizName] = { source: viz.source };
    }
    return { version: 1, customVizes };
}

/**
 * Deserialize a viz library JSON object.
 * Does NOT validate version — call migrate() first.
 * @param {Object} json
 * @returns {Object} - { [name]: { source } }
 */
export function deserializeVizes(json) {
    return json.customVizes ?? {};
}
