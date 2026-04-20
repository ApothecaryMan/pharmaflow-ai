import { describe, it, expect } from 'vitest';
import { createSearchRegex, parseSearchTerm } from './searchUtils';

describe('SearchUtils', () => {
  describe('createSearchRegex', () => {
    it('matches case insensitive', () => {
      const regex = createSearchRegex('panadol');
      expect(regex.test('Panadol')).toBe(true);
      expect(regex.test('PANADOL')).toBe(true);
    });

    it('matches partial words', () => {
      const regex = createSearchRegex('pan');
      expect(regex.test('Panadol')).toBe(true);
    });

    it('handles special characters', () => {
      const regex = createSearchRegex('pan+adol');
      expect(regex.test('Pan+adol')).toBe(true);
    });
    
    it('anchors start effectively', () => {
        // "pan" -> ^pan (starts with)
        const regex = createSearchRegex('pan');
        expect(regex.test('Panadol')).toBe(true);
        // Depending on logic: logic says if NO leading space -> ^ (start of string)
        expect(regex.test('Aspirin Panadol')).toBe(false); 
    });
    
    it('allows match anywhere if leading space', () => {
        const regex = createSearchRegex(' pan');
        expect(regex.test('Aspirin Panadol')).toBe(true);
    });
  });

  describe('parseSearchTerm', () => {
    it('detects ingredient mode', () => {
      const result = parseSearchTerm('#paracetamol');
      expect(result.mode).toBe('ingredient');
      expect(result.regex.test('paracetamol')).toBe(true);
    });

    it('detects generic mode', () => {
      const result = parseSearchTerm('@paracetamol');
      expect(result.mode).toBe('generic');
      expect(result.regex.test('paracetamol')).toBe(true);
    });

    it('defaults to normal mode', () => {
      const result = parseSearchTerm('panadol');
      expect(result.mode).toBe('normal');
    });
  });
});
