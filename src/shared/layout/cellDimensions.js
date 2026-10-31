/**
 * Pure math for grid cell dimension snapping.
 * No Vue, no reactivity, no side effects.
 */

export const DEFAULT_CELL_WIDTH = 150;
export const DEFAULT_CELL_HEIGHT = 24;

// A new block spans one cell wide; its editor is two rows and its output three.
export const BLOCK_SIZE_DEFAULTS = {
    width: DEFAULT_CELL_WIDTH,
    editorHeight: 2 * DEFAULT_CELL_HEIGHT,
    outputHeight: 3 * DEFAULT_CELL_HEIGHT
};

/**
 * Compute the sub-column snap unit for horizontal snapping.
 * Tries to divide cellWidth by 4, 3, or 2; returns cellWidth if none divide evenly.
 * @param {number} cellWidth
 * @returns {number}
 */
export function computeUnitX(cellWidth) {
    const divisors = [4, 3, 2];
    for (const divisor of divisors) {
        if (cellWidth % divisor === 0) {
            return cellWidth / divisor;
        }
    }
    return cellWidth;
}

/**
 * Snap a value to the nearest unitX grid position.
 * @param {number} value
 * @param {number} unitX
 * @returns {number}
 */
export function snapX(value, unitX) {
    return Math.round(value / unitX) * unitX;
}

/**
 * Snap a value to the nearest cellHeight grid row.
 * @param {number} value
 * @param {number} cellHeight
 * @returns {number}
 */
export function snapY(value, cellHeight) {
    return Math.round(value / cellHeight) * cellHeight;
}
