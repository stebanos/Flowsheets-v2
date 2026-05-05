export function safeStringify(value) {
    const seen = new Set();
    return JSON.stringify(value, function replacer(_key, val) {
        if (val === undefined) { return '[undefined]'; }
        if (typeof val === 'function') { return '[Function]'; }
        if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) { return '[Circular]'; }
            seen.add(val);
        }
        return val;
    }, 2);
}