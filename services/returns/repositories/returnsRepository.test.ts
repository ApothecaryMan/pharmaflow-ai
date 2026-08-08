import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { returnsRepository } from './returnsRepository';

const { mockQueryBuilder, mockState } = vi.hoisted(() => {
  const mockQueryBuilder: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  return { mockQueryBuilder, mockState: { result: { data: [], error: null } as any } };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  },
}));

describe('returnsRepository', () => {
  const salesDbRow = {
    id: 'RET-1',
    serial_id: 'RET-0001',
    org_id: 'ORG1',
    branch_id: 'BR1',
    date: '2026-01-01T10:00:00.000Z',
    sale_id: 'SALE-1',
    return_type: 'partial',
    total_refund: 50,
    reason: 'damaged',
    notes: 'note',
    processed_by: 'EMP1',
    items: [
      {
        drug_id: 'D1',
        sale_item_id: 'SI1',
        name: 'Drug A',
        quantity_returned: 2,
        is_unit: true,
        public_price: 10,
        refund_amount: 20,
        reason: 'damaged',
        condition: 'damaged',
        dosage_form: 'tab',
        expiry_date: '2027-01-01',
      },
    ],
  };

  const purchaseDbRow = {
    id: 'PR-1',
    serial_id: 'PR-0001',
    org_id: 'ORG1',
    branch_id: 'BR1',
    date: '2026-01-02T10:00:00.000Z',
    purchase_id: 'P-1',
    supplier_id: 'SUP-1',
    supplier_name_snapshot: 'Supplier A',
    total_refund: 100,
    status: 'completed',
    payment_method: 'cash',
    notes: 'note',
    items: [
      {
        drug_id: 'D1',
        name: 'Drug A',
        quantity_returned: 1,
        is_unit: false,
        public_price: 10,
        refund_amount: 10,
        reason: 'damaged',
        condition: 'damaged',
        dosage_form: 'tab',
        expiry_date: '2027-01-01',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.result = { data: [], error: null };
    mockQueryBuilder.then.mockImplementation((onfulfilled: any, onrejected: any) =>
      Promise.resolve(mockState.result).then(onfulfilled, onrejected)
    );
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
  });

  describe('mapSalesFromDb', () => {
    it('maps all fields including nested items', () => {
      const result = returnsRepository.mapSalesFromDb(salesDbRow);

      expect(result).toEqual({
        id: 'RET-1',
        serialId: 'RET-0001',
        orgId: 'ORG1',
        branchId: 'BR1',
        date: '2026-01-01T10:00:00.000Z',
        saleId: 'SALE-1',
        returnType: 'partial',
        items: [
          {
            drugId: 'D1',
            saleItemId: 'SI1',
            name: 'Drug A',
            quantityReturned: 2,
            isUnit: true,
            publicPrice: 10,
            refundAmount: 20,
            reason: 'damaged',
            condition: 'damaged',
            dosageForm: 'tab',
            expiryDate: '2027-01-01',
          },
        ],
        totalRefund: 50,
        reason: 'damaged',
        notes: 'note',
        processedBy: 'EMP1',
      });
    });

    it('defaults returnType to partial when missing', () => {
      const result = returnsRepository.mapSalesFromDb({ ...salesDbRow, return_type: undefined });

      expect(result.returnType).toBe('partial');
    });

    describe('unspecified behavior', () => {
      it('CURRENT BEHAVIOR (verify intent): falls back to total_amount when total_refund is missing', () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:85 — total_refund || total_amount || 0; `total_amount` is not a column on
        // the returns table in the schema (schema-drift sign / legacy fallback).
        const result = returnsRepository.mapSalesFromDb({
          ...salesDbRow,
          total_refund: undefined,
          total_amount: 75,
        });

        expect(result.totalRefund).toBe(75);
      });

      it('CURRENT BEHAVIOR (verify intent): defaults totalRefund to 0 when both total_refund and total_amount are missing', () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:85 — the || chain masks a missing refund figure as 0.
        const result = returnsRepository.mapSalesFromDb({
          ...salesDbRow,
          total_refund: undefined,
          total_amount: undefined,
        });

        expect(result.totalRefund).toBe(0);
      });

      it('CURRENT BEHAVIOR (verify intent): falls back to employee_id for processedBy when processed_by is missing', () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:88 — processed_by || employee_id; `employee_id` is not a column on the
        // returns table in the schema (schema-drift sign / legacy fallback).
        const result = returnsRepository.mapSalesFromDb({
          ...salesDbRow,
          processed_by: undefined,
          employee_id: 'EMP-LEGACY',
        });

        expect(result.processedBy).toBe('EMP-LEGACY');
      });
    });
  });

  describe('mapSalesToDb', () => {
    it('maps all defined fields to snake_case', () => {
      const result = returnsRepository.mapSalesToDb({
        id: 'RET-1',
        serialId: 'RET-0001',
        orgId: 'ORG1',
        branchId: 'BR1',
        date: '2026-01-01',
        saleId: 'SALE-1',
        returnType: 'full',
        totalRefund: 100,
        reason: 'defective',
        notes: 'note',
        processedBy: 'EMP1',
      });

      expect(result).toEqual({
        id: 'RET-1',
        serial_id: 'RET-0001',
        org_id: 'ORG1',
        branch_id: 'BR1',
        date: '2026-01-01',
        sale_id: 'SALE-1',
        return_type: 'full',
        total_refund: 100,
        reason: 'defective',
        notes: 'note',
        processed_by: 'EMP1',
      });
    });

    it('omits undefined fields and never maps the items array', () => {
      const result = returnsRepository.mapSalesToDb({ id: 'RET-1' });

      expect(result).toEqual({ id: 'RET-1' });
      expect(result).not.toHaveProperty('items');
    });
  });

  describe('mapPurchaseFromDb', () => {
    it('maps all fields including nested items', () => {
      const result = returnsRepository.mapPurchaseFromDb(purchaseDbRow);

      expect(result).toEqual({
        id: 'PR-1',
        serialId: 'PR-0001',
        orgId: 'ORG1',
        branchId: 'BR1',
        date: '2026-01-02T10:00:00.000Z',
        purchaseId: 'P-1',
        supplierId: 'SUP-1',
        supplierName: 'Supplier A',
        items: [
          {
            drugId: 'D1',
            name: 'Drug A',
            quantityReturned: 1,
            isUnit: false,
            publicPrice: 10,
            refundAmount: 10,
            reason: 'damaged',
            condition: 'damaged',
            dosageForm: 'tab',
            expiryDate: '2027-01-01',
          },
        ],
        totalRefund: 100,
        status: 'completed',
        paymentMethod: 'cash',
        notes: 'note',
      });
    });

    it('defaults status to completed when missing', () => {
      const result = returnsRepository.mapPurchaseFromDb({ ...purchaseDbRow, status: undefined });

      expect(result.status).toBe('completed');
    });

    describe('unspecified behavior', () => {
      it('CURRENT BEHAVIOR (verify intent): returns undefined (not 0) when total_refund is missing — no fallback unlike mapSalesFromDb', () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:131 — `totalRefund: db.total_refund` has no fallback, so a missing value
        // yields undefined while mapSalesFromDb (line 85) falls back to 0.
        const result = returnsRepository.mapPurchaseFromDb({
          ...purchaseDbRow,
          total_refund: undefined,
        });

        expect(result.totalRefund).toBeUndefined();
      });
    });
  });

  describe('mapPurchaseToDb', () => {
    it('maps all defined fields to snake_case', () => {
      const result = returnsRepository.mapPurchaseToDb({
        id: 'PR-1',
        serialId: 'PR-0001',
        orgId: 'ORG1',
        branchId: 'BR1',
        date: '2026-01-02',
        purchaseId: 'P-1',
        supplierId: 'SUP-1',
        supplierName: 'Supplier A',
        totalRefund: 100,
        status: 'completed',
        paymentMethod: 'credit',
        notes: 'note',
      });

      expect(result).toEqual({
        id: 'PR-1',
        serial_id: 'PR-0001',
        org_id: 'ORG1',
        branch_id: 'BR1',
        date: '2026-01-02',
        purchase_id: 'P-1',
        supplier_id: 'SUP-1',
        supplier_name_snapshot: 'Supplier A',
        total_refund: 100,
        status: 'completed',
        payment_method: 'credit',
        notes: 'note',
      });
    });

    it('omits undefined fields and never maps the items array', () => {
      const result = returnsRepository.mapPurchaseToDb({ id: 'PR-1' });

      expect(result).toEqual({ id: 'PR-1' });
      expect(result).not.toHaveProperty('items');
    });
  });

  describe('getAllSales', () => {
    it('scopes to branch when a branch is provided', async () => {
      mockState.result = { data: [salesDbRow], error: null };

      const result = await returnsRepository.getAllSales('BR1', 'ORG1');

      expect(supabase.from).toHaveBeenCalledWith('returns');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, items:return_items(*)');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('RET-1');
    });

    it('scopes to org when branch is all', async () => {
      await returnsRepository.getAllSales('all', 'ORG1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('org_id', 'ORG1');
      expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith('branch_id', 'all');
    });

    it('applies no scoping when branch and org are absent', async () => {
      await returnsRepository.getAllSales('', '');

      expect(mockQueryBuilder.eq).not.toHaveBeenCalled();
    });

    it('throws when the query errors', async () => {
      mockState.result = { data: null, error: new Error('db down') };

      await expect(returnsRepository.getAllSales('BR1')).rejects.toThrow('db down');
    });
  });

  describe('getRecentSales', () => {
    it('scopes to branch and applies the limit', async () => {
      await returnsRepository.getRecentSales('BR1', 'ORG1', 25);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
    });

    it('scopes to org when branch is all (case-insensitive)', async () => {
      await returnsRepository.getRecentSales('ALL', 'ORG1', 100);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('org_id', 'ORG1');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('getSalesById', () => {
    it('returns the mapped row', async () => {
      mockState.result = { data: salesDbRow, error: null };

      const result = await returnsRepository.getSalesById('RET-1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'RET-1');
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
      expect(result?.id).toBe('RET-1');
    });

    it('returns null when no row matches', async () => {
      mockState.result = { data: null, error: null };

      const result = await returnsRepository.getSalesById('RET-1');

      expect(result).toBeNull();
    });

    it('throws when the query errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(returnsRepository.getSalesById('RET-1')).rejects.toThrow('boom');
    });
  });

  describe('listSalesReturnsPage', () => {
    it('uses default pagination range for empty options', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({});

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, items:return_items(*)', {
        count: 'exact',
      });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
    });

    it('clamps a negative pageSize to a minimum of 1', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ page: 1, pageSize: -5 });

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 0);
    });

    it('treats pageSize 0 as the default of 50', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ page: 1, pageSize: 0 });

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49);
    });

    it('clamps pageSize to a maximum of 200', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ page: 1, pageSize: 500 });

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 199);
    });

    it('computes range from page and pageSize', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ page: 2, pageSize: 25 });

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(25, 49);
    });

    it('scopes to branch when a branch is provided', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ branchId: 'BR1' });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
    });

    it('scopes to org when branch is all', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ branchId: 'all', orgId: 'ORG1' });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('org_id', 'ORG1');
    });

    it('applies date filters', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({
        filters: { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('date', '2026-01-01');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('date', '2026-01-31');
    });

    it('applies the reason filter', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ filters: { reason: 'damaged' } });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('reason', 'damaged');
    });

    it('uses id/sale_id eq filters for a UUID search term', async () => {
      mockState.result = { data: [], error: null, count: 0 };
      const term = '7b7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a';

      await returnsRepository.listSalesReturnsPage({ filters: { search: term } });

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(`id.eq.${term},sale_id.eq.${term}`);
    });

    it('sanitizes LIKE metacharacters but preserves trailing spaces in the search term', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({ filters: { search: '  RET-001%_ , ' } });

      expect(mockQueryBuilder.or).toHaveBeenCalledWith('serial_id.ilike.%RET-001 %');
    });

    it('applies custom sort column and direction', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listSalesReturnsPage({
        sort: { column: 'total_refund', ascending: true },
      });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('total_refund', { ascending: true });
    });

    it('returns total from the exact count', async () => {
      mockState.result = { data: [salesDbRow], error: null, count: 42 };

      const result = await returnsRepository.listSalesReturnsPage({ page: 1, pageSize: 50 });

      expect(result.total).toBe(42);
      expect(result.rows).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('throws when the query errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(returnsRepository.listSalesReturnsPage({})).rejects.toThrow('boom');
    });
  });

  describe('insertSalesReturn', () => {
    it('inserts the mapped db row', async () => {
      mockState.result = { data: null, error: null };

      await returnsRepository.insertSalesReturn({
        id: 'RET-1',
        branchId: 'BR1',
        saleId: 'SALE-1',
        date: '2026-01-01',
        returnType: 'partial',
        items: [],
        totalRefund: 50,
        reason: 'damaged',
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'RET-1', branch_id: 'BR1', total_refund: 50 })
      );
    });

    describe('unspecified behavior', () => {
      it('CURRENT BEHAVIOR (verify intent): insertSalesReturn drops the processedBy argument (never forwarded to insertReturn)', async () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:252-254 — insertSalesReturn calls this.insertReturn(ret) with a single
        // argument, so callers cannot pass a processedBy/processed_by through it (unlike insertReturn,
        // which forwards an explicit processedBy param). A caller must set processed_by via ret.processedBy.
        mockState.result = { data: null, error: null };

        await returnsRepository.insertSalesReturn({
          id: 'RET-1',
          branchId: 'BR1',
          saleId: 'SALE-1',
          date: '2026-01-01',
          returnType: 'partial',
          items: [],
          totalRefund: 0,
          reason: 'other',
        } as any);

        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.not.objectContaining({ processed_by: expect.anything() })
        );
      });
    });

    it('throws when the insert errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(returnsRepository.insertSalesReturn({ id: 'RET-1' } as any)).rejects.toThrow(
        'boom'
      );
    });
  });

  describe('upsertSalesReturns', () => {
    it('returns early without querying for an empty list', async () => {
      await returnsRepository.upsertSalesReturns([]);

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts mapped rows', async () => {
      mockState.result = { data: null, error: null };

      await returnsRepository.upsertSalesReturns([
        {
          id: 'RET-1',
          branchId: 'BR1',
          saleId: 'SALE-1',
          date: '2026-01-01',
          returnType: 'partial',
          items: [],
          totalRefund: 50,
          reason: 'damaged',
        },
      ]);

      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'RET-1', branch_id: 'BR1' }),
      ]);
    });

    it('throws when the upsert errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(returnsRepository.upsertSalesReturns([{ id: 'RET-1' } as any])).rejects.toThrow(
        'boom'
      );
    });
  });

  describe('getAllPurchases', () => {
    it('scopes to branch and orders by date descending', async () => {
      mockState.result = { data: [purchaseDbRow], error: null };

      const result = await returnsRepository.getAllPurchases('BR1', 'ORG1');

      expect(supabase.from).toHaveBeenCalledWith('purchase_returns');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, items:purchase_return_items(*)');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(result[0].id).toBe('PR-1');
    });

    it('scopes to org when branch is all', async () => {
      await returnsRepository.getAllPurchases('all', 'ORG1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('org_id', 'ORG1');
    });
  });

  describe('getRecentPurchase', () => {
    it('scopes to branch and applies the limit', async () => {
      await returnsRepository.getRecentPurchase('BR1', 'ORG1', 30);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(30);
    });
  });

  describe('getPurchaseById', () => {
    it('returns the mapped row', async () => {
      mockState.result = { data: purchaseDbRow, error: null };

      const result = await returnsRepository.getPurchaseById('PR-1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'PR-1');
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
      expect(result?.id).toBe('PR-1');
    });

    it('returns null when no row matches', async () => {
      mockState.result = { data: null, error: null };

      const result = await returnsRepository.getPurchaseById('PR-1');

      expect(result).toBeNull();
    });
  });

  describe('listPurchaseReturnsPage', () => {
    it('uses default pagination range for empty options', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listPurchaseReturnsPage({});

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*, items:purchase_return_items(*)', {
        count: 'exact',
      });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 49);
    });

    it('scopes to branch when a branch is provided', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listPurchaseReturnsPage({ branchId: 'BR1' });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
    });

    it('applies date filters', async () => {
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listPurchaseReturnsPage({
        filters: { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
      });

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('date', '2026-01-01');
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('date', '2026-01-31');
    });

    describe('unspecified behavior', () => {
      it('CURRENT BEHAVIOR (verify intent): ignores the reason filter, unlike listSalesReturnsPage', () => {
        // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
        // returnsRepository.ts:341-342 — the purchase page applies date filters only; a filters.reason
        // value is never sent to the query (purchase_returns has no reason column, so likely intentional).
        mockState.result = { data: [], error: null, count: 0 };

        return returnsRepository
          .listPurchaseReturnsPage({ filters: { reason: 'damaged' } })
          .then(() => {
            expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith('reason', 'damaged');
          });
      });
    });

    it('uses id/purchase_id eq filters for a UUID search term', async () => {
      mockState.result = { data: [], error: null, count: 0 };
      const term = '7b7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a';

      await returnsRepository.listPurchaseReturnsPage({ filters: { search: term } });

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(`id.eq.${term},purchase_id.eq.${term}`);
    });

    it.skip('CURRENTLY BUGGY (BUG-D9): non-UUID search filters on supplier_name, a column that does not exist on purchase_returns', async () => {
      // BUG-D9: must be supplier_name_snapshot; currently supplier_name.
      // The only supplier-name column is supplier_name_snapshot (migrations/20260322000000_initial_schema.sql:285;
      // mapper reads it at returnsRepository.ts:118; inserts write it at returnsRepository.ts:147). PostgREST
      // errors on filters against an unknown column, so this search branch cannot match.
      // Test asserts the CORRECT column, red on current code. TODO: re-enable after BUG-D9 fix.
      mockState.result = { data: [], error: null, count: 0 };

      await returnsRepository.listPurchaseReturnsPage({ filters: { search: 'Supplier A' } });

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        'serial_id.ilike.%Supplier A%,supplier_name_snapshot.ilike.%Supplier A%'
      );
    });

    it('throws when the query errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(returnsRepository.listPurchaseReturnsPage({})).rejects.toThrow('boom');
    });
  });

  describe('insertPurchaseReturn', () => {
    it('inserts the mapped db row', async () => {
      mockState.result = { data: null, error: null };

      await returnsRepository.insertPurchaseReturn({
        id: 'PR-1',
        branchId: 'BR1',
        purchaseId: 'P-1',
        supplierId: 'SUP-1',
        supplierName: 'Supplier A',
        date: '2026-01-02',
        items: [],
        totalRefund: 100,
        status: 'completed',
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PR-1',
          purchase_id: 'P-1',
          supplier_name_snapshot: 'Supplier A',
        })
      );
    });
  });

  describe('upsertPurchaseReturns', () => {
    it('returns early without querying for an empty list', async () => {
      await returnsRepository.upsertPurchaseReturns([]);

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts mapped rows', async () => {
      mockState.result = { data: null, error: null };

      await returnsRepository.upsertPurchaseReturns([
        {
          id: 'PR-1',
          branchId: 'BR1',
          purchaseId: 'P-1',
          supplierId: 'SUP-1',
          supplierName: 'S',
          date: '2026-01-02',
          items: [],
          totalRefund: 0,
          status: 'completed',
        },
      ]);

      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'PR-1', supplier_name_snapshot: 'S' }),
      ]);
    });

    it('throws when the upsert errors', async () => {
      mockState.result = { data: null, error: new Error('boom') };

      await expect(
        returnsRepository.upsertPurchaseReturns([{ id: 'PR-1' } as any])
      ).rejects.toThrow('boom');
    });
  });

  describe('processPurchaseReturnRPC', () => {
    it('calls the process_purchase_return RPC with the p_payload argument', async () => {
      const payload = { id: 'PR-1', branchId: 'BR1', purchaseId: 'P-1' };

      await returnsRepository.processPurchaseReturnRPC(payload as any);

      expect(supabase.rpc).toHaveBeenCalledWith('process_purchase_return', {
        p_payload: payload,
      });
    });

    it('returns the RPC data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { serialId: 'PR-SERIAL' },
        error: null,
      });

      const result = await returnsRepository.processPurchaseReturnRPC({} as any);

      expect(result).toEqual({ serialId: 'PR-SERIAL' });
    });

    it('throws when the RPC errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('rpc boom'),
      });

      await expect(returnsRepository.processPurchaseReturnRPC({} as any)).rejects.toThrow(
        'rpc boom'
      );
    });
  });
});
