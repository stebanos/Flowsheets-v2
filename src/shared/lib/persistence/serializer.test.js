import { serializeSheet, deserializeSheet, serializeVizes, deserializeVizes, serializeBundle, deserializeBundle } from './serializer';

const makeBlock = (overrides = {}) => ({
    id: 'block-1',
    name: 'myBlock',
    x: 150,
    y: 48,
    width: 300,
    height: 120,
    code: '42',
    inputModes: {},
    visualizationType: 'default',
    vizOptions: {},
    userMinWidth: null,
    userMinEditorHeight: null,
    ...overrides
});

describe('serializeSheet', () => {
    it('produces version: 1, correct name, correct block fields, no width/height', () => {
        const blocks = [makeBlock()];
        const vizes = {};
        const result = serializeSheet(blocks, vizes, 'My Sheet');

        expect(result.version).toBe(1);
        expect(result.name).toBe('My Sheet');
        expect(result.blocks).toHaveLength(1);

        const b = result.blocks[0];
        expect(b.id).toBe('block-1');
        expect(b.name).toBe('myBlock');
        expect(b.x).toBe(150);
        expect(b.y).toBe(48);
        expect(b.code).toBe('42');
        expect(b.inputModes).toEqual({});
        expect(b.visualizationType).toBe('default');
        expect(b.vizOptions).toEqual({});
        expect(b.userMinWidth).toBeNull();
        expect(b.userMinEditorHeight).toBeNull();

        expect(b).not.toHaveProperty('width');
        expect(b).not.toHaveProperty('height');
    });

    it('with no vizes produces customVizes: {}', () => {
        const result = serializeSheet([makeBlock()], {}, 'Sheet');
        expect(result.customVizes).toEqual({});
    });

    it('only includes vizes referenced by blocks, not all vizes', () => {
        const blocks = [
            makeBlock({ vizOptions: { customVizName: 'Table' } }),
            makeBlock({ id: 'block-2', name: 'other', vizOptions: {} })
        ];
        const vizes = {
            Table: { source: '<table/>', draft: '<draft/>' },
            Chart: { source: '<chart/>', draft: '<chart-draft/>' }
        };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes).toHaveProperty('Table');
        expect(result.customVizes.Table).toEqual({ source: '<table/>' });
        expect(result.customVizes).not.toHaveProperty('Chart');
    });

    it('strips draft from included vizes', () => {
        const blocks = [makeBlock({ vizOptions: { customVizName: 'Table' } })];
        const vizes = { Table: { source: '<table/>', draft: '<draft/>' } };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes.Table).toEqual({ source: '<table/>' });
        expect(result.customVizes.Table).not.toHaveProperty('draft');
    });
});

describe('deserializeSheet', () => {
    it('restores blocks with correct defaults for missing optional fields', () => {
        const json = {
            version: 1,
            name: 'Restored',
            blocks: [{ id: 'b1', name: 'foo', x: 0, y: 0, code: '1' }],
            customVizes: {}
        };

        const { blocks } = deserializeSheet(json);
        const b = blocks[0];

        expect(b.inputModes).toEqual({});
        expect(b.visualizationType).toBe('default');
        expect(b.vizOptions).toEqual({});
        expect(b.userMinWidth).toBeNull();
        expect(b.userMinEditorHeight).toBeNull();
    });

    it('preserves existing optional fields and does not override them', () => {
        const json = {
            version: 1,
            name: 'Sheet',
            blocks: [{
                id: 'b1',
                name: 'foo',
                x: 0,
                y: 0,
                code: '1',
                inputModes: { bar: 'each' },
                visualizationType: 'html',
                vizOptions: { customVizName: 'Table' },
                userMinWidth: 200,
                userMinEditorHeight: 80
            }],
            customVizes: {}
        };

        const { blocks } = deserializeSheet(json);
        const b = blocks[0];

        expect(b.inputModes).toEqual({ bar: 'each' });
        expect(b.visualizationType).toBe('html');
        expect(b.vizOptions).toEqual({ customVizName: 'Table' });
        expect(b.userMinWidth).toBe(200);
        expect(b.userMinEditorHeight).toBe(80);
    });

    it('with missing customVizes returns empty vizes object', () => {
        const json = { version: 1, name: 'Sheet', blocks: [] };
        const { vizes } = deserializeSheet(json);
        expect(vizes).toEqual({});
    });

    it('uses "Untitled" when name is missing', () => {
        const json = { version: 1, blocks: [] };
        const { name } = deserializeSheet(json);
        expect(name).toBe('Untitled');
    });

    it('returns customVizes as-is', () => {
        const json = {
            version: 1,
            name: 'Sheet',
            blocks: [],
            customVizes: { Table: { source: '<table/>' } }
        };
        const { vizes } = deserializeSheet(json);
        expect(vizes).toEqual({ Table: { source: '<table/>' } });
    });
});

describe('round-trip', () => {
    it('deserializeSheet(serializeSheet(...)) restores equivalent data', () => {
        const blocks = [
            makeBlock({ id: 'b1', name: 'alpha', x: 150, y: 48, code: '"hello"' }),
            makeBlock({
                id: 'b2',
                name: 'beta',
                x: 300,
                y: 96,
                code: 'alpha',
                visualizationType: 'html',
                vizOptions: { customVizName: 'Table' },
                userMinWidth: 200,
                userMinEditorHeight: 100
            })
        ];
        const vizes = {
            Table: { source: '<table/>', draft: '<draft/>' },
            Chart: { source: '<chart/>', draft: '' }
        };

        const serialized = serializeSheet(blocks, vizes, 'Round Trip');
        const { blocks: restoredBlocks, vizes: restoredVizes, name } = deserializeSheet(serialized);

        expect(name).toBe('Round Trip');
        expect(restoredBlocks).toHaveLength(2);

        const b1 = restoredBlocks[0];
        expect(b1.id).toBe('b1');
        expect(b1.name).toBe('alpha');
        expect(b1.code).toBe('"hello"');
        expect(b1.userMinWidth).toBeNull();

        const b2 = restoredBlocks[1];
        expect(b2.visualizationType).toBe('html');
        expect(b2.vizOptions).toEqual({ customVizName: 'Table' });
        expect(b2.userMinWidth).toBe(200);
        expect(b2.userMinEditorHeight).toBe(100);

        expect(restoredVizes).toEqual({ Table: { source: '<table/>' } });
        expect(restoredVizes).not.toHaveProperty('Chart');
    });
});

describe('serializeVizes / deserializeVizes round-trip', () => {
    it('serializes with version: 1 and strips draft', () => {
        const vizes = {
            Table: { source: '<table/>', draft: '<draft/>' },
            Chart: { source: '<chart/>', draft: '' }
        };

        const result = serializeVizes(vizes);

        expect(result.version).toBe(1);
        expect(result.customVizes.Table).toEqual({ source: '<table/>' });
        expect(result.customVizes.Chart).toEqual({ source: '<chart/>' });
        expect(result.customVizes.Table).not.toHaveProperty('draft');
    });

    it('deserializes back to the source-only map', () => {
        const vizes = {
            Table: { source: '<table/>', draft: '<d/>' }
        };

        const serialized = serializeVizes(vizes);
        const restored = deserializeVizes(serialized);

        expect(restored).toEqual({ Table: { source: '<table/>' } });
    });

    it('deserializeVizes returns empty object when customVizes is missing', () => {
        expect(deserializeVizes({})).toEqual({});
    });
});

// ── serializeBundle ───────────────────────────────────────────────────────────

describe('serializeBundle', () => {
    it('produces formatVersion 1.0.0 and a rootSheetId', () => {
        const result = serializeBundle([], 'root-1');
        expect(result.formatVersion).toBe('1.0.0');
        expect(result.rootSheetId).toBe('root-1');
    });

    it('includes an exportedAt ISO timestamp', () => {
        const result = serializeBundle([], 'root-1');
        expect(() => new Date(result.exportedAt)).not.toThrow();
        expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
    });

    it('serializes each sheet entry via serializeSheet', () => {
        const entries = [
            { id: 'a', name: 'Alpha', blocks: [makeBlock({ id: 'b1', name: 'x', code: '1' })], vizes: {} },
            { id: 'b', name: 'Beta', blocks: [], vizes: {} }
        ];
        const result = serializeBundle(entries, 'a');

        expect(result.sheets).toHaveLength(2);
        expect(result.sheets[0].id).toBe('a');
        expect(result.sheets[0].name).toBe('Alpha');
        expect(result.sheets[0].blocks).toHaveLength(1);
        expect(result.sheets[1].id).toBe('b');
        expect(result.sheets[1].blocks).toHaveLength(0);
    });

    it('strips width/height from block entries (delegates to serializeSheet)', () => {
        const entries = [{ id: 'a', name: 'A', blocks: [makeBlock()], vizes: {} }];
        const { sheets } = serializeBundle(entries, 'a');
        expect(sheets[0].blocks[0]).not.toHaveProperty('width');
        expect(sheets[0].blocks[0]).not.toHaveProperty('height');
    });

    it('only includes vizes referenced by blocks in each sheet', () => {
        const vizes = {
            Table: { source: '<table/>', draft: '' },
            Chart: { source: '<chart/>', draft: '' }
        };
        const entries = [
            { id: 'a', name: 'A', blocks: [makeBlock({ vizOptions: { customVizName: 'Table' } })], vizes }
        ];
        const { sheets } = serializeBundle(entries, 'a');
        expect(sheets[0].customVizes).toHaveProperty('Table');
        expect(sheets[0].customVizes).not.toHaveProperty('Chart');
    });

    it('handles missing blocks/vizes on an entry gracefully', () => {
        const entries = [{ id: 'a', name: 'A' }];
        const result = serializeBundle(entries, 'a');
        expect(result.sheets[0].blocks).toEqual([]);
        expect(result.sheets[0].customVizes).toEqual({});
    });
});

// ── deserializeBundle ─────────────────────────────────────────────────────────

describe('deserializeBundle', () => {
    it('throws when formatVersion is missing', () => {
        expect(() => deserializeBundle({ sheets: [] })).toThrow('formatVersion is missing');
    });

    it('throws when formatVersion is unrecognised', () => {
        expect(() => deserializeBundle({ formatVersion: '9.9.9', sheets: [] }))
            .toThrow('Unsupported bundle version: 9.9.9');
    });

    it('returns rootSheetId and sheets for a valid bundle', () => {
        const bundle = {
            formatVersion: '1.0.0',
            rootSheetId: 'sheet-1',
            sheets: [
                { id: 'sheet-1', name: 'Alpha', blocks: [], customVizes: {} }
            ]
        };
        const result = deserializeBundle(bundle);
        expect(result.rootSheetId).toBe('sheet-1');
        expect(result.sheets).toHaveLength(1);
        expect(result.sheets[0].id).toBe('sheet-1');
        expect(result.sheets[0].name).toBe('Alpha');
    });

    it('applies block field defaults via deserializeSheet', () => {
        const bundle = {
            formatVersion: '1.0.0',
            rootSheetId: 'a',
            sheets: [
                { id: 'a', name: 'A', blocks: [{ id: 'b1', name: 'x', x: 0, y: 0, code: '1' }], customVizes: {} }
            ]
        };
        const { sheets } = deserializeBundle(bundle);
        const block = sheets[0].blocks[0];
        expect(block.inputModes).toEqual({});
        expect(block.visualizationType).toBe('default');
        expect(block.vizOptions).toEqual({});
        expect(block.userMinWidth).toBeNull();
    });

    it('handles missing sheets array gracefully', () => {
        const result = deserializeBundle({ formatVersion: '1.0.0', rootSheetId: 'x' });
        expect(result.sheets).toEqual([]);
    });
});

// ── serializeBundle / deserializeBundle round-trip ────────────────────────────

describe('bundle round-trip', () => {
    it('deserializeBundle(serializeBundle(...)) restores all sheets faithfully', () => {
        const blocks = [makeBlock({ id: 'b1', name: 'foo', code: '42', vizOptions: { customVizName: 'Table' } })];
        const vizes = { Table: { source: '<table/>', draft: '<d/>' } };
        const entries = [
            { id: 'sheet-a', name: 'Sheet A', blocks, vizes },
            { id: 'sheet-b', name: 'Sheet B', blocks: [], vizes: {} }
        ];

        const bundle = serializeBundle(entries, 'sheet-a');
        const { rootSheetId, sheets } = deserializeBundle(bundle);

        expect(rootSheetId).toBe('sheet-a');
        expect(sheets).toHaveLength(2);

        const a = sheets[0];
        expect(a.id).toBe('sheet-a');
        expect(a.name).toBe('Sheet A');
        expect(a.blocks[0].name).toBe('foo');
        expect(a.blocks[0].code).toBe('42');
        expect(a.vizes).toEqual({ Table: { source: '<table/>' } });

        const b = sheets[1];
        expect(b.id).toBe('sheet-b');
        expect(b.blocks).toHaveLength(0);
    });
});
