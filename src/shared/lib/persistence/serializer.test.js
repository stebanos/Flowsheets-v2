import { deserializeBundle, deserializeSheet, deserializeVizes, serializeBundle, serializeSheet, serializeVizes } from './serializer';

const makeBlock = (overrides = {}) => ({
    id: 'block-1',
    name: 'myBlock',
    x: 150,
    y: 48,
    width: 300,
    editorHeight: 48,
    outputHeight: 72,
    code: '42',
    inputModes: {},
    visualizationType: 'default',
    vizOptions: {},
    ...overrides
});

describe('serializeSheet', () => {
    it('produces version: 1.1.0, correct name, correct block fields', () => {
        const blocks = [makeBlock()];
        const vizes = {};
        const result = serializeSheet(blocks, vizes, 'My Sheet');

        expect(result.version).toBe('1.1.0');
        expect(result.name).toBe('My Sheet');
        expect(result.blocks).toHaveLength(1);

        const b = result.blocks[0];
        expect(b.id).toBe('block-1');
        expect(b.name).toBe('myBlock');
        expect(b.x).toBe(150);
        expect(b.y).toBe(48);
        expect(b.width).toBe(300);
        expect(b.editorHeight).toBe(48);
        expect(b.outputHeight).toBe(72);
        expect(b.code).toBe('42');
        expect(b.inputModes).toEqual({});
        expect(b.visualizationType).toBe('default');
        expect(b.vizOptions).toEqual({});

        expect(b).not.toHaveProperty('height');
        expect(b).not.toHaveProperty('userMinWidth');
        expect(b).not.toHaveProperty('userMinEditorHeight');
        expect(b).not.toHaveProperty('userMinOutputHeight');
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
            Table: { hash: 'abc123', source: '<table/>', draft: '<draft/>' },
            Chart: { hash: 'def456', source: '<chart/>', draft: '<chart-draft/>' }
        };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes).toHaveProperty('Table');
        expect(result.customVizes.Table).toEqual({ hash: 'abc123', source: '<table/>' });
        expect(result.customVizes).not.toHaveProperty('Chart');
    });

    it('embeds hash field per viz alongside source', () => {
        const blocks = [makeBlock({ vizOptions: { customVizName: 'Table' } })];
        const vizes = { Table: { hash: 'myhash', source: '<table/>', draft: '<draft/>' } };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes.Table).toHaveProperty('hash', 'myhash');
        expect(result.customVizes.Table).toHaveProperty('source', '<table/>');
    });

    it('uses null for hash when viz has no hash field', () => {
        const blocks = [makeBlock({ vizOptions: { customVizName: 'Table' } })];
        const vizes = { Table: { source: '<table/>' } };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes.Table.hash).toBeNull();
    });

    it('strips draft from included vizes', () => {
        const blocks = [makeBlock({ vizOptions: { customVizName: 'Table' } })];
        const vizes = { Table: { hash: 'h1', source: '<table/>', draft: '<draft/>' } };

        const result = serializeSheet(blocks, vizes, 'Sheet');

        expect(result.customVizes.Table).not.toHaveProperty('draft');
    });

    it('includes view when provided', () => {
        const result = serializeSheet([makeBlock()], {}, 'Sheet', { panX: 100, panY: -50 });
        expect(result.view).toEqual({ panX: 100, panY: -50 });
    });

    it('omits view when not provided', () => {
        const result = serializeSheet([makeBlock()], {}, 'Sheet');
        expect(result).not.toHaveProperty('view');
    });
});

describe('deserializeSheet', () => {
    it('restores blocks with correct defaults for missing optional fields', () => {
        const json = {
            version: '1.1.0',
            name: 'Restored',
            blocks: [{ id: 'b1', name: 'foo', x: 0, y: 0, code: '1' }],
            customVizes: {}
        };

        const { blocks } = deserializeSheet(json);
        const b = blocks[0];

        expect(b.inputModes).toEqual({});
        expect(b.visualizationType).toBe('default');
        expect(b.vizOptions).toEqual({});
        expect(b.width).toBe(150);
        expect(b.editorHeight).toBe(48);
        expect(b.outputHeight).toBe(72);
    });

    it('preserves existing optional fields and does not override them', () => {
        const json = {
            version: '1.1.0',
            name: 'Sheet',
            blocks: [{
                id: 'b1',
                name: 'foo',
                x: 0,
                y: 0,
                code: '1',
                width: 200,
                editorHeight: 80,
                outputHeight: 96,
                inputModes: { bar: 'each' },
                visualizationType: 'html',
                vizOptions: { customVizName: 'Table' }
            }],
            customVizes: {}
        };

        const { blocks } = deserializeSheet(json);
        const b = blocks[0];

        expect(b.width).toBe(200);
        expect(b.editorHeight).toBe(80);
        expect(b.outputHeight).toBe(96);
        expect(b.inputModes).toEqual({ bar: 'each' });
        expect(b.visualizationType).toBe('html');
        expect(b.vizOptions).toEqual({ customVizName: 'Table' });
    });

    it('migrates old userMin* fields gracefully', () => {
        const json = {
            version: '1.1.0',
            name: 'OldSheet',
            blocks: [{
                id: 'b1',
                name: 'foo',
                x: 0,
                y: 0,
                code: '1',
                userMinWidth: 250,
                userMinEditorHeight: 100,
                userMinOutputHeight: 150
            }],
            customVizes: {}
        };

        const { blocks } = deserializeSheet(json);
        const b = blocks[0];

        expect(b.width).toBe(250);
        expect(b.editorHeight).toBe(100);
        expect(b.outputHeight).toBe(150);
        expect(b.userMinWidth).toBeUndefined();
        expect(b.userMinEditorHeight).toBeUndefined();
        expect(b.userMinOutputHeight).toBeUndefined();
    });

    it('with missing customVizes returns empty vizes object', () => {
        const json = { version: 2, name: 'Sheet', blocks: [] };
        const { vizes } = deserializeSheet(json);
        expect(vizes).toEqual({});
    });

    it('uses "Untitled" when name is missing', () => {
        const json = { version: 2, blocks: [] };
        const { name } = deserializeSheet(json);
        expect(name).toBe('Untitled');
    });

    it('returns customVizes as-is (including hash field)', () => {
        const json = {
            version: '1.1.0',
            name: 'Sheet',
            blocks: [],
            customVizes: { Table: { hash: 'myhash', source: '<table/>' } }
        };
        const { vizes } = deserializeSheet(json);
        expect(vizes).toEqual({ Table: { hash: 'myhash', source: '<table/>' } });
    });

    it('restores view from json', () => {
        const json = { version: 2, name: 'Sheet', blocks: [], view: { panX: 200, panY: -100 } };
        const { view } = deserializeSheet(json);
        expect(view).toEqual({ panX: 200, panY: -100 });
    });

    it('defaults view to { panX: 0, panY: 0 } when missing', () => {
        const json = { version: 2, name: 'Sheet', blocks: [] };
        const { view } = deserializeSheet(json);
        expect(view).toEqual({ panX: 0, panY: 0 });
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
                width: 200,
                editorHeight: 80,
                outputHeight: 96,
                visualizationType: 'html',
                vizOptions: { customVizName: 'Table' }
            })
        ];
        const vizes = {
            Table: { hash: 'tablehash', source: '<table/>', draft: '<draft/>' },
            Chart: { hash: 'charthash', source: '<chart/>', draft: '' }
        };

        const serialized = serializeSheet(blocks, vizes, 'Round Trip', { panX: 300, panY: 150 });
        const { blocks: restoredBlocks, vizes: restoredVizes, name, view } = deserializeSheet(serialized);

        expect(name).toBe('Round Trip');
        expect(restoredBlocks).toHaveLength(2);

        const b1 = restoredBlocks[0];
        expect(b1.id).toBe('b1');
        expect(b1.name).toBe('alpha');
        expect(b1.code).toBe('"hello"');
        expect(b1.width).toBe(300);

        const b2 = restoredBlocks[1];
        expect(b2.visualizationType).toBe('html');
        expect(b2.vizOptions).toEqual({ customVizName: 'Table' });
        expect(b2.width).toBe(200);
        expect(b2.editorHeight).toBe(80);
        expect(b2.outputHeight).toBe(96);

        expect(restoredVizes).toEqual({ Table: { hash: 'tablehash', source: '<table/>' } });
        expect(restoredVizes).not.toHaveProperty('Chart');
        expect(view).toEqual({ panX: 300, panY: 150 });
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
    it('produces formatVersion 1.1.0 and a rootSheetId', () => {
        const result = serializeBundle([], 'root-1');
        expect(result.formatVersion).toBe('1.1.0');
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

    it('strips height from block entries (delegates to serializeSheet)', () => {
        const entries = [{ id: 'a', name: 'A', blocks: [makeBlock()], vizes: {} }];
        const { sheets } = serializeBundle(entries, 'a');
        expect(sheets[0].blocks[0]).not.toHaveProperty('height');
    });

    it('hoists vizes to top-level vizLibrary; sheet entries have no customVizes', () => {
        const vizes = {
            Table: { hash: 'h1', source: '<table/>', draft: '' },
            Chart: { hash: 'h2', source: '<chart/>', draft: '' }
        };
        const entries = [
            { id: 'a', name: 'A', blocks: [makeBlock({ vizOptions: { customVizName: 'Table' } })], vizes }
        ];
        const result = serializeBundle(entries, 'a');
        expect(result.vizLibrary).toHaveProperty('Table');
        expect(result.vizLibrary).not.toHaveProperty('Chart');
        expect(result.sheets[0]).not.toHaveProperty('customVizes');
    });

    it('deduplicates vizes across sheets — first occurrence wins', () => {
        const vizesA = { Table: { hash: 'h1', source: '<table-a/>' } };
        const vizesB = { Table: { hash: 'h2', source: '<table-b/>' } };
        const entries = [
            { id: 'a', name: 'A', blocks: [makeBlock({ vizOptions: { customVizName: 'Table' } })], vizes: vizesA },
            { id: 'b', name: 'B', blocks: [makeBlock({ id: 'b1', vizOptions: { customVizName: 'Table' } })], vizes: vizesB }
        ];
        const { vizLibrary } = serializeBundle(entries, 'a');
        expect(vizLibrary.Table.source).toBe('<table-a/>');
    });

    it('handles missing blocks/vizes on an entry gracefully', () => {
        const entries = [{ id: 'a', name: 'A' }];
        const result = serializeBundle(entries, 'a');
        expect(result.sheets[0].blocks).toEqual([]);
        expect(result.vizLibrary).toEqual({});
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

    it('returns rootSheetId, sheets, and vizLibrary for a valid 1.0.0 bundle', () => {
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
        expect(result).toHaveProperty('vizLibrary');
    });

    it('reads 1.1.0 bundle with top-level vizLibrary', () => {
        const bundle = {
            formatVersion: '1.1.0',
            rootSheetId: 'sheet-1',
            vizLibrary: {
                Table: { hash: 'h1', source: '<table/>' }
            },
            sheets: [
                { id: 'sheet-1', name: 'Alpha', blocks: [makeBlock({ vizOptions: { customVizName: 'Table' } })] }
            ]
        };
        const result = deserializeBundle(bundle);
        expect(result.vizLibrary).toEqual({ Table: { hash: 'h1', source: '<table/>' } });
        expect(result.sheets[0].vizes).toEqual({ Table: { hash: 'h1', source: '<table/>' } });
    });

    it('reads 1.0.0 bundle and synthesises vizLibrary from per-sheet customVizes', () => {
        const bundle = {
            formatVersion: '1.0.0',
            rootSheetId: 'a',
            sheets: [
                { id: 'a', name: 'A', blocks: [], customVizes: { Table: { source: '<table/>' } } },
                { id: 'b', name: 'B', blocks: [], customVizes: { Chart: { source: '<chart/>' } } }
            ]
        };
        const result = deserializeBundle(bundle);
        expect(result.vizLibrary).toHaveProperty('Table');
        expect(result.vizLibrary).toHaveProperty('Chart');
    });

    it('1.0.0 bundle vizLibrary deduplicates — first occurrence wins', () => {
        const bundle = {
            formatVersion: '1.0.0',
            rootSheetId: 'a',
            sheets: [
                { id: 'a', name: 'A', blocks: [], customVizes: { Table: { source: '<table-a/>' } } },
                { id: 'b', name: 'B', blocks: [], customVizes: { Table: { source: '<table-b/>' } } }
            ]
        };
        const { vizLibrary } = deserializeBundle(bundle);
        expect(vizLibrary.Table.source).toBe('<table-a/>');
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
        expect(block.width).toBe(150);
        expect(block.editorHeight).toBe(48);
        expect(block.outputHeight).toBe(72);
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
        const vizes = { Table: { hash: 'tablehash', source: '<table/>', draft: '<d/>' } };
        const entries = [
            { id: 'sheet-a', name: 'Sheet A', blocks, vizes },
            { id: 'sheet-b', name: 'Sheet B', blocks: [], vizes: {} }
        ];

        const bundle = serializeBundle(entries, 'sheet-a');
        const { rootSheetId, sheets, vizLibrary } = deserializeBundle(bundle);

        expect(rootSheetId).toBe('sheet-a');
        expect(sheets).toHaveLength(2);

        const a = sheets[0];
        expect(a.id).toBe('sheet-a');
        expect(a.name).toBe('Sheet A');
        expect(a.blocks[0].name).toBe('foo');
        expect(a.blocks[0].code).toBe('42');
        expect(a.vizes).toEqual({ Table: { hash: 'tablehash', source: '<table/>' } });

        const b = sheets[1];
        expect(b.id).toBe('sheet-b');
        expect(b.blocks).toHaveLength(0);

        expect(vizLibrary).toEqual({ Table: { hash: 'tablehash', source: '<table/>' } });
    });
});
