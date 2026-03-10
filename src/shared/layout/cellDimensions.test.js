import { describe, test, expect } from 'vitest';
import { computeUnitX, snapX, snapY } from './cellDimensions';

describe('computeUnitX', () => {

    test('divisible by 4 → divides by 4', () => {
        expect(computeUnitX(120)).toBe(30);
        expect(computeUnitX(100)).toBe(25);
        expect(computeUnitX(40)).toBe(10);
    });

    test('divisible by 3 but not 4 → divides by 3', () => {
        expect(computeUnitX(150)).toBe(50);
        expect(computeUnitX(90)).toBe(30);
    });

    test('divisible by 2 but not 4 or 3 → divides by 2', () => {
        expect(computeUnitX(10)).toBe(5);
        expect(computeUnitX(14)).toBe(7);
    });

    test('not divisible by 4, 3, or 2 → returns cellWidth unchanged', () => {
        expect(computeUnitX(7)).toBe(7);
        expect(computeUnitX(11)).toBe(11);
    });

});

describe('snapX', () => {

    test('value already on grid → unchanged', () => {
        expect(snapX(30, 10)).toBe(30);
        expect(snapX(0, 10)).toBe(0);
    });

    test('rounds to nearest grid position', () => {
        expect(snapX(34, 10)).toBe(30);
        expect(snapX(36, 10)).toBe(40);
        expect(snapX(35, 10)).toBe(40); // ties round up (Math.round)
    });

    test('negative values round to nearest', () => {
        expect(snapX(-14, 10)).toBe(-10);
        expect(snapX(-16, 10)).toBe(-20);
    });

    test('zero returns zero', () => {
        expect(snapX(0, 25)).toBe(0);
    });

});

describe('snapY', () => {

    test('value already on grid → unchanged', () => {
        expect(snapY(40, 20)).toBe(40);
        expect(snapY(0, 20)).toBe(0);
    });

    test('rounds to nearest grid row', () => {
        expect(snapY(29, 20)).toBe(20);
        expect(snapY(31, 20)).toBe(40);
    });

    test('negative values round to nearest', () => {
        expect(snapY(-29, 20)).toBe(-20);
        expect(snapY(-31, 20)).toBe(-40);
    });

    test('zero returns zero', () => {
        expect(snapY(0, 30)).toBe(0);
    });

});
