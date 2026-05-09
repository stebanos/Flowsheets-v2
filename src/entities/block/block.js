/**
 * Block factory — defines the canonical shape of a block entity.
 * Pure JS; no Vue, no reactivity, no side effects.
 */

/**
 * @typedef {{ id: string, name: string, x: number, y: number, width: number, height: number, code: string, visualizationType: string, vizOptions: object, inputModes: object, editorHeight: number|null, outputHeight: number|null, editorCollapsed: boolean }} Block
 */

/**
 * Create a block value object.
 * @param {{ id: string, name: string, x: number, y: number, width: number, height: number, code?: string }} fields
 * @returns {Block}
 */
export function createBlock({ id, name, x, y, width, height, code = '', visualizationType = 'default', vizOptions = {}, inputModes = {}, editorHeight = null, outputHeight = null, editorCollapsed = false }) {
    return { id, name, x, y, width, height, code, visualizationType, vizOptions, inputModes, editorHeight, outputHeight, editorCollapsed };
}
