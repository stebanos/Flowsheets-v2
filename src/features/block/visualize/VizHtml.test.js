import { shallowMount } from '@vue/test-utils';
import { describe, test, expect } from 'vitest';
import VizHtml from './VizHtml.vue';

function getDecodedSrc(wrapper) {
    return decodeURIComponent(wrapper.find('iframe').attributes('src'));
}

describe('VizHtml — string value', () => {
    test('src contains the string value as-is', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: '<h1>Hello</h1>' } });
        expect(getDecodedSrc(wrapper)).toContain('<h1>Hello</h1>');
    });
});

describe('VizHtml — number value', () => {
    test('coerces number to string via JSON.stringify', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: 2 } });
        expect(getDecodedSrc(wrapper)).toContain('2');
    });
});

describe('VizHtml — array value', () => {
    test('coerces array to JSON string', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: [1, 2] } });
        expect(getDecodedSrc(wrapper)).toContain('[1,2]');
    });
});

describe('VizHtml — object value', () => {
    test('coerces object to JSON string', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: { a: 1 } } });
        expect(getDecodedSrc(wrapper)).toContain('{"a":1}');
    });
});

describe('VizHtml — null value', () => {
    test('coerces null to "null" string', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: null } });
        expect(getDecodedSrc(wrapper)).toContain('null');
    });
});

describe('VizHtml — error prop', () => {
    test('src contains the error text inside a red span', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: null, error: 'Something went wrong' } });
        const decoded = getDecodedSrc(wrapper);
        expect(decoded).toContain('Something went wrong');
        expect(decoded).toContain('color:red');
        expect(decoded).toContain('<span');
    });

    test('error takes precedence over value', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: 'should not show', error: 'oops' } });
        const decoded = getDecodedSrc(wrapper);
        expect(decoded).toContain('oops');
        expect(decoded).not.toContain('should not show');
    });
});

describe('VizHtml — iframe element', () => {
    test('iframe src uses the data URI scheme', () => {
        const wrapper = shallowMount(VizHtml, { props: { value: 'test' } });
        expect(wrapper.find('iframe').attributes('src')).toMatch(/^data:text\/html;charset=utf-8,/);
    });
});
