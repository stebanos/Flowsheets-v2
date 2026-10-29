import { describe, expect, test } from 'vitest';
import { codeToValue, valueToCode } from './paramCodec';

describe('valueToCode — slider', () => {
    test('writes the number as a numeric literal', () => {
        expect(valueToCode('slider', 0.5)).toBe('0.5');
        expect(valueToCode('slider', -3)).toBe('-3');
        expect(valueToCode('slider', 0)).toBe('0');
    });

    test('coerces a numeric string', () => {
        expect(valueToCode('slider', '2.5')).toBe('2.5');
    });

    test('non-finite input falls back to 0', () => {
        expect(valueToCode('slider', NaN)).toBe('0');
        expect(valueToCode('slider', 'abc')).toBe('0');
    });
});

describe('valueToCode — toggle', () => {
    test('writes true / false literals', () => {
        expect(valueToCode('toggle', true)).toBe('true');
        expect(valueToCode('toggle', false)).toBe('false');
    });
});

describe('valueToCode — text', () => {
    test('writes a JSON string literal', () => {
        expect(valueToCode('text', 'hello')).toBe('"hello"');
    });

    test('escapes quotes and newlines', () => {
        expect(valueToCode('text', 'say "hi"\nnow')).toBe('"say \\"hi\\"\\nnow"');
    });

    test('empty string writes ""', () => {
        expect(valueToCode('text', '')).toBe('""');
    });
});

describe('valueToCode — color', () => {
    test('writes a #rrggbb string literal', () => {
        expect(valueToCode('color', '#ff0000')).toBe('"#ff0000"');
    });

    test('adds the leading # (PrimeVue ColorPicker emits bare hex)', () => {
        expect(valueToCode('color', 'ff0000')).toBe('"#ff0000"');
    });

    test('lower-cases the hex', () => {
        expect(valueToCode('color', '#FFAA00')).toBe('"#ffaa00"');
    });

    test('invalid hex falls back to #000000', () => {
        expect(valueToCode('color', 'red')).toBe('"#000000"');
    });
});

describe('valueToCode — options', () => {
    test('writes the selected option as a JSON string literal', () => {
        expect(valueToCode('options', 'green')).toBe('"green"');
    });
});

describe('codeToValue — slider', () => {
    const config = { min: 0, max: 1, step: 0.01 };

    test('number within bounds is returned as-is', () => {
        expect(codeToValue('slider', 0.5, config)).toBe(0.5);
    });

    test('clamps above max', () => {
        expect(codeToValue('slider', 5, config)).toBe(1);
    });

    test('clamps below min', () => {
        expect(codeToValue('slider', -5, config)).toBe(0);
    });

    test('coerces a numeric string', () => {
        expect(codeToValue('slider', '0.25', config)).toBe(0.25);
    });

    test('non-numeric value falls back to min', () => {
        expect(codeToValue('slider', 'abc', { min: 3, max: 10 })).toBe(3);
        expect(codeToValue('slider', [1, 2], { min: 3, max: 10 })).toBe(3);
        expect(codeToValue('slider', true, { min: 3, max: 10 })).toBe(3);
        expect(codeToValue('slider', '', { min: 3, max: 10 })).toBe(3);
        expect(codeToValue('slider', NaN, { min: 3, max: 10 })).toBe(3);
    });

    test('undefined / null fall back to min', () => {
        expect(codeToValue('slider', undefined, config)).toBe(0);
        expect(codeToValue('slider', null, config)).toBe(0);
    });

    test('missing config uses defaults 0..100', () => {
        expect(codeToValue('slider', 50)).toBe(50);
        expect(codeToValue('slider', 500)).toBe(100);
        expect(codeToValue('slider', 'x')).toBe(0);
    });
});

describe('codeToValue — toggle', () => {
    test('booleans are returned as-is', () => {
        expect(codeToValue('toggle', true)).toBe(true);
        expect(codeToValue('toggle', false)).toBe(false);
    });

    test('other values coerce by truthiness', () => {
        expect(codeToValue('toggle', 1)).toBe(true);
        expect(codeToValue('toggle', 0)).toBe(false);
        expect(codeToValue('toggle', '')).toBe(false);
    });

    test('undefined / null fall back to false', () => {
        expect(codeToValue('toggle', undefined)).toBe(false);
        expect(codeToValue('toggle', null)).toBe(false);
    });
});

describe('codeToValue — text', () => {
    test('strings are returned as-is', () => {
        expect(codeToValue('text', 'hello')).toBe('hello');
    });

    test('numbers and booleans stringify', () => {
        expect(codeToValue('text', 42)).toBe('42');
        expect(codeToValue('text', false)).toBe('false');
    });

    test('objects stringify as JSON', () => {
        expect(codeToValue('text', { a: 1 })).toBe('{"a":1}');
    });

    test('undefined / null fall back to empty string', () => {
        expect(codeToValue('text', undefined)).toBe('');
        expect(codeToValue('text', null)).toBe('');
    });
});

describe('codeToValue — color', () => {
    test('#rrggbb is returned lower-cased', () => {
        expect(codeToValue('color', '#FF0000')).toBe('#ff0000');
    });

    test('bare rrggbb gets a leading #', () => {
        expect(codeToValue('color', '00ff00')).toBe('#00ff00');
    });

    test('non-hex falls back to #000000', () => {
        expect(codeToValue('color', 'red')).toBe('#000000');
        expect(codeToValue('color', '#ff00')).toBe('#000000');
        expect(codeToValue('color', 123)).toBe('#000000');
        expect(codeToValue('color', undefined)).toBe('#000000');
    });
});

describe('codeToValue — options', () => {
    const config = { options: ['red', 'green', 'blue'] };

    test('value in the options list is returned', () => {
        expect(codeToValue('options', 'green', config)).toBe('green');
    });

    test('value not in the options list returns null (placeholder)', () => {
        expect(codeToValue('options', 'purple', config)).toBeNull();
    });

    test('non-string value returns null', () => {
        expect(codeToValue('options', 1, { options: ['1'] })).toBeNull();
        expect(codeToValue('options', undefined, config)).toBeNull();
    });

    test('missing options list returns null', () => {
        expect(codeToValue('options', 'red')).toBeNull();
    });
});

describe('round-trip', () => {
    test('valueToCode output, evaluated, reads back through codeToValue', () => {
        const cases = [
            ['slider', 0.5, { min: 0, max: 1 }],
            ['toggle', true, {}],
            ['text', 'a "quoted" line', {}],
            ['color', '#12ab34', {}],
            ['options', 'b', { options: ['a', 'b'] }]
        ];
        for (const [widget, value, config] of cases) {
            const evaluated = JSON.parse(valueToCode(widget, value));
            expect(codeToValue(widget, evaluated, config)).toBe(value);
        }
    });
});

describe('unknown widget', () => {
    test('valueToCode throws', () => {
        expect(() => valueToCode('nope', 1)).toThrow();
    });

    test('codeToValue throws', () => {
        expect(() => codeToValue('nope', 1)).toThrow();
    });
});
