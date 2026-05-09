import { describe, expect, test } from 'vitest';
import { createBlock } from './block';

const BASE = { id: '1', name: 'a', x: 0, y: 0, width: 2, height: 2 };

describe('createBlock — required fields', () => {
    test('id, name, x, y, width, height are preserved as-is', () => {
        const b = createBlock({ id: 'abc', name: 'myBlock', x: 10, y: 20, width: 4, height: 3 });
        expect(b.id).toBe('abc');
        expect(b.name).toBe('myBlock');
        expect(b.x).toBe(10);
        expect(b.y).toBe(20);
        expect(b.width).toBe(4);
        expect(b.height).toBe(3);
    });
});

describe('createBlock — defaults', () => {
    test('code defaults to empty string', () => {
        expect(createBlock(BASE).code).toBe('');
    });

    test('visualizationType defaults to "default"', () => {
        expect(createBlock(BASE).visualizationType).toBe('default');
    });

    test('vizOptions defaults to empty object', () => {
        expect(createBlock(BASE).vizOptions).toEqual({});
    });

    test('inputModes defaults to empty object', () => {
        expect(createBlock(BASE).inputModes).toEqual({});
    });

    test('editorHeight defaults to null', () => {
        expect(createBlock(BASE).editorHeight).toBeNull();
    });

    test('outputHeight defaults to null', () => {
        expect(createBlock(BASE).outputHeight).toBeNull();
    });

    test('editorCollapsed defaults to false', () => {
        expect(createBlock(BASE).editorCollapsed).toBe(false);
    });
});

describe('createBlock — explicit values override defaults', () => {
    test('all optional fields can be overridden', () => {
        const b = createBlock({
            ...BASE,
            code: 'x + 1',
            visualizationType: 'html',
            vizOptions: { customVizName: 'myViz' },
            inputModes: { b: 'each' },
            editorHeight: 48,
            outputHeight: 72
        });
        expect(b.code).toBe('x + 1');
        expect(b.visualizationType).toBe('html');
        expect(b.vizOptions).toEqual({ customVizName: 'myViz' });
        expect(b.inputModes).toEqual({ b: 'each' });
        expect(b.editorHeight).toBe(48);
        expect(b.outputHeight).toBe(72);
    });
});
