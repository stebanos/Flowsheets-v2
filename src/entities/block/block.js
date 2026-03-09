/**
 * Block factory — defines the canonical shape of a block entity.
 * Pure JS; no Vue, no reactivity, no side effects.
 */

/**
 * @typedef {{ id: string, name: string, x: number, y: number, width: number, height: number, code: string }} Block
 */

/**
 * Create a block value object.
 * @param {{ id: string, name: string, x: number, y: number, width: number, height: number, code?: string }} fields
 * @returns {Block}
 */
export function createBlock({ id, name, x, y, width, height, code = '' }) {
    return { id, name, x, y, width, height, code };
}
