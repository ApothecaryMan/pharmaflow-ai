import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cashService } from './cashService';
import { cashRepository } from './repositories/cashRepository';
import { settingsService } from '../settings/settingsService';

vi.mock('./repositories/cashRepository', () => ({
  cashRepository: {
    getCurrentShift: vi.fn(),
    getAllShifts: vi.fn(),
    getShiftById: vi.fn(),
    openShiftRPC: vi.fn(),
    closeShiftRPC: vi.fn(),
    processCashTransactionRPC: vi.fn(),
    getTransactions: vi.fn(),
    getAllTransactions: vi.fn(),
    mapShiftFromDb: vi.fn(),
    mapTransactionFromDb: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: { getAll: vi.fn() },
}));

describe('cashService', () => {
  const openShift: any = { id: 'S1', branchId: 'BR1', status: 'open' };
  const closedShift: any = { id: 'S1', branchId: 'BR1', status: 'closed' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({
      activeBranchId: 'AB1',
      branchCode: 'BC1',
    } as any);
  });

  describe('getCurrentShift', () => {
    it('resolves the branch from settings.activeBranchId', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(openShift);
      const result = await cashService.getCurrentShift();
      expect(cashRepository.getCurrentShift).toHaveBeenCalledWith('AB1');
      expect(result).toBe(openShift);
    });

    it('prefers an explicit branchId over settings', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(openShift);
      const result = await cashService.getCurrentShift('BRX');
      expect(cashRepository.getCurrentShift).toHaveBeenCalledWith('BRX');
      expect(result).toBe(openShift);
    });

    it('falls back to settings.branchCode when activeBranchId is empty', async () => {
      vi.mocked(settingsService.getAll).mockResolvedValue({
        activeBranchId: '',
        branchCode: 'BC1',
      } as any);
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(openShift);
      await cashService.getCurrentShift();
      expect(cashRepository.getCurrentShift).toHaveBeenCalledWith('BC1');
    });

    it('swallows repository errors and returns null', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(cashRepository.getCurrentShift).mockRejectedValue(new Error('db down'));
      const result = await cashService.getCurrentShift('BR1');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAllShifts', () => {
    it('fetches all shifts for the effective branch', async () => {
      vi.mocked(cashRepository.getAllShifts).mockResolvedValue([openShift]);
      const result = await cashService.getAllShifts();
      expect(cashRepository.getAllShifts).toHaveBeenCalledWith('AB1');
      expect(result).toEqual([openShift]);
    });

    it('uses an explicit branchId when provided', async () => {
      vi.mocked(cashRepository.getAllShifts).mockResolvedValue([]);
      await cashService.getAllShifts('BRX');
      expect(cashRepository.getAllShifts).toHaveBeenCalledWith('BRX');
    });
  });

  describe('openShift', () => {
    it('throws when a shift is already open for the branch', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(openShift);
      await expect(cashService.openShift(100, 'EMP1', 'BR1')).rejects.toThrow(
        'A shift is already open for this branch'
      );
      expect(cashRepository.openShiftRPC).not.toHaveBeenCalled();
    });

    it('opens a shift and refetches it by id', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(null);
      vi.mocked(cashRepository.openShiftRPC).mockResolvedValue({ success: true, shiftId: 'S1' });
      vi.mocked(cashRepository.getShiftById).mockResolvedValue(openShift);

      const result = await cashService.openShift(100, 'EMP1', 'BR1');
      expect(result).toBe(openShift);
      expect(cashRepository.openShiftRPC).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: 'BR1', openedBy: 'EMP1', openingBalance: 100 })
      );
      expect(cashRepository.openShiftRPC).toHaveBeenCalledWith(
        expect.objectContaining({ openTime: expect.any(String) })
      );
      expect(cashRepository.getShiftById).toHaveBeenCalledWith('S1');
    });

    it('throws the RPC error message when the RPC reports failure', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(null);
      vi.mocked(cashRepository.openShiftRPC).mockResolvedValue({
        success: false,
        error: 'serial failed',
      });
      await expect(cashService.openShift(100, 'EMP1', 'BR1')).rejects.toThrow('serial failed');
    });

    it('throws a generic message when the RPC fails without an error message', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(null);
      vi.mocked(cashRepository.openShiftRPC).mockResolvedValue({ success: false });
      await expect(cashService.openShift(100, 'EMP1', 'BR1')).rejects.toThrow(
        'Failed to open shift'
      );
    });

    it('throws when the RPC returns null', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(null);
      vi.mocked(cashRepository.openShiftRPC).mockResolvedValue(null);
      await expect(cashService.openShift(100, 'EMP1', 'BR1')).rejects.toThrow(
        'Failed to open shift'
      );
    });

    it('throws when the created shift cannot be refetched', async () => {
      vi.mocked(cashRepository.getCurrentShift).mockResolvedValue(null);
      vi.mocked(cashRepository.openShiftRPC).mockResolvedValue({ success: true, shiftId: 'S1' });
      vi.mocked(cashRepository.getShiftById).mockResolvedValue(null);
      await expect(cashService.openShift(100, 'EMP1', 'BR1')).rejects.toThrow(
        'Shift created but could not be fetched'
      );
    });
  });

  describe('closeShift', () => {
    it('throws when the shift is not found', async () => {
      vi.mocked(cashRepository.getShiftById).mockResolvedValue(null);
      await expect(cashService.closeShift('S1', 500, 'EMP1')).rejects.toThrow('Shift not found');
      expect(cashRepository.closeShiftRPC).not.toHaveBeenCalled();
    });

    it('closes the shift via RPC and refetches it', async () => {
      vi.mocked(cashRepository.getShiftById).mockResolvedValueOnce(openShift);
      vi.mocked(cashRepository.closeShiftRPC).mockResolvedValue({ success: true });
      vi.mocked(cashRepository.getShiftById).mockResolvedValueOnce(closedShift);

      const result = await cashService.closeShift('S1', 500, 'EMP1', 'all good');
      expect(result).toBe(closedShift);
      expect(cashRepository.closeShiftRPC).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'S1', closedBy: 'EMP1', closingBalance: 500, notes: 'all good' })
      );
      expect(cashRepository.closeShiftRPC).toHaveBeenCalledWith(
        expect.objectContaining({ closeTime: expect.any(String) })
      );
      expect(cashRepository.getShiftById).toHaveBeenNthCalledWith(2, 'S1');
    });

    it('throws the RPC error message on failure', async () => {
      vi.mocked(cashRepository.getShiftById).mockResolvedValue(openShift);
      vi.mocked(cashRepository.closeShiftRPC).mockResolvedValue({
        success: false,
        error: 'recount mismatch',
      });
      await expect(cashService.closeShift('S1', 500, 'EMP1')).rejects.toThrow('recount mismatch');
    });

    it('throws when the closed shift cannot be refetched', async () => {
      vi.mocked(cashRepository.getShiftById).mockResolvedValueOnce(openShift);
      vi.mocked(cashRepository.closeShiftRPC).mockResolvedValue({ success: true });
      vi.mocked(cashRepository.getShiftById).mockResolvedValueOnce(null);
      await expect(cashService.closeShift('S1', 500, 'EMP1')).rejects.toThrow(
        'Shift closed but could not be fetched'
      );
    });
  });

  describe('addTransaction', () => {
    const tx = {
      branchId: 'BR1',
      shiftId: 'SHIFT1',
      type: 'in' as const,
      amount: 50,
      reason: 'cash top-up',
      userId: 'U1',
      time: '2026-01-01T00:00:00.000Z',
    };

    it('builds the RPC payload and returns the created transaction', async () => {
      vi.mocked(cashRepository.processCashTransactionRPC).mockResolvedValue({
        success: true,
        transactionId: 'T1',
      });
      const result = await cashService.addTransaction('SHIFT1', tx);
      expect(cashRepository.processCashTransactionRPC).toHaveBeenCalledWith({
        shiftId: 'SHIFT1',
        branchId: 'BR1',
        type: 'in',
        amount: 50,
        reason: 'cash top-up',
        userId: 'U1',
        time: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toEqual({ ...tx, id: 'T1', shiftId: 'SHIFT1' });
    });

    it('defaults the time to the current ISO timestamp when not provided', async () => {
      vi.mocked(cashRepository.processCashTransactionRPC).mockResolvedValue({
        success: true,
        transactionId: 'T1',
      });
      const { time: _time, ...noTime } = tx;
      await cashService.addTransaction('SHIFT1', { ...noTime } as any);
      expect(cashRepository.processCashTransactionRPC).toHaveBeenCalledWith(
        expect.objectContaining({ time: expect.any(String) })
      );
    });

    it('throws the RPC error message on failure', async () => {
      vi.mocked(cashRepository.processCashTransactionRPC).mockResolvedValue({
        success: false,
        error: 'insufficient balance',
      });
      await expect(cashService.addTransaction('SHIFT1', tx)).rejects.toThrow('insufficient balance');
    });

    it('throws a generic message when the RPC returns null', async () => {
      vi.mocked(cashRepository.processCashTransactionRPC).mockResolvedValue(null);
      await expect(cashService.addTransaction('SHIFT1', tx)).rejects.toThrow(
        'Failed to process transaction'
      );
    });
  });

  describe('getTransactions', () => {
    it('fetches transactions for a given shift', async () => {
      const txs: any[] = [{ id: 'T1' }];
      vi.mocked(cashRepository.getTransactions).mockResolvedValue(txs);
      const result = await cashService.getTransactions('SHIFT1');
      expect(cashRepository.getTransactions).toHaveBeenCalledWith('SHIFT1');
      expect(result).toEqual(txs);
    });

    it('fetches all transactions for the effective branch when no shift is given', async () => {
      const txs: any[] = [{ id: 'T1' }];
      vi.mocked(cashRepository.getAllTransactions).mockResolvedValue(txs);
      const result = await cashService.getTransactions();
      expect(settingsService.getAll).toHaveBeenCalled();
      expect(cashRepository.getAllTransactions).toHaveBeenCalledWith('AB1');
      expect(result).toEqual(txs);
    });

    it('falls back to branchCode when activeBranchId is empty', async () => {
      vi.mocked(settingsService.getAll).mockResolvedValue({
        activeBranchId: '',
        branchCode: 'BC1',
      } as any);
      vi.mocked(cashRepository.getAllTransactions).mockResolvedValue([]);
      await cashService.getTransactions();
      expect(cashRepository.getAllTransactions).toHaveBeenCalledWith('BC1');
    });
  });

  describe('mapFromDb / mapFromDbTransaction', () => {
    it('delegates shift mapping to the repository', () => {
      vi.mocked(cashRepository.mapShiftFromDb).mockReturnValue(openShift);
      expect(cashService.mapFromDb({ id: 'S1' })).toBe(openShift);
      expect(cashRepository.mapShiftFromDb).toHaveBeenCalledWith({ id: 'S1' });
    });

    it('delegates transaction mapping to the repository', () => {
      const tx = { id: 'T1' };
      vi.mocked(cashRepository.mapTransactionFromDb).mockReturnValue(tx as any);
      expect(cashService.mapFromDbTransaction({ id: 'T1' })).toBe(tx);
      expect(cashRepository.mapTransactionFromDb).toHaveBeenCalledWith({ id: 'T1' });
    });
  });
});
