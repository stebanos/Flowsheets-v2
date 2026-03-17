const CURRENT_VERSION = 1;

/**
 * Apply version migrations to a raw parsed JSON object.
 * Throws if the version is unknown (higher than current).
 * Returns the migrated object (may be the same reference for v1).
 * @param {Object} json
 * @returns {Object}
 */
export function migrate(json) {
    if (typeof json.version !== 'number') {
        throw new Error('Invalid file: missing version field');
    }

    if (json.version > CURRENT_VERSION) {
        throw new Error(
            `This file was created by a newer version of Flowsheets (version ${json.version}). Please update the app.`
        );
    }

    if (json.version === 1) {
        return json;
    }

    return json;
}
