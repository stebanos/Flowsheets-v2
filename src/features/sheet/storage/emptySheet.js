// The on-disk shape of a sheet that has no content yet. Both storage strategies
// return it for a missing sheet and write it from `initSheet`, so the consumer
// always sees `customVizes` as an object (see the strategy contract in useSheetStorage.js).
export function emptySheet() {
    return { blocks: [], customVizes: {} };
}
