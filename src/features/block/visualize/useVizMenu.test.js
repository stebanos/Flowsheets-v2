import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';

const mockUpdateBlock = vi.fn();
const mockCustomVizes = reactive({});

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock: mockUpdateBlock })
}));

vi.mock('./useCustomViz', () => ({
    useCustomViz: () => ({ customVizes: mockCustomVizes })
}));

vi.mock('./viz-types', () => ({
    VIZ_TYPES: {
        default: { label: 'Default', component: {} },
        html: { label: 'HTML', component: {} },
        json: { label: 'JSON', component: {} },
        'text-diff': { label: 'Text diff', component: {} },
        custom: { label: 'Custom', component: {} }
    }
}));

const { useVizMenu } = await import('./useVizMenu');

function makeBlock(overrides = {}) {
    return reactive({
        id: 'block-1',
        visualizationType: 'default',
        vizOptions: {},
        ...overrides
    });
}

beforeEach(() => {
    mockUpdateBlock.mockClear();
    for (const key of Object.keys(mockCustomVizes)) {
        delete mockCustomVizes[key];
    }
});

describe('vizMenuItems — built-in types', () => {
    test('built-in types (excluding custom) appear as menu items', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const labels = vizMenuItems.value.map(i => i.label).filter(Boolean);
        expect(labels).toContain('Default');
        expect(labels).toContain('HTML');
        expect(labels).toContain('JSON');
        expect(labels).toContain('Text diff');
        expect(labels).not.toContain('Custom');
    });

    test('active built-in type gets a checkmark prefix', () => {
        const block = makeBlock({ visualizationType: 'html' });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const htmlItem = vizMenuItems.value.find(i => i.label?.includes('HTML'));
        expect(htmlItem.label).toBe('✔ HTML');
    });

    test('inactive built-in types do not get a checkmark', () => {
        const block = makeBlock({ visualizationType: 'html' });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const defaultItem = vizMenuItems.value.find(i => i.label === 'Default');
        expect(defaultItem).toBeTruthy();
    });

    test('selecting a built-in type calls updateBlock with the type key', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const htmlItem = vizMenuItems.value.find(i => i.label === 'HTML');
        htmlItem.command();
        expect(mockUpdateBlock).toHaveBeenCalledWith('block-1', { visualizationType: 'html' });
    });
});

describe('vizMenuItems — no custom vizes', () => {
    test('no separator when there are no custom vizes', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const hasSeparator = vizMenuItems.value.some(i => i.separator);
        expect(hasSeparator).toBe(false);
    });
});

describe('vizMenuItems — with custom vizes', () => {
    beforeEach(() => {
        mockCustomVizes['MyChart'] = { source: null };
        mockCustomVizes['MyTable'] = { source: null };
    });

    test('a separator appears before the custom viz list', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const hasSeparator = vizMenuItems.value.some(i => i.separator);
        expect(hasSeparator).toBe(true);
    });

    test('custom viz names appear as menu items', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const labels = vizMenuItems.value.map(i => i.label).filter(Boolean);
        expect(labels).toContain('MyChart');
        expect(labels).toContain('MyTable');
    });

    test('active custom viz gets a checkmark prefix', () => {
        const block = makeBlock({
            visualizationType: 'custom',
            vizOptions: { customVizName: 'MyChart' }
        });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const item = vizMenuItems.value.find(i => i.label?.includes('MyChart'));
        expect(item.label).toBe('✔ MyChart');
    });

    test('inactive custom viz does not get a checkmark', () => {
        const block = makeBlock({
            visualizationType: 'custom',
            vizOptions: { customVizName: 'MyChart' }
        });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const item = vizMenuItems.value.find(i => i.label === 'MyTable');
        expect(item).toBeTruthy();
    });

    test('selecting a custom viz calls updateBlock with type=custom and the viz name', () => {
        const block = makeBlock();
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const item = vizMenuItems.value.find(i => i.label === 'MyChart');
        item.command();
        expect(mockUpdateBlock).toHaveBeenCalledWith('block-1', {
            visualizationType: 'custom',
            vizOptions: expect.objectContaining({ customVizName: 'MyChart' })
        });
    });
});

describe('vizMenuItems — Edit viz code item', () => {
    beforeEach(() => {
        mockCustomVizes['MyChart'] = { source: null };
    });

    test('"Edit viz code…" appears when current type is custom', () => {
        const block = makeBlock({
            visualizationType: 'custom',
            vizOptions: { customVizName: 'MyChart' }
        });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const editItem = vizMenuItems.value.find(i => i.label === 'Edit viz code…');
        expect(editItem).toBeTruthy();
    });

    test('"Edit viz code…" is absent when current type is not custom', () => {
        const block = makeBlock({ visualizationType: 'default' });
        const { vizMenuItems } = useVizMenu(block, vi.fn());
        const editItem = vizMenuItems.value.find(i => i.label === 'Edit viz code…');
        expect(editItem).toBeUndefined();
    });

    test('"Edit viz code…" calls onEditViz with the current viz name', () => {
        const onEditViz = vi.fn();
        const block = makeBlock({
            visualizationType: 'custom',
            vizOptions: { customVizName: 'MyChart' }
        });
        const { vizMenuItems } = useVizMenu(block, onEditViz);
        const editItem = vizMenuItems.value.find(i => i.label === 'Edit viz code…');
        editItem.command();
        expect(onEditViz).toHaveBeenCalledWith('MyChart');
    });
});

describe('currentVizLabel', () => {
    test('shows built-in type label for default', () => {
        const block = makeBlock({ visualizationType: 'default' });
        const { currentVizLabel } = useVizMenu(block, vi.fn());
        expect(currentVizLabel.value).toBe('Default');
    });

    test('shows the custom viz name when type is custom', () => {
        const block = makeBlock({
            visualizationType: 'custom',
            vizOptions: { customVizName: 'MyChart' }
        });
        const { currentVizLabel } = useVizMenu(block, vi.fn());
        expect(currentVizLabel.value).toBe('MyChart');
    });
});
