import { shallowMount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import TableViz from './TableViz.vue';

describe('TableViz — error and empty states', () => {
    test('renders error message when error prop is set', () => {
        const wrapper = shallowMount(TableViz, { props: { error: 'boom' } });
        expect(wrapper.text()).toContain('boom');
        expect(wrapper.find('table').exists()).toBe(false);
    });

    test('shows "not an array" when value is not an array', () => {
        const wrapper = shallowMount(TableViz, { props: { value: 42 } });
        expect(wrapper.text()).toContain('not an array');
        expect(wrapper.find('table').exists()).toBe(false);
    });

    test('shows "not an array" for empty array', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [] } });
        expect(wrapper.text()).toContain('not an array');
    });

    test('shows "not an array" when value is null', () => {
        const wrapper = shallowMount(TableViz, { props: { value: null } });
        expect(wrapper.text()).toContain('not an array');
    });
});

describe('TableViz — array of objects', () => {
    test('renders a table', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ a: 1, b: 2 }] } });
        expect(wrapper.find('table').exists()).toBe(true);
    });

    test('uses object keys as column headers', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ name: 'Alice', age: 30 }] } });
        const headers = wrapper.findAll('th').map(th => th.text());
        expect(headers).toEqual(['name', 'age']);
    });

    test('renders cell values', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: 7, y: 8 }] } });
        const cells = wrapper.findAll('td').map(td => td.text());
        expect(cells).toEqual(['7', '8']);
    });

    test('renders multiple rows', () => {
        const wrapper = shallowMount(TableViz, {
            props: { value: [{ n: 1 }, { n: 2 }, { n: 3 }] }
        });
        expect(wrapper.findAll('tr')).toHaveLength(4); // 1 header + 3 body rows
    });

    test('missing key in later rows renders em dash', () => {
        const wrapper = shallowMount(TableViz, {
            props: { value: [{ a: 1, b: 2 }, { a: 3 }] }
        });
        const cells = wrapper.findAll('td').map(td => td.text());
        expect(cells[3]).toBe('—');
    });
});

describe('TableViz — array of arrays', () => {
    test('uses numeric indices as headers', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [[10, 20], [30, 40]] } });
        const headers = wrapper.findAll('th').map(th => th.text());
        expect(headers).toEqual(['0', '1']);
    });

    test('renders cell values', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [[1, 2], [3, 4]] } });
        const cells = wrapper.findAll('td').map(td => td.text());
        expect(cells).toEqual(['1', '2', '3', '4']);
    });

    test('handles ragged rows using max column count', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [[1], [2, 3, 4]] } });
        const headers = wrapper.findAll('th');
        expect(headers).toHaveLength(3);
        const cells = wrapper.findAll('td').map(td => td.text());
        expect(cells[1]).toBe('—'); // row 0, col 1 missing
        expect(cells[2]).toBe('—'); // row 0, col 2 missing
    });
});

describe('TableViz — array of primitives', () => {
    test('uses "value" as the single header', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [1, 2, 3] } });
        expect(wrapper.find('th').text()).toBe('value');
    });

    test('renders each primitive as a row', () => {
        const wrapper = shallowMount(TableViz, { props: { value: ['a', 'b', 'c'] } });
        const cells = wrapper.findAll('td').map(td => td.text());
        expect(cells).toEqual(['a', 'b', 'c']);
    });
});

describe('TableViz — renderCell formatting', () => {
    test('renders null as em dash', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: null }] } });
        expect(wrapper.find('td').text()).toBe('—');
    });

    test('renders undefined as em dash', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: undefined }] } });
        expect(wrapper.find('td').text()).toBe('—');
    });

    test('renders floats to 3 decimal places', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: 1.23456 }] } });
        expect(wrapper.find('td').text()).toBe('1.235');
    });

    test('renders integers without decimals', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: 42 }] } });
        expect(wrapper.find('td').text()).toBe('42');
    });

    test('renders nested object as JSON string', () => {
        const wrapper = shallowMount(TableViz, { props: { value: [{ x: { a: 1 } }] } });
        expect(wrapper.find('td').text()).toBe('{"a":1}');
    });
});
