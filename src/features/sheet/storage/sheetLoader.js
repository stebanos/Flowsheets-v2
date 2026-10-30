import { deserializeSheet, migrate } from '@/entities/sheet';

function _isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Reads a sheet through the strategy, normalises the stored envelope, migrates it to
// the current version and deserialises it. Throws on any failure; the caller decides
// what a failed load means for the session.
export async function readSheetData(strategy, id) {
    const raw = await strategy.readSheet(id);
    const envelope = {
        version:     raw.version     ?? 1,
        blocks:      raw.blocks      ?? [],
        customVizes: _isPlainObject(raw.customVizes) ? raw.customVizes : {},
        view:        raw.view        ?? {},
        notes:       raw.notes       ?? []
    };
    const data = await migrate(envelope);
    return deserializeSheet(data);
}
