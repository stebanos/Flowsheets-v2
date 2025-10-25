const hasRandomUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

function generateRandomId() {
    return hasRandomUUID
        ? crypto.randomUUID()
        : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateUniqueId(existingIds) {
    let id = generateRandomId();

    while (existingIds.some(value => value === id)) {
        id = generateRandomId();
    }

    return id;
}
