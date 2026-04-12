import { describe, it, expect } from 'vitest';
import { buildTemplateExpression, extractTemplateIdentifiers, detectStringMode } from './string-template';

describe('buildTemplateExpression', () => {
    it('wraps plain text in backticks', () => {
        expect(buildTemplateExpression('hello world')).toBe('`hello world`');
    });

    it('preserves ${...} interpolation', () => {
        expect(buildTemplateExpression('hello ${name}')).toBe('`hello ${name}`');
    });

    it('escapes bare backticks', () => {
        expect(buildTemplateExpression('say `hi`')).toBe('`say \\`hi\\``');
    });

    it('handles empty string', () => {
        expect(buildTemplateExpression('')).toBe('``');
    });

    it('preserves multiple interpolations', () => {
        expect(buildTemplateExpression('${a} and ${b}')).toBe('`${a} and ${b}`');
    });
});

describe('extractTemplateIdentifiers', () => {
    it('extracts identifiers from ${...} expressions', () => {
        const ids = extractTemplateIdentifiers('hello ${name}');
        expect(ids.has('name')).toBe(true);
    });

    it('extracts multiple identifiers', () => {
        const ids = extractTemplateIdentifiers('${first} ${last}');
        expect(ids.has('first')).toBe(true);
        expect(ids.has('last')).toBe(true);
    });

    it('does not extract literal text outside ${...}', () => {
        const ids = extractTemplateIdentifiers('hello world');
        expect(ids.size).toBe(0);
    });

    it('handles member expressions inside ${}', () => {
        const ids = extractTemplateIdentifiers('${user.name}');
        expect(ids.has('user')).toBe(true);
        expect(ids.has('name')).toBe(false);
    });

    it('handles expressions with escaped backticks', () => {
        const ids = extractTemplateIdentifiers('say `hi` ${name}');
        expect(ids.has('name')).toBe(true);
    });

    it('returns empty set for plain text', () => {
        const ids = extractTemplateIdentifiers('no interpolation here');
        expect(ids.size).toBe(0);
    });

    it('returns empty set on broken expression syntax', () => {
        const ids = extractTemplateIdentifiers('${(((broken}');
        expect(ids.size).toBe(0);
    });
});

describe('detectStringMode', () => {
    it('returns true for text with ${} interpolation', () => {
        expect(detectStringMode('hello ${name}')).toBe(true);
    });

    it('returns true when expression starts with ${}', () => {
        expect(detectStringMode('${greeting}, world!')).toBe(true);
    });

    it('returns false for valid JS expressions', () => {
        expect(detectStringMode('numbers.filter(n => n > 0)')).toBe(false);
    });

    it('returns false for a plain identifier', () => {
        expect(detectStringMode('name')).toBe(false);
    });

    it('returns false for a JS template literal (already backtick-wrapped)', () => {
        expect(detectStringMode('`hello ${name}`')).toBe(false);
    });

    it('returns false for JS code that uses template syntax internally', () => {
        expect(detectStringMode('obj[`${key}`]')).toBe(false);
    });
});
