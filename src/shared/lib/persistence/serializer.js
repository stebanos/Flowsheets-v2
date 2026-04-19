const PERSISTED_BLOCK_FIELDS = [
    'id',
    'name',
    'x',
    'y',
    'code',
    'inputModes',
    'visualizationType',
    'vizOptions',
    'userMinWidth',
    'userMinEditorHeight'
];

/**
 * Serialize a sheet to a plain JSON-serializable object.
 * Only vizes referenced by blocks in this sheet are included (source only, not draft).
 * @param {Array} blocks - array of block objects from blockStore
 * @param {Object} vizes - { [name]: { source, draft } } from useCustomViz
 * @param {string} name - sheet name
 * @returns {Object} - { version: 1, name, blocks: [...], customVizes: {...} }
 */
export function serializeSheet(blocks, vizes, name, view) {
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

    const result = {
        version: 1,
        name,
        blocks: serializedBlocks,
        customVizes
    };

    if (view != null) {
        result.view = { panX: view.panX ?? 0, panY: view.panY ?? 0 };
    }

    return result;
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
        inputModes: block.inputModes ?? {},
        visualizationType: block.visualizationType ?? 'default',
        vizOptions: block.vizOptions ?? {},
        userMinWidth: block.userMinWidth ?? null,
        userMinEditorHeight: block.userMinEditorHeight ?? null
    }));

    const vizes = json.customVizes ?? {};
    const view = { panX: json.view?.panX ?? 0, panY: json.view?.panY ?? 0 };

    return { blocks, vizes, name, view };
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

const BUNDLE_FORMAT_VERSION = '1.0.0';
const RECOGNISED_FORMAT_VERSIONS = new Set(['1.0.0']);

/**
 * Serialize multiple sheets into a bundle.
 * @param {Array<{ id: string, name: string, blocks: Array, vizes: Object }>} sheetEntries
 * @param {string} rootSheetId
 * @returns {Object} - { formatVersion, exportedAt, rootSheetId, sheets: [...] }
 */
export function serializeBundle(sheetEntries, rootSheetId) {
    const sheets = sheetEntries.map(({ id, name, blocks, vizes }) => {
        const serialized = serializeSheet(blocks ?? [], vizes ?? {}, name ?? 'Untitled');
        return { id, name: serialized.name, blocks: serialized.blocks, customVizes: serialized.customVizes };
    });

    return {
        formatVersion: BUNDLE_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        rootSheetId,
        sheets
    };
}

/**
 * Deserialize and validate a bundle JSON object.
 * @param {Object} json
 * @returns {{ rootSheetId: string, sheets: Array<{ id, name, blocks, vizes }> }}
 * @throws {Error} if formatVersion is missing or unrecognised
 */
export function deserializeBundle(json) {
    if (!json.formatVersion) {
        throw new Error('Invalid bundle: formatVersion is missing.');
    }
    if (!RECOGNISED_FORMAT_VERSIONS.has(json.formatVersion)) {
        throw new Error(`Unsupported bundle version: ${json.formatVersion}`);
    }

    const sheets = (json.sheets ?? []).map((sheet) => {
        const { blocks, vizes, name } = deserializeSheet({
            version: 1,
            blocks: sheet.blocks ?? [],
            customVizes: sheet.customVizes ?? {},
            name: sheet.name
        });
        return { id: sheet.id, name, blocks, vizes };
    });

    return { rootSheetId: json.rootSheetId, sheets };
}
