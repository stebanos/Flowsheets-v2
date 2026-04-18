import { shallowMount } from '@vue/test-utils';
import { describe, test, expect, vi } from 'vitest';
import VizTextDiff from './VizTextDiff.vue';

vi.mock('@/entities/block', () => ({
    useBlockStore: () => ({ updateBlock: vi.fn() })
}));

function mount(thisValue, compareVal) {
    const getEvaluation = () => ({ value: compareVal, error: null });
    return shallowMount(VizTextDiff, {
        props: {
            value: thisValue,
            error: null,
            block: { id: '1', vizOptions: { compareBlock: 'other' } },
            isList: Array.isArray(thisValue),
            outputItems: [],
            getEvaluation
        }
    });
}

describe('VizTextDiff — compact stringify (arrays/objects are single-line)', () => {
    test('array value produces compact JSON, not pretty-printed multi-line', () => {
        // [23] must stringify to "[23]" (1 line), not "[\n  23\n]" (3 lines)
        const wrapper = mount([23], 23);
        const rows = wrapper.findAll('.flex.min-h-\\[1\\.4em\\]');
        // 1 del + 1 add = 2 rows; pretty-print would give 1 del + 3 adds = 4 rows
        expect(rows).toHaveLength(2);
        // The del row should show "[23]" as its content, not "["
        const delRow = rows.find(r => r.classes('bg-red-50'));
        expect(delRow.text()).toContain('[23]');
    });

    test('numeric value on both sides → single eq row, no del/add rows', () => {
        const wrapper = mount(23, 23);
        expect(wrapper.findAll('.bg-red-50')).toHaveLength(0);
        expect(wrapper.findAll('.bg-green-50')).toHaveLength(0);
        // One eq row rendered
        expect(wrapper.findAll('.flex.min-h-\\[1\\.4em\\]')).toHaveLength(1);
    });

    test('number vs array → 2 diff rows (1 del + 1 add), char-level spans applied', () => {
        // "23" vs "[23]" — equal counts (1:1) → char-level diff
        const wrapper = mount(23, [23]);
        const rows = wrapper.findAll('.flex.min-h-\\[1\\.4em\\]');
        expect(rows).toHaveLength(2);
        const addRow = rows.find(r => r.classes('bg-green-50'));
        expect(addRow.text()).toContain('[23]');
    });

    test('object value produces compact JSON', () => {
        // {a:1} must stringify to '{"a":1}' (1 line)
        const wrapper = mount({ a: 1 }, { a: 2 });
        const rows = wrapper.findAll('.flex.min-h-\\[1\\.4em\\]');
        // 1 del + 1 add = 2 rows
        expect(rows).toHaveLength(2);
        const delRow = rows.find(r => r.classes('bg-red-50'));
        expect(delRow.text()).toContain('{"a":1}');
    });
});
