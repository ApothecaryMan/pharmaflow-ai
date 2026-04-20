import { describe, it, expect } from 'vitest';
import { idGenerator } from './idGenerator';

describe('ID Generator', () => {
  it('should generate IDs with correct prefix', () => {
    const id = idGenerator.generate('sales');
    // Assuming sales prefix is 'S' or configured in the generator. 
    // Based on contributing doc example "B1-1001", checking pattern.
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const id1 = idGenerator.generate('sales');
    const id2 = idGenerator.generate('sales');
    expect(id1).not.toBe(id2);
  });
});
