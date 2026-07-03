import { describe, expect, test } from 'vitest';
import { sanitizeToIdentifier } from './sanitizeToIdentifier';

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

describe('sanitizeToIdentifier', () => {
    test('strips a single extension', () => {
        expect(sanitizeToIdentifier('sales.csv')).toBe('sales');
        expect(sanitizeToIdentifier('data.json')).toBe('data');
    });

    test('replaces hyphens with underscores', () => {
        expect(sanitizeToIdentifier('sales-2026.csv')).toBe('sales_2026');
    });

    test('replaces dots within the name with underscores', () => {
        expect(sanitizeToIdentifier('sales.q1.2026.csv')).toBe('sales_q1_2026');
    });

    test('replaces spaces with underscores', () => {
        expect(sanitizeToIdentifier('my sales report.csv')).toBe('my_sales_report');
    });

    test('prefixes an underscore when the name starts with a digit', () => {
        expect(sanitizeToIdentifier('2026-sales.csv')).toBe('_2026_sales');
    });

    test('replaces any char outside [A-Za-z0-9_$]', () => {
        expect(sanitizeToIdentifier('a+b&c(d).csv')).toBe('a_b_c_d_');
    });

    test('preserves $ and _', () => {
        expect(sanitizeToIdentifier('$cost_total.csv')).toBe('$cost_total');
    });

    test('falls back to "data" when nothing usable remains', () => {
        expect(sanitizeToIdentifier('.csv')).toBe('data');
        expect(sanitizeToIdentifier('')).toBe('data');
        expect(sanitizeToIdentifier('   ')).toBe('data');
    });

    test('non-ASCII letters are replaced', () => {
        // café → "caf_" (é replaced); still a valid identifier
        expect(sanitizeToIdentifier('café.csv')).toBe('caf_');
    });

    test('always returns a valid JS identifier', () => {
        const names = ['sales-2026.csv', '2026.json', '.csv', 'a+b.csv', '99.json', '   .csv'];
        for (const n of names) {
            expect(sanitizeToIdentifier(n)).toMatch(IDENTIFIER);
        }
    });

    test('only strips the final extension segment', () => {
        expect(sanitizeToIdentifier('archive.tar.csv')).toBe('archive_tar');
    });
});
