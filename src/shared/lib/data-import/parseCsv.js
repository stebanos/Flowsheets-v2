const DELIMITER_CANDIDATES = [',', ';', '\t'];

function detectDelimiter(firstLine) {
    let best = ',';
    let bestCount = -1;
    for (const d of DELIMITER_CANDIDATES) {
        const count = firstLine.split(d).length - 1;
        if (count > bestCount) { best = d; bestCount = count; }
    }
    return best;
}

/**
 * Parse CSV text into a matrix of string cells.
 * RFC-4180-ish: quoted fields, escaped "" quotes, delimiters/newlines inside
 * quotes, \r\n and \n line endings, one trailing newline ignored.
 *
 * @param {string} text
 * @param {{ delimiter?: string }} [opts]
 * @returns {{ rows: string[][], delimiter: string }}
 */
export function parseCsv(text, opts = {}) {
    const input = String(text ?? '').replace(/^\uFEFF/, '');
    const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
    const delimiter = opts.delimiter ?? detectDelimiter(firstLine);

    const rows = [];
    let field = '';
    let row = [];
    let inQuotes = false;
    let i = 0;

    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { pushField(); rows.push(row); row = []; };

    while (i < input.length) {
        const ch = input[i];

        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false; i += 1; continue;
            }
            field += ch; i += 1; continue;
        }

        if (ch === '"') { inQuotes = true; i += 1; continue; }
        if (ch === delimiter) { pushField(); i += 1; continue; }
        if (ch === '\r') { if (input[i + 1] === '\n') { i += 1; } pushRow(); i += 1; continue; }
        if (ch === '\n') { pushRow(); i += 1; continue; }
        field += ch; i += 1;
    }

    // Flush the final field/row unless the input ended exactly on a row break.
    if (field !== '' || row.length > 0) { pushRow(); }

    return { rows, delimiter };
}

/**
 * Coerce a raw CSV cell string to a JS scalar.
 * '' → null; true/false (case-insensitive) → boolean; finite numeric → number;
 * everything else → the original string.
 *
 * @param {string} raw
 * @returns {number|boolean|null|string}
 */
export function coerceCell(raw) {
    if (raw === '') { return null; }
    if (/^true$/i.test(raw)) { return true; }
    if (/^false$/i.test(raw)) { return false; }
    if (raw.trim() !== '') {
        const n = Number(raw);
        if (Number.isFinite(n)) { return n; }
    }
    return raw;
}

function resolveHeaders(rawHeaders) {
    const used = new Set();
    return rawHeaders.map((h, i) => {
        const trimmed = h.trim();
        let name = trimmed === '' ? `col_${i + 1}` : trimmed;
        if (used.has(name)) { name = `${name}_${i + 1}`; }
        used.add(name);
        return name;
    });
}

/**
 * Parse CSV text into an array of records (objects keyed by header).
 * First row is the header; each subsequent row becomes one object with
 * per-cell coercion. Empty/duplicate headers get positional fallback names.
 *
 * @param {string} text
 * @param {{ delimiter?: string }} [opts]
 * @returns {Array<object>}
 */
export function csvToRecords(text, opts = {}) {
    const { rows } = parseCsv(text, opts);
    if (rows.length < 2) { return []; }

    const headers = resolveHeaders(rows[0]);
    return rows.slice(1).map(row => {
        const record = {};
        headers.forEach((key, i) => { record[key] = coerceCell(row[i] ?? ''); });
        return record;
    });
}
