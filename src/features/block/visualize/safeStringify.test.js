import { describe, test, expect } from 'vitest';
import { safeStringify } from './safeStringify';

describe('safeStringify', () => {
    test('plain object serialises with 2-space indent', () => {
        expect(safeStringify({ x: 1, y: 'hello' })).toBe('{\n  "x": 1,\n  "y": "hello"\n}');
    });

    test('array serialises correctly', () => {
        expect(safeStringify([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
    });

    test('undefined values replaced with "[undefined]"', () => {
        const result = safeStringify({ a: undefined });
        expect(result).toContain('"[undefined]"');
    });

    test('functions replaced with "[Function]"', () => {
        const result = safeStringify({ fn: () => {} });
        expect(result).toContain('"[Function]"');
    });

    test('circular references replaced with "[Circular]" without throwing', () => {
        const obj = { a: 1 };
        obj.self = obj;
        expect(() => safeStringify(obj)).not.toThrow();
        expect(safeStringify(obj)).toContain('"[Circular]"');
    });
});
