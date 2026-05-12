import { getHash } from '@/shared/lib/hash';
import { migrate } from './migrations';

describe('migrate', () => {
    it('migrates version 1 to version 1.2.0, returning new object', async () => {
        const json = { version: 1, name: 'Sheet', blocks: [], customVizes: {} };
        const result = await migrate(json);
        expect(result.version).toBe('1.2.0');
        expect(result).not.toBe(json);
    });

    it('v1 with no customVizes produces empty customVizes on v1.2.0', async () => {
        const json = { version: 1, name: 'Sheet', blocks: [] };
        const result = await migrate(json);
        expect(result.version).toBe('1.2.0');
        expect(result.customVizes).toEqual({});
    });

    it('v1 customVizes entries gain hash fields matching source content', async () => {
        const source = { template: '<div/>', script: '', style: '' };
        const json = {
            version: 1,
            name: 'Sheet',
            blocks: [],
            customVizes: { Table: { source } }
        };
        const result = await migrate(json);
        const expectedHash = await getHash(source);
        expect(result.customVizes.Table.hash).toBe(expectedHash);
        expect(result.customVizes.Table.source).toBe(source);
    });

    it('v1 entry with null source gets null hash', async () => {
        const json = {
            version: 1,
            name: 'Sheet',
            blocks: [],
            customVizes: { Empty: { source: null } }
        };
        const result = await migrate(json);
        expect(result.customVizes.Empty.hash).toBeNull();
    });

    it('v1.1.0 sheet migrates to v1.2.0', async () => {
        const json = { version: '1.1.0', name: 'Sheet', blocks: [], customVizes: {} };
        const result = await migrate(json);
        expect(result.version).toBe('1.2.0');
        expect(result.notes).toEqual([]);
    });

    it('v1.2.0 sheet passes through unchanged (same reference)', async () => {
        const json = { version: '1.2.0', name: 'Sheet', blocks: [], customVizes: {}, notes: [] };
        const result = await migrate(json);
        expect(result).toBe(json);
    });

    it('throws with "newer version" message for version 3', async () => {
        await expect(migrate({ version: 3, blocks: [] })).rejects.toThrow(
            'This file was created by a newer version of Flowsheets (version 3). Please update the app.'
        );
    });

    it('throws for any unrecognised integer version', async () => {
        await expect(migrate({ version: 99 })).rejects.toThrow(
            'This file was created by a newer version of Flowsheets (version 99). Please update the app.'
        );
    });

    it('throws with "missing version" message when version field is absent', async () => {
        await expect(migrate({ name: 'Sheet', blocks: [] })).rejects.toThrow(
            'Invalid file: missing version field'
        );
    });

    it('throws with "newer version" message for an unrecognised string version', async () => {
        await expect(migrate({ version: 'foo' })).rejects.toThrow(
            'This file was created by a newer version of Flowsheets (version foo). Please update the app.'
        );
    });

    it('throws with "missing version" message for null version', async () => {
        await expect(migrate({ version: null })).rejects.toThrow(
            'Invalid file: missing version field'
        );
    });
});
