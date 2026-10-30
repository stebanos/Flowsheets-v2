// Display form of an evaluated JS value. Numbers go through String() so NaN/Infinity
// stay readable (JSON.stringify turns them into 'null'); anything JSON can't serialise
// (circular, BigInt) falls back to String().
export function formatValue(v) {
    if (v === undefined) { return 'undefined'; }
    if (v === null) { return 'null'; }
    if (typeof v === 'string') { return v; }
    if (typeof v === 'number') { return String(v); }
    try { return JSON.stringify(v); } catch { return String(v); }
}
