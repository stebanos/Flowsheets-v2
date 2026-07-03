import { csvToRecords, sanitizeToIdentifier, toCodeLiteral } from '@/shared/lib/data-import';
import { generateUniqueNameFromName } from '@/entities/block';

const GENERIC_ERROR = 'This file could not be imported. It may be empty or not valid CSV/JSON.';

function parseByExtension(filename, text) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv')) {
        const records = csvToRecords(text);
        if (records.length === 0) { return { error: GENERIC_ERROR }; }
        return { value: records };
    }
    if (lower.endsWith('.json')) {
        if (text.trim() === '') { return { error: GENERIC_ERROR }; }
        try {
            return { value: JSON.parse(text) };
        } catch {
            return { error: GENERIC_ERROR };
        }
    }
    return { error: 'Only .csv and .json files can be imported as data.' };
}

/**
 * Turn an imported data file into a block spec (pure — no store, no DOM).
 *
 * @param {{ filename: string, text: string, existingNames: string[] }} args
 * @returns {{ name: string, code: string, byteLength: number } | { error: string }}
 */
export function buildImportBlock({ filename, text, existingNames = [] }) {
    const parsed = parseByExtension(String(filename ?? ''), String(text ?? ''));
    if (parsed.error) { return { error: parsed.error }; }

    const code = toCodeLiteral(parsed.value);
    const name = generateUniqueNameFromName(sanitizeToIdentifier(filename), existingNames);
    const byteLength = new TextEncoder().encode(code).length;

    return { name, code, byteLength };
}
