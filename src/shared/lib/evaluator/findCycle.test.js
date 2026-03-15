// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { findCycle } from './findCycle';

describe('findCycle', () => {
    it('returns null for a node with no deps', () => {
        const depMap = { a: [] };
        expect(findCycle('a', depMap)).toBeNull();
    });

    it('returns null for an empty depMap', () => {
        expect(findCycle('a', {})).toBeNull();
    });

    it('returns null for a linear chain with no cycle', () => {
        const depMap = { a: ['b'], b: ['c'], c: [] };
        expect(findCycle('a', depMap)).toBeNull();
    });

    it('detects a direct self-reference', () => {
        const depMap = { a: ['a'] };
        expect(findCycle('a', depMap)).toEqual(['a', 'a']);
    });

    it('detects a two-node cycle', () => {
        const depMap = { a: ['b'], b: ['a'] };
        expect(findCycle('a', depMap)).toEqual(['a', 'b', 'a']);
    });

    it('detects a three-node cycle', () => {
        const depMap = { a: ['b'], b: ['c'], c: ['a'] };
        expect(findCycle('a', depMap)).toEqual(['a', 'b', 'c', 'a']);
    });

    it('detects a cycle not involving startName', () => {
        // a → b, b → c → b: startName a is not in the cycle itself
        const depMap = { a: ['b'], b: ['c'], c: ['b'] };
        const cycle = findCycle('a', depMap);
        expect(cycle).toEqual(['b', 'c', 'b']);
    });

    it('returns the cycle sub-path when startName leads into a cycle mid-chain', () => {
        // a → b → c → d → b: cycle is b → c → d → b
        const depMap = { a: ['b'], b: ['c'], c: ['d'], d: ['b'] };
        const cycle = findCycle('a', depMap);
        expect(cycle).toEqual(['b', 'c', 'd', 'b']);
    });

    it('returns null when startName has deps but none form a cycle', () => {
        const depMap = { a: ['b', 'c'], b: ['d'], c: ['d'], d: [] };
        expect(findCycle('a', depMap)).toBeNull();
    });

    it('cycle path starts and ends with the repeated node', () => {
        const depMap = { x: ['y'], y: ['z'], z: ['y'] };
        const cycle = findCycle('x', depMap);
        expect(cycle[0]).toBe(cycle[cycle.length - 1]);
    });
});
