export const NOTE_DEFAULTS = { width: 200, height: 150 };
export const NOTE_MIN_SIZE = { width: 120, height: 80 };

export function createNote({
    id = crypto.randomUUID(),
    x = 0,
    y = 0,
    width = NOTE_DEFAULTS.width,
    height = NOTE_DEFAULTS.height,
    title = '',
    body = ''
} = {}) {
    return { id, x, y, width, height, title, body };
}
