// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeBlockStatuses } from './blastRadius';

describe('computeBlockStatuses', () => {
    it('marks all blocks ok when there are no errors', () => {
        const dependsOn = { a: [], b: ['a'], c: ['b'] };
        const errorFlags = {};
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'ok',
            b: 'ok',
            c: 'ok'
        });
    });

    it('propagates error down a linear chain as blocked', () => {
        const dependsOn = { a: [], b: ['a'], c: ['b'] };
        const errorFlags = { a: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'blocked',
            c: 'blocked'
        });
    });

    it('marks a diamond join as blocked when one branch is broken', () => {
        // d depends on b (healthy) and c (broken via a)
        const dependsOn = { a: [], b: [], c: ['a'], d: ['b', 'c'] };
        const errorFlags = { a: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'ok',
            c: 'blocked',
            d: 'blocked'
        });
    });

    it('handles multiple independent error roots', () => {
        const dependsOn = { a: [], b: ['a'], x: [], y: ['x'] };
        const errorFlags = { a: true, x: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'blocked',
            x: 'error',
            y: 'blocked'
        });
    });

    it('marks a block with its own error and no broken upstream as error', () => {
        const dependsOn = { a: [], b: ['a'] };
        const errorFlags = { b: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'ok',
            b: 'error'
        });
    });

    it('blocked wins over own error when a block has both', () => {
        const dependsOn = { a: [], b: ['a'] };
        const errorFlags = { a: true, b: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'blocked'
        });
    });

    it('marks both members of a 2-node cycle as error', () => {
        const dependsOn = { a: ['b'], b: ['a'] };
        const errorFlags = { a: true, b: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'error'
        });
    });

    it('marks all members of a 3-node cycle as error', () => {
        const dependsOn = { a: ['b'], b: ['c'], c: ['a'] };
        const errorFlags = { a: true, b: true, c: true };
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({
            a: 'error',
            b: 'error',
            c: 'error'
        });
    });

    it('marks a non-cyclic block depending on a cycle member as blocked', () => {
        const dependsOn = { a: ['b'], b: ['a'], d: ['a'] };
        const errorFlags = { a: true, b: true };
        const result = computeBlockStatuses(dependsOn, errorFlags);
        expect(result.a).toBe('error');
        expect(result.b).toBe('error');
        expect(result.d).toBe('blocked');
    });

    it('terminates and returns deterministic statuses for a cycle', () => {
        const dependsOn = { a: ['b'], b: ['a'] };
        const errorFlags = { a: true, b: true };
        const result = computeBlockStatuses(dependsOn, errorFlags);
        expect(Object.keys(result).sort()).toEqual(['a', 'b']);
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual(result);
    });

    it('treats a dep referencing an absent name as ok and does not throw', () => {
        const dependsOn = { a: ['missing'] };
        const errorFlags = {};
        expect(() => computeBlockStatuses(dependsOn, errorFlags)).not.toThrow();
        expect(computeBlockStatuses(dependsOn, errorFlags)).toEqual({ a: 'ok' });
    });
});
