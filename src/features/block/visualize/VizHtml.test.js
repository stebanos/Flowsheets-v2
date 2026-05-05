import { shallowMount, flushPromises } from '@vue/test-utils';
import { describe, test, expect } from 'vitest';
import VizHtml from './VizHtml.vue';

async function mountVizHtml(props) {
    const wrapper = shallowMount(VizHtml, { props });
    await flushPromises();
    return wrapper;
}

function getDecodedSrc(wrapper) {
    return decodeURIComponent(wrapper.find('iframe').attributes('src'));
}

describe('VizHtml — string value', () => {
    test('src contains the string value as-is', async () => {
        const wrapper = await mountVizHtml({ value: '<h1>Hello</h1>' });
        expect(getDecodedSrc(wrapper)).toContain('<h1>Hello</h1>');
    });
});

describe('VizHtml — number value', () => {
    test('coerces number to string via JSON.stringify', async () => {
        const wrapper = await mountVizHtml({ value: 2 });
        expect(getDecodedSrc(wrapper)).toContain('2');
    });
});

describe('VizHtml — array value', () => {
    test('coerces array to JSON string', async () => {
        const wrapper = await mountVizHtml({ value: [1, 2] });
        expect(getDecodedSrc(wrapper)).toContain('[1,2]');
    });
});

describe('VizHtml — object value', () => {
    test('coerces object to JSON string', async () => {
        const wrapper = await mountVizHtml({ value: { a: 1 } });
        expect(getDecodedSrc(wrapper)).toContain('{"a":1}');
    });
});

describe('VizHtml — null value', () => {
    test('shows spinner instead of iframe', async () => {
        const wrapper = await mountVizHtml({ value: null });
        expect(wrapper.find('iframe').exists()).toBe(false);
        expect(wrapper.find('svg').exists()).toBe(true);
    });
});

describe('VizHtml — error prop', () => {
    test('src contains the error text inside a red span', async () => {
        const wrapper = await mountVizHtml({ value: null, error: 'Something went wrong' });
        const decoded = getDecodedSrc(wrapper);
        expect(decoded).toContain('Something went wrong');
        expect(decoded).toContain('color:red');
        expect(decoded).toContain('<span');
    });

    test('error takes precedence over value', async () => {
        const wrapper = await mountVizHtml({ value: 'should not show', error: 'oops' });
        const decoded = getDecodedSrc(wrapper);
        expect(decoded).toContain('oops');
        expect(decoded).not.toContain('should not show');
    });
});

describe('VizHtml — iframe element', () => {
    test('iframe src uses the data URI scheme', async () => {
        const wrapper = await mountVizHtml({ value: 'test' });
        expect(wrapper.find('iframe').attributes('src')).toMatch(/^data:text\/html;charset=utf-8,/);
    });
});
