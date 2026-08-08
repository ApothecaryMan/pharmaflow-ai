import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseReturn, Return } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { authService } from '../auth/authService';
import { settingsService } from '../settings/settingsService';
import { returnsRepository } from './repositories/returnsRepository';
import { returnService } from './returnService';

vi.mock('./repositories/returnsRepository', () => ({
  returnsRepository: {
    getAllSales: vi.fn(),
    getRecentSales: vi.fn(),
    listSalesReturnsPage: vi.fn(),
    getSalesById: vi.fn(),
    insertSalesReturn: vi.fn(),
    upsertSalesReturns: vi.fn(),
    getAllPurchases: vi.fn(),
    getRecentPurchase: vi.fn(),
    getPurchaseById: vi.fn(),
    listPurchaseReturnsPage: vi.fn(),
    processPurchaseReturnRPC: vi.fn(),
    upsertPurchaseReturns: vi.fn(),
    mapSalesFromDb: vi.fn(),
    mapSalesToDb: vi.fn(),
    mapPurchaseFromDb: vi.fn(),
    mapPurchaseToDb: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    uuid: vi.fn(() => 'RET_NEW'),
  },
}));

vi.mock('../auth/authService', () => ({
  authService: {
    getCurrentUserSync: vi.fn(),
  },
}));

describe('returnService', () => {
  const mockReturn: Return = {
    id: 'RET-1',
    serialId: 'RET-0001',
    branchId: 'BR1',
    orgId: 'ORG1',
    saleId: 'SALE-1',
    date: '2026-01-01T10:00:00.000Z',
    returnType: 'partial',
    items: [],
    totalRefund: 50,
    reason: 'damaged',
    processedBy: 'EMP1',
  };

  const mockPurchaseReturn: PurchaseReturn = {
    id: 'PR-1',
    serialId: 'PR-0001',
    branchId: 'BR1',
    orgId: 'ORG1',
    purchaseId: 'P-1',
    supplierId: 'SUP-1',
    supplierName: 'Supplier A',
    date: '2026-01-02T10:00:00.000Z',
    items: [],
    totalRefund: 100,
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({
      activeBranchId: 'BR1',
      orgId: 'ORG1',
    } as any);
    vi.mocked(idGenerator.uuid).mockReturnValue('RET_NEW');
    vi.mocked(authService.getCurrentUserSync).mockReturnValue({
      employeeId: 'EMP1',
      username: 'admin',
    } as any);
  });

  describe('Sales Returns', () => {
    it('getAllSalesReturns resolves branch from settings and delegates', async () => {
      vi.mocked(returnsRepository.getAllSales).mockResolvedValue([mockReturn]);

      const result = await returnService.getAllSalesReturns();

      expect(returnsRepository.getAllSales).toHaveBeenCalledWith('BR1', 'ORG1');
      expect(result).toEqual([mockReturn]);
    });

    it('getAllSalesReturns prefers explicit branchId over settings', async () => {
      vi.mocked(returnsRepository.getAllSales).mockResolvedValue([]);

      await returnService.getAllSalesReturns('BR2');

      expect(returnsRepository.getAllSales).toHaveBeenCalledWith('BR2', 'ORG1');
    });

    it('getAllSalesReturns falls back to branchCode when activeBranchId is missing', async () => {
      vi.mocked(settingsService.getAll).mockResolvedValue({
        branchCode: 'BC1',
        orgId: 'ORG1',
      } as any);
      vi.mocked(returnsRepository.getAllSales).mockResolvedValue([]);

      await returnService.getAllSalesReturns();

      expect(returnsRepository.getAllSales).toHaveBeenCalledWith('BC1', 'ORG1');
    });

    it('getRecentSalesReturns delegates with the default limit', async () => {
      vi.mocked(returnsRepository.getRecentSales).mockResolvedValue([]);

      await returnService.getRecentSalesReturns();

      expect(returnsRepository.getRecentSales).toHaveBeenCalledWith('BR1', 'ORG1', 100);
    });

    it('getRecentSalesReturns passes an explicit limit', async () => {
      vi.mocked(returnsRepository.getRecentSales).mockResolvedValue([]);

      await returnService.getRecentSalesReturns('BR1', 25);

      expect(returnsRepository.getRecentSales).toHaveBeenCalledWith('BR1', 'ORG1', 25);
    });

    it('listSalesReturnsPage merges settings branch/org into options', async () => {
      vi.mocked(returnsRepository.listSalesReturnsPage).mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await returnService.listSalesReturnsPage({ page: 2, pageSize: 10, filters: { search: 'x' } });

      expect(returnsRepository.listSalesReturnsPage).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        filters: { search: 'x' },
        branchId: 'BR1',
        orgId: 'ORG1',
      });
    });

    it('listSalesReturnsPage prefers options.branchId and options.orgId', async () => {
      vi.mocked(returnsRepository.listSalesReturnsPage).mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await returnService.listSalesReturnsPage({ branchId: 'BR2', orgId: 'ORG2' });

      expect(returnsRepository.listSalesReturnsPage).toHaveBeenCalledWith({
        branchId: 'BR2',
        orgId: 'ORG2',
      });
    });

    it('getSalesReturnById delegates to the repository', async () => {
      vi.mocked(returnsRepository.getSalesById).mockResolvedValue(mockReturn);

      const result = await returnService.getSalesReturnById('RET-1');

      expect(returnsRepository.getSalesById).toHaveBeenCalledWith('RET-1');
      expect(result).toEqual(mockReturn);
    });

    it('createSalesReturn stamps id/date/branch/org/processedBy and persists', async () => {
      const ret: any = {
        saleId: 'SALE-2',
        date: '',
        returnType: 'full',
        items: [],
        totalRefund: 0,
        reason: 'defective',
      };

      const created = await returnService.createSalesReturn(ret);

      expect(returnsRepository.insertSalesReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'RET_NEW',
          branchId: 'BR1',
          orgId: 'ORG1',
          date: expect.any(String),
          processedBy: 'EMP1',
        })
      );
      expect(created).toMatchObject({
        id: 'RET_NEW',
        branchId: 'BR1',
        orgId: 'ORG1',
        processedBy: 'EMP1',
      });
    });

    it('createSalesReturn honors provided date/branchId/processedBy', async () => {
      const ret: any = {
        saleId: 'SALE-3',
        date: '2026-01-05',
        branchId: 'BR9',
        returnType: 'partial',
        items: [],
        totalRefund: 10,
        reason: 'other',
        processedBy: 'EMP2',
      };

      const created = await returnService.createSalesReturn(ret);

      expect(returnsRepository.insertSalesReturn).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-01-05', branchId: 'BR9', processedBy: 'EMP2' })
      );
      expect(created.branchId).toBe('BR9');
    });
  });

  describe('Purchase Returns', () => {
    it('getAllPurchaseReturns resolves branch from settings and delegates', async () => {
      vi.mocked(returnsRepository.getAllPurchases).mockResolvedValue([mockPurchaseReturn]);

      const result = await returnService.getAllPurchaseReturns();

      expect(returnsRepository.getAllPurchases).toHaveBeenCalledWith('BR1', 'ORG1');
      expect(result).toEqual([mockPurchaseReturn]);
    });

    it('getRecentPurchaseReturns delegates with limit', async () => {
      vi.mocked(returnsRepository.getRecentPurchase).mockResolvedValue([]);

      await returnService.getRecentPurchaseReturns('BR1', 30);

      expect(returnsRepository.getRecentPurchase).toHaveBeenCalledWith('BR1', 'ORG1', 30);
    });

    it('getPurchaseReturnById delegates to the repository', async () => {
      vi.mocked(returnsRepository.getPurchaseById).mockResolvedValue(mockPurchaseReturn);

      const result = await returnService.getPurchaseReturnById('PR-1');

      expect(returnsRepository.getPurchaseById).toHaveBeenCalledWith('PR-1');
      expect(result).toEqual(mockPurchaseReturn);
    });

    it('listPurchaseReturnsPage merges settings branch/org into options', async () => {
      vi.mocked(returnsRepository.listPurchaseReturnsPage).mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await returnService.listPurchaseReturnsPage({ page: 3, filters: { search: 's' } });

      expect(returnsRepository.listPurchaseReturnsPage).toHaveBeenCalledWith({
        page: 3,
        filters: { search: 's' },
        branchId: 'BR1',
        orgId: 'ORG1',
      });
    });

    it('createPurchaseReturn stamps id/date/branch/org and attaches serialId from RPC', async () => {
      vi.mocked(returnsRepository.processPurchaseReturnRPC).mockResolvedValue({
        serialId: 'PR-SERIAL',
      });
      const ret: any = {
        purchaseId: 'P-9',
        supplierId: 'SUP-9',
        supplierName: 'Supplier Z',
        date: '2026-01-07',
        items: [],
        totalRefund: 80,
        status: 'completed',
      };

      const created = await returnService.createPurchaseReturn(ret);

      expect(returnsRepository.processPurchaseReturnRPC).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'RET_NEW',
          branchId: 'BR1',
          orgId: 'ORG1',
          purchaseId: 'P-9',
          date: '2026-01-07',
          processedBy: 'EMP1',
          processedByName: 'admin',
        })
      );
      expect(created).toMatchObject({ id: 'RET_NEW', serialId: 'PR-SERIAL' });
    });

    it('createPurchaseReturn leaves serialId undefined when RPC returns null', async () => {
      vi.mocked(returnsRepository.processPurchaseReturnRPC).mockResolvedValue(null);

      const created = await returnService.createPurchaseReturn({
        purchaseId: 'P-9',
        supplierId: 'SUP-9',
        supplierName: 'Supplier Z',
        date: '2026-01-07',
        items: [],
        totalRefund: 80,
        status: 'completed',
      } as any);

      expect(created.serialId).toBeUndefined();
    });
  });

  describe('Save Returns', () => {
    it('saveSalesReturns stamps missing branchId/orgId and delegates', async () => {
      vi.mocked(returnsRepository.upsertSalesReturns).mockResolvedValue(undefined);
      const withBranch = { ...mockReturn, id: 'A', branchId: 'X' };
      const withoutBranch = { ...mockReturn, id: 'B', branchId: undefined, orgId: undefined };

      await returnService.saveSalesReturns([withBranch, withoutBranch]);

      expect(returnsRepository.upsertSalesReturns).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'A', branchId: 'X', orgId: 'ORG1' }),
        expect.objectContaining({ id: 'B', branchId: 'BR1', orgId: 'ORG1' }),
      ]);
    });

    it('savePurchaseReturns stamps missing branchId/orgId and delegates', async () => {
      vi.mocked(returnsRepository.upsertPurchaseReturns).mockResolvedValue(undefined);
      const withBranch = { ...mockPurchaseReturn, id: 'A', branchId: 'X' };
      const withoutBranch = {
        ...mockPurchaseReturn,
        id: 'B',
        branchId: undefined,
        orgId: undefined,
      };

      await returnService.savePurchaseReturns([withBranch, withoutBranch]);

      expect(returnsRepository.upsertPurchaseReturns).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'A', branchId: 'X', orgId: 'ORG1' }),
        expect.objectContaining({ id: 'B', branchId: 'BR1', orgId: 'ORG1' }),
      ]);
    });
  });

  describe('Mappers', () => {
    it('mapFromDb delegates to repository.mapSalesFromDb', () => {
      vi.mocked(returnsRepository.mapSalesFromDb).mockReturnValue(mockReturn);
      const dbRow = { id: 'RET-1' };

      const result = returnService.mapFromDb(dbRow);

      expect(returnsRepository.mapSalesFromDb).toHaveBeenCalledWith(dbRow);
      expect(result).toEqual(mockReturn);
    });

    it('mapToDb delegates to repository.mapSalesToDb', () => {
      vi.mocked(returnsRepository.mapSalesToDb).mockReturnValue({ id: 'RET-1' });
      const partial = { id: 'RET-1' };

      const result = returnService.mapToDb(partial);

      expect(returnsRepository.mapSalesToDb).toHaveBeenCalledWith(partial);
      expect(result).toEqual({ id: 'RET-1' });
    });

    it('mapPurchaseReturnFromDb delegates to repository.mapPurchaseFromDb', () => {
      vi.mocked(returnsRepository.mapPurchaseFromDb).mockReturnValue(mockPurchaseReturn);
      const dbRow = { id: 'PR-1' };

      const result = returnService.mapPurchaseReturnFromDb(dbRow);

      expect(returnsRepository.mapPurchaseFromDb).toHaveBeenCalledWith(dbRow);
      expect(result).toEqual(mockPurchaseReturn);
    });

    it('mapPurchaseReturnToDb delegates to repository.mapPurchaseToDb', () => {
      vi.mocked(returnsRepository.mapPurchaseToDb).mockReturnValue({ id: 'PR-1' });
      const partial = { id: 'PR-1' };

      const result = returnService.mapPurchaseReturnToDb(partial);

      expect(returnsRepository.mapPurchaseToDb).toHaveBeenCalledWith(partial);
      expect(result).toEqual({ id: 'PR-1' });
    });
  });

  describe('unspecified behavior', () => {
    it('CURRENT BEHAVIOR (verify intent): createSalesReturn persists ONLY the returns row — no restock/refund/cash/sale-status side effects', async () => {
      // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
      // services/returns/returnService.ts:42 createSalesReturn only calls insertSalesReturn; it never
      // restocks inventory, issues a refund, or touches cash/sale status. money-leak risk.
      await returnService.createSalesReturn({
        saleId: 'SALE-1',
        date: '2026-01-01',
        returnType: 'partial',
        items: [],
        totalRefund: 50,
        reason: 'damaged',
      } as any);

      expect(returnsRepository.insertSalesReturn).toHaveBeenCalledTimes(1);
      expect(returnsRepository.upsertSalesReturns).not.toHaveBeenCalled();
      expect(returnsRepository.upsertPurchaseReturns).not.toHaveBeenCalled();
      expect(returnsRepository.processPurchaseReturnRPC).not.toHaveBeenCalled();
    });

    it('CURRENT BEHAVIOR (verify intent): listPurchaseReturnsPage always uses settings.orgId, ignoring options.orgId', async () => {
      // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
      // services/returns/returnService.ts:88 — listPurchaseReturnsPage hardcodes orgId: settings.orgId,
      // while listSalesReturnsPage (line 34) uses options.orgId || settings.orgId.
      vi.mocked(returnsRepository.listPurchaseReturnsPage).mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await returnService.listPurchaseReturnsPage({ orgId: 'ORG-X' });

      expect(returnsRepository.listPurchaseReturnsPage).toHaveBeenCalledWith({
        orgId: 'ORG1',
        branchId: 'BR1',
      });
    });

    it('CURRENT BEHAVIOR (verify intent): createPurchaseReturn RPC payload spreads the full PurchaseReturn domain object', async () => {
      // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
      // services/returns/returnService.ts:109-113 — the payload spreads `...newReturn` (supplierId,
      // supplierName, orgId, status, notes, items) beyond the repo's declared PurchaseReturnPayload shape.
      vi.mocked(returnsRepository.processPurchaseReturnRPC).mockResolvedValue(null);

      await returnService.createPurchaseReturn({
        purchaseId: 'P-1',
        supplierId: 'SUP-1',
        supplierName: 'Supplier A',
        date: '2026-01-01',
        items: [{ id: 'i1' } as any],
        totalRefund: 100,
        status: 'completed',
        notes: 'n',
      } as any);

      expect(returnsRepository.processPurchaseReturnRPC).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'SUP-1',
          supplierName: 'Supplier A',
          status: 'completed',
          notes: 'n',
        })
      );
    });
  });
});
