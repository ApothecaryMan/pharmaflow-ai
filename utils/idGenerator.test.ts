import { describe, expect, it, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabase';
import { idGenerator, SerialGenerationError, isTransientError } from './idGenerator';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

const ok = { count: null, status: 200, statusText: 'OK' };
const rpc = () => vi.mocked(supabase.rpc);

describe('ID Generator', () => {
  beforeEach(() => {
    rpc().mockReset();
  });

  describe('nextSerial', () => {
    it('requests the next serial from the generate_serial_id RPC', async () => {
      rpc().mockResolvedValue({ data: 'B1-0001', error: null, ...ok });

      const id = await idGenerator.nextSerial({
        branchId: 'b1',
        docType: 'sales',
        branchCode: 'B1',
        zeroPad: 4,
      });

      expect(rpc()).toHaveBeenCalledWith(
        'generate_serial_id',
        expect.objectContaining({
          p_branch_id: 'b1',
          p_doc_type: 'sales',
          p_branch_code: 'B1',
          p_zero_pad: 4,
          p_raw: false,
        })
      );
      expect(id).toBe('B1-0001');
    });

    it('omits p_date when no date is provided so the server default applies', async () => {
      rpc().mockResolvedValue({ data: 'CAI-PU-26-000001', error: null, ...ok });

      await idGenerator.nextSerial({ branchId: 'b1', docType: 'PU' });

      const args = rpc().mock.calls[0][1] as Record<string, unknown>;
      expect(args.p_date).toBeUndefined();
    });

    it('throws instead of fabricating a serial when the RPC fails', async () => {
      rpc().mockResolvedValue({ data: null, error: { message: 'permission denied', code: '42501' }, ...ok });

      await expect(
        idGenerator.nextSerial({ branchId: 'b1', docType: 'sales' })
      ).rejects.toThrow(SerialGenerationError);
    });

    it('retries transient failures with backoff, then succeeds', async () => {
      rpc()
        .mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' }, ...ok })
        .mockResolvedValueOnce({ data: null, error: { message: 'Network Error' }, ...ok })
        .mockResolvedValueOnce({ data: 'CAI-PU-26-000001', error: null, ...ok });

      const id = await idGenerator.nextSerial({ branchId: 'b1', docType: 'PU' });
      expect(id).toBe('CAI-PU-26-000001');
      expect(rpc()).toHaveBeenCalledTimes(3);
    });

    it('does not retry logical errors (unique violation)', async () => {
      rpc().mockResolvedValue({ data: null, error: { message: 'duplicate key value', code: '23505' }, ...ok });

      await expect(idGenerator.nextSerial({ branchId: 'b1', docType: 'PU' })).rejects.toThrow(
        SerialGenerationError
      );
      expect(rpc()).toHaveBeenCalledTimes(1);
    });

    it('throws after the retry budget is exhausted on persistent transient errors', async () => {
      rpc().mockResolvedValue({ data: null, error: { message: 'fetch failed', name: 'FetchError' }, ...ok });

      await expect(idGenerator.nextSerial({ branchId: 'b1', docType: 'PU' })).rejects.toThrow(
        SerialGenerationError
      );
      expect(rpc()).toHaveBeenCalledTimes(3);
    });
  });

  describe('isTransientError', () => {
    it('classifies network/timeout/race failures as transient', () => {
      expect(isTransientError({ message: 'Failed to fetch' })).toBe(true);
      expect(isTransientError({ name: 'FetchError' })).toBe(true);
      expect(isTransientError({ message: 'socket hang up' })).toBe(true);
      expect(isTransientError({ message: 'connection timed out' })).toBe(true);
      expect(isTransientError({ code: '40001' })).toBe(true);
      expect(isTransientError({ code: '57014' })).toBe(true);
    });

    it('classifies logical failures as non-transient', () => {
      expect(isTransientError({ code: '23505' })).toBe(false);
      expect(isTransientError({ code: '42501' })).toBe(false);
      expect(isTransientError({ message: 'invalid input syntax' })).toBe(false);
      expect(isTransientError(null)).toBe(false);
    });
  });

  describe('draftId', () => {
    it('returns a unique local id without hitting the DB', () => {
      const a = idGenerator.draftId();
      const b = idGenerator.draftId();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9A-Z]+$/);
    });
  });

  describe('uuid', () => {
    it('returns a valid uuid v4', () => {
      expect(idGenerator.isUuid(idGenerator.uuid())).toBe(true);
    });
  });

  describe('batch barcode round-trip', () => {
    it('decodes what generateBatchBarcode produces', () => {
      const expiry = new Date(2027, 9, 15); // 2027-10
      const code = idGenerator.generateBatchBarcode(2166, expiry);
      const decoded = idGenerator.decodeBatchBarcode(code);
      expect(decoded.drugId).toBe(2166);
      expect(decoded.expiryDate.getFullYear()).toBe(2027);
      expect(decoded.expiryDate.getMonth()).toBe(9);
    });
  });
});