/**
 * LCS-based text diff utilities.
 * Used by VizTextDiff for comparing block outputs.
 */

/** Compute longest common subsequence as pairs of [indexInA, indexInB]. */
function lcsIndices(a, b) {
    const m = a.length, n = b.length;
    if (m === 0 || n === 0) { return []; }
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            result.push([i - 1, j - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    return result.reverse();
}

/**
 * Compute character-level diff spans between two strings.
 * Falls back to whole-line pair for very long strings (> 2000 total chars).
 * @param {string} a
 * @param {string} b
 * @returns {Array<{type: 'eq'|'del'|'add', text: string}>}
 */
export function diffChars(a, b) {
    if (a.length + b.length > 2000) {
        return a === b
            ? [{ type: 'eq', text: a }]
            : [{ type: 'del', text: a }, { type: 'add', text: b }];
    }
    const aChars = [...a];
    const bChars = [...b];
    const common = lcsIndices(aChars, bChars);
    const spans = [];
    let ai = 0, bi = 0;
    for (const [ca, cb] of common) {
        if (ai < ca) { spans.push({ type: 'del', text: aChars.slice(ai, ca).join('') }); }
        if (bi < cb) { spans.push({ type: 'add', text: bChars.slice(bi, cb).join('') }); }
        spans.push({ type: 'eq', text: aChars[ca] });
        ai = ca + 1;
        bi = cb + 1;
    }
    if (ai < aChars.length) { spans.push({ type: 'del', text: aChars.slice(ai).join('') }); }
    if (bi < bChars.length) { spans.push({ type: 'add', text: bChars.slice(bi).join('') }); }
    return spans;
}

/**
 * Compute line-level diff between two multi-line strings.
 * Adjacent del+add pairs (changed lines) include character-level spans.
 *
 * Each row: { type: 'eq'|'del'|'add', text: string, spans: null | Array }
 * - spans is null for pure del/add (whole-line change with no paired counterpart)
 * - spans is an array for del/add rows that are part of a changed pair;
 *   each span: { type: 'eq'|'del'|'add', text: string } (del rows omit add spans, add rows omit del spans)
 *
 * @param {string} oldStr
 * @param {string} newStr
 * @returns {Array<{type: string, text: string, spans: null|Array}>}
 */
export function diffLines(oldStr, newStr) {
    const oldLines = (oldStr || '').split('\n');
    const newLines = (newStr || '').split('\n');
    const common = lcsIndices(oldLines, newLines);
    const rows = [];
    let oi = 0, ni = 0;
    for (const [co, cn] of [...common, [oldLines.length, newLines.length]]) {
        const dels = oldLines.slice(oi, co);
        const adds = newLines.slice(ni, cn);
        if (dels.length === adds.length && dels.length > 0) {
            // Equal counts: 1:1 pairing with character-level diff (true "changed lines").
            // Interleaved del/add preserves sequential line numbers on each side.
            for (let p = 0; p < dels.length; p++) {
                const charSpans = diffChars(dels[p], adds[p]);
                rows.push({ type: 'del', text: dels[p], spans: charSpans.filter(s => s.type !== 'add') });
                rows.push({ type: 'add', text: adds[p], spans: charSpans.filter(s => s.type !== 'del') });
            }
        } else {
            // Unequal counts: emit all dels then all adds, no character-level diff.
            // This keeps each side's line numbers contiguous in the output.
            for (const line of dels) { rows.push({ type: 'del', text: line, spans: null }); }
            for (const line of adds) { rows.push({ type: 'add', text: line, spans: null }); }
        }
        // Common line (skip sentinel)
        if (co < oldLines.length) {
            rows.push({ type: 'eq', text: oldLines[co], spans: null });
            oi = co + 1;
            ni = cn + 1;
        }
    }
    return rows;
}
