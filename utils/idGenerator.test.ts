import { describe, it, expect } from 'vitest';
import { idGenerator } from './idGenerator';

describe('ID Generator', () => {
  it('should generate IDs with correct prefix', async () => {
    const id = await idGenerator.generate('sales', 'B1');
    expect(typeof id).toBe('string');
  });

  it('should generate unique IDs', async () => {
    const id1 = await idGenerator.generate('sales', 'B1');
    const id2 = await idGenerator.generate('sales', 'B1');
    expect(id1).not.toBe(id2);
  });
});
