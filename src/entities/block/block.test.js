import { describe, test, expect } from 'vitest';
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

    test('userMinWidth defaults to null', () => {
        expect(createBlock(BASE).userMinWidth).toBeNull();
    });

    test('userMinEditorHeight defaults to null', () => {
        expect(createBlock(BASE).userMinEditorHeight).toBeNull();
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
            userMinWidth: 100,
            userMinEditorHeight: 200
        });
        expect(b.code).toBe('x + 1');
        expect(b.visualizationType).toBe('html');
        expect(b.vizOptions).toEqual({ customVizName: 'myViz' });
        expect(b.inputModes).toEqual({ b: 'each' });
        expect(b.userMinWidth).toBe(100);
        expect(b.userMinEditorHeight).toBe(200);
    });
});
