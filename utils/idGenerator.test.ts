import { describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { idGenerator } from './idGenerator';

describe('ID Generator', () => {
  it('should generate IDs with correct prefix', async () => {
    let callCount = 0;
    vi.spyOn(supabase, 'rpc').mockImplementation(async (fnName) => {
      if (fnName === 'increment_sequence') {
        callCount++;
        return { data: callCount, error: null };
      }
      return { data: null, error: null };
    });

    const id = await idGenerator.generate('sales', 'B1');
    expect(typeof id).toBe('string');
    expect(id).toBe('PF-0001');
  });

  it('should generate unique IDs', async () => {
    let callCount = 0;
    vi.spyOn(supabase, 'rpc').mockImplementation(async (fnName) => {
      if (fnName === 'increment_sequence') {
        callCount++;
        return { data: callCount, error: null };
      }
      return { data: null, error: null };
    });

    const id1 = await idGenerator.generate('sales', 'B1');
    const id2 = await idGenerator.generate('sales', 'B1');
    expect(id1).not.toBe(id2);
    expect(id1).toBe('PF-0001');
    expect(id2).toBe('PF-0002');
  });
});
