import { getHash } from '@/shared/lib/hash';

const CURRENT_VERSION = '1.1.0';

/**
 * Apply version migrations to a raw parsed JSON object.
 * Throws if the version is unknown or unrecognised.
 * Returns a Promise resolving to the migrated object.
 * @param {Object} json
 * @returns {Promise<Object>}
 */
export async function migrate(json) {
    const version = json.version;

    if (version == null) {
        throw new Error('Invalid file: missing version field');
    }

    if (version === 1) {
        const customVizes = {};
        for (const [name, entry] of Object.entries(json.customVizes ?? {})) {
            const hash = entry.source ? await getHash(entry.source) : null;
            customVizes[name] = { ...entry, hash };
        }
        return { ...json, version: '1.1.0', customVizes };
    }

    if (version === CURRENT_VERSION) {
        return json;
    }

    throw new Error(
        `This file was created by a newer version of Flowsheets (version ${version}). Please update the app.`
    );
}
