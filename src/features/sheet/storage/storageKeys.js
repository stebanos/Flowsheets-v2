// localStorage keys. The v2 prefix is the storage schema generation; bump it only with a migration.
export const STORAGE_PREFIX = 'flowsheets.v2';
export const KEY_ACTIVE_ID = `${STORAGE_PREFIX}.activeSheetId`;
export const KEY_OPEN_IDS  = `${STORAGE_PREFIX}.openSheetIds`;
export const KEY_CATALOGUE = `${STORAGE_PREFIX}.catalogue`;
export const KEY_SHEET     = (id) => `${STORAGE_PREFIX}.sheet.${id}`;
