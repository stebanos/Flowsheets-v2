import { describe, expect, test } from 'vitest';
import { coerceNumberSeries, coerceNumbers, coerceTimeSeries, extent, niceTicks } from './chartHelpers';

describe('coerceNumberSeries', () => {
    test('returns null for non-arrays', () => {
        expect(coerceNumberSeries(42)).toBeNull();
        expect(coerceNumberSeries(null)).toBeNull();
        expect(coerceNumberSeries('abc')).toBeNull();
    });

    test('returns null for empty array', () => {
        expect(coerceNumberSeries([])).toBeNull();
    });

    test('accepts an array of finite numbers, using index as label', () => {
        expect(coerceNumberSeries([5, 12, 3])).toEqual([
            { label: '0', value: 5 },
            { label: '1', value: 12 },
            { label: '2', value: 3 }
        ]);
    });

    test('rejects an array of numbers containing NaN/Infinity', () => {
        expect(coerceNumberSeries([1, NaN, 3])).toBeNull();
        expect(coerceNumberSeries([1, Infinity, 3])).toBeNull();
    });

    test('accepts [label, value] pairs', () => {
        expect(coerceNumberSeries([['a', 5], ['b', 12]])).toEqual([
            { label: 'a', value: 5 },
            { label: 'b', value: 12 }
        ]);
    });

    test('rejects pairs where the second element is not a finite number', () => {
        expect(coerceNumberSeries([['a', 'x']])).toBeNull();
        expect(coerceNumberSeries([['a']])).toBeNull();
    });

    test('accepts array of objects using first string prop as label and first numeric prop as value', () => {
        expect(coerceNumberSeries([{ name: 'a', count: 5 }, { name: 'b', count: 12 }])).toEqual([
            { label: 'a', value: 5 },
            { label: 'b', value: 12 }
        ]);
    });

    test('accepts array of objects with no string prop, label is empty', () => {
        expect(coerceNumberSeries([{ count: 5 }])).toEqual([{ label: '', value: 5 }]);
    });

    test('returns null for array of objects with no usable numeric field', () => {
        expect(coerceNumberSeries([{ name: 'a' }])).toBeNull();
    });
});

describe('coerceNumbers', () => {
    test('returns null when the series is not coercible', () => {
        expect(coerceNumbers(42)).toBeNull();
        expect(coerceNumbers([])).toBeNull();
    });

    test('reduces a valid series to its numeric values', () => {
        expect(coerceNumbers([1, 3, 2])).toEqual([1, 3, 2]);
        expect(coerceNumbers([['a', 5], ['b', 12]])).toEqual([5, 12]);
    });
});

describe('coerceTimeSeries', () => {
    test('returns null for non-arrays and empty arrays', () => {
        expect(coerceTimeSeries(42)).toBeNull();
        expect(coerceTimeSeries([])).toBeNull();
    });

    test('accepts [date, value] pairs and sorts ascending by time', () => {
        const result = coerceTimeSeries([['2026-03-01', 25], ['2026-01-01', 10]]);
        expect(result).toEqual([
            { time: new Date('2026-01-01').getTime(), value: 10 },
            { time: new Date('2026-03-01').getTime(), value: 25 }
        ]);
    });

    test('accepts objects with a date-ish key and a numeric value key', () => {
        expect(coerceTimeSeries([{ date: '2026-01-01', value: 10 }])).toEqual([
            { time: new Date('2026-01-01').getTime(), value: 10 }
        ]);
        expect(coerceTimeSeries([{ timestamp: '2026-01-01', y: 10 }])).toEqual([
            { time: new Date('2026-01-01').getTime(), value: 10 }
        ]);
    });

    test('accepts epoch numbers and Date instances', () => {
        const d = new Date('2026-01-01');
        expect(coerceTimeSeries([[d.getTime(), 5]])).toEqual([{ time: d.getTime(), value: 5 }]);
        expect(coerceTimeSeries([[d, 5]])).toEqual([{ time: d.getTime(), value: 5 }]);
    });

    test('rejects points with unparsable dates, keeping valid ones', () => {
        const result = coerceTimeSeries([['not-a-date', 1], ['2026-01-01', 10]]);
        expect(result).toEqual([{ time: new Date('2026-01-01').getTime(), value: 10 }]);
    });

    test('returns null when no points are valid', () => {
        expect(coerceTimeSeries([['not-a-date', 1]])).toBeNull();
        expect(coerceTimeSeries([{ name: 'x' }])).toBeNull();
    });
});

describe('extent', () => {
    test('returns [min, max] for a normal range', () => {
        expect(extent([5, 1, 9, 3])).toEqual([1, 9]);
    });

    test('pads a zero-width range around a nonzero value', () => {
        expect(extent([4, 4, 4])).toEqual([3, 5]);
    });

    test('pads a zero-width range at zero to [0, 1]', () => {
        expect(extent([0, 0])).toEqual([0, 1]);
    });
});

describe('niceTicks', () => {
    test('returns a single tick when min === max', () => {
        expect(niceTicks(4, 4)).toEqual([4]);
    });

    test('returns ascending ticks spanning the range', () => {
        const ticks = niceTicks(0, 10, 5);
        expect(ticks.length).toBeGreaterThan(1);
        expect(ticks[0]).toBeGreaterThanOrEqual(0);
        expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(10);
        for (let i = 1; i < ticks.length; i++) {
            expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
        }
    });

    test('produces round step sizes', () => {
        const ticks = niceTicks(0, 100, 5);
        const step = ticks[1] - ticks[0];
        expect([1, 2, 5, 10, 20, 25, 50, 100]).toContain(step);
    });
});
