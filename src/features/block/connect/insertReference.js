const WORD_CHAR = /[\w$]/;

// Pure text policy for dropping a block reference into code.
// cursorPos null/undefined = unknown cursor (unfocused editor) → end of document.
export function insertReference(code, name, cursorPos) {
    if (code.trim() === '') { return { code: name, cursor: name.length }; }

    const pos = cursorPos == null ? code.length : Math.min(Math.max(cursorPos, 0), code.length);
    const before = code.slice(0, pos);
    const after = code.slice(pos);
    const padLeft = WORD_CHAR.test(before.slice(-1)) ? ' ' : '';
    const padRight = WORD_CHAR.test(after.charAt(0)) ? ' ' : '';

    return {
        code: `${before}${padLeft}${name}${padRight}${after}`,
        cursor: pos + padLeft.length + name.length
    };
}
