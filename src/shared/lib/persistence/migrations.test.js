import { migrate } from './migrations';

describe('migrate', () => {
    it('returns the object unchanged for version 1', () => {
        const json = { version: 1, name: 'Sheet', blocks: [] };
        const result = migrate(json);
        expect(result).toBe(json);
    });

    it('throws with "newer version" message for version 2', () => {
        expect(() => migrate({ version: 2, blocks: [] })).toThrow(
            'This file was created by a newer version of Flowsheets (version 2). Please update the app.'
        );
    });

    it('throws for any version higher than current', () => {
        expect(() => migrate({ version: 99 })).toThrow(
            'This file was created by a newer version of Flowsheets (version 99). Please update the app.'
        );
    });

    it('throws with "missing version" message when version field is absent', () => {
        expect(() => migrate({ name: 'Sheet', blocks: [] })).toThrow(
            'Invalid file: missing version field'
        );
    });

    it('throws with "missing version" message for a string version', () => {
        expect(() => migrate({ version: 'foo' })).toThrow(
            'Invalid file: missing version field'
        );
    });

    it('throws with "missing version" message for null version', () => {
        expect(() => migrate({ version: null })).toThrow(
            'Invalid file: missing version field'
        );
    });
});
