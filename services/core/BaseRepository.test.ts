import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseRepository } from './BaseRepository';
import { NotFoundError, DuplicateRecordError, TenantScopeError } from './errors';

class TestEntity {
  constructor(
    public id: string,
    public name: string,
    public branchId?: string,
    public orgId?: string,
  ) {}
}

class TestRepository extends BaseRepository<TestEntity> {
  protected tableName = 'test_table';
  protected listColumns = 'id, name';
  protected fullColumns = 'id, name, branch_id, org_id';

  mapFromDb(db: Record<string, unknown>): TestEntity {
    return new TestEntity(
      db.id as string,
      db.name as string,
      db.branch_id as string,
      db.org_id as string,
    );
  }

  mapToDb(entity: Partial<TestEntity>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (entity.id !== undefined) db.id = entity.id;
    if (entity.name !== undefined) db.name = entity.name;
    if (entity.branchId !== undefined) db.branch_id = entity.branchId;
    if (entity.orgId !== undefined) db.org_id = entity.orgId;
    return db;
  }
}

describe('BaseRepository', () => {
  let repo: TestRepository;
  let mockQuery: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    };

    repo = new TestRepository(mockSupabase as any);
  });

  describe('applyTenantScope', () => {
    it('should apply branch_id filter when branchId is provided and not "all"', () => {
      const query = { eq: vi.fn().mockReturnThis() };
      (repo as any).applyTenantScope(query, 'B1');
      expect(query.eq).toHaveBeenCalledWith('branch_id', 'B1');
    });

    it('should apply org_id filter when branchId is "all" and orgId is provided', () => {
      const query = { eq: vi.fn().mockReturnThis() };
      (repo as any).applyTenantScope(query, 'all', 'ORG1');
      expect(query.eq).toHaveBeenCalledWith('org_id', 'ORG1');
    });

    it('should apply org_id filter when only orgId is provided (no branchId)', () => {
      const query = { eq: vi.fn().mockReturnThis() };
      (repo as any).applyTenantScope(query, undefined, 'ORG1');
      expect(query.eq).toHaveBeenCalledWith('org_id', 'ORG1');
    });

    it('should not apply any filter when both branchId and orgId are undefined', () => {
      const query = { eq: vi.fn().mockReturnThis() };
      const result = (repo as any).applyTenantScope(query, undefined);
      expect(result).toBe(query);
      expect(query.eq).not.toHaveBeenCalled();
    });

    it('should not apply branch_id filter when branchId is "All" (case insensitive)', () => {
      const query = { eq: vi.fn().mockReturnThis() };
      (repo as any).applyTenantScope(query, 'All', 'ORG1');
      expect(query.eq).toHaveBeenCalledWith('org_id', 'ORG1');
      expect(query.eq).not.toHaveBeenCalledWith('branch_id', 'All');
    });
  });

  describe('getById', () => {
    it('should return entity when found', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: '1', name: 'Test', branch_id: 'B1', org_id: 'ORG1' },
        error: null,
      });
      const result = await repo.getById('1');
      expect(result).toBeInstanceOf(TestEntity);
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Test');
    });

    it('should return null when not found (PGRST116)', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      const result = await repo.getById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST200', message: 'Some error' },
      });
      await expect(repo.getById('1')).rejects.toThrow('Some error');
    });
  });

  describe('insert', () => {
    it('should insert and return mapped entity', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: '1', name: 'New', branch_id: 'B1', org_id: 'ORG1' },
        error: null,
      });
      const result = await repo.insert({ name: 'New' } as any);
      expect(result).toBeInstanceOf(TestEntity);
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
    });

    it('should throw DuplicateRecordError on code 23505', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      });
      await expect(repo.insert({ name: 'Dup' } as any)).rejects.toThrow(DuplicateRecordError);
    });
  });

  describe('update', () => {
    it('should update and return mapped entity', async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: '1', name: 'Updated', branch_id: 'B1', org_id: 'ORG1' },
        error: null,
      });
      const result = await repo.update('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when record missing', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      await expect(repo.update('1', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should return true on success', async () => {
      const result = await repo.delete('1');
      expect(result).toBe(true);
    });

    it('should return false when no rows affected', async () => {
      mockQuery.delete = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      }));
      mockSupabase.from = vi.fn().mockReturnValue({ delete: mockQuery.delete });
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should throw on error', async () => {
      mockQuery.delete = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ error: { code: 'PGRST200', message: 'Delete failed' } }),
        })),
      }));
      mockSupabase.from = vi.fn().mockReturnValue({ delete: mockQuery.delete });
      await expect(repo.delete('1')).rejects.toThrow('Delete failed');
    });
  });

  describe('upsert', () => {
    it('should upsert and return mapped entities', async () => {
      mockQuery.upsert = vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', name: 'Upserted', branch_id: 'B1', org_id: 'ORG1' }],
          error: null,
        }),
      }));
      mockSupabase.from = vi.fn().mockReturnValue({ upsert: mockQuery.upsert });
      const result = await repo.upsert([{ id: '1', name: 'Upserted' } as any]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TestEntity);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array when no data returned', async () => {
      mockQuery.upsert = vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));
      mockSupabase.from = vi.fn().mockReturnValue({ upsert: mockQuery.upsert });
      const result = await repo.upsert([{ id: '1' } as any]);
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockQuery.upsert = vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ error: { code: 'PGRST200', message: 'Upsert failed' } }),
      }));
      mockSupabase.from = vi.fn().mockReturnValue({ upsert: mockQuery.upsert });
      await expect(repo.upsert([{ id: '1' } as any])).rejects.toThrow('Upsert failed');
    });
  });

  describe('wrapError', () => {
    it('should return DuplicateRecordError for code 23505', () => {
      const err = (repo as any).wrapError({ code: '23505', message: 'dup' });
      expect(err).toBeInstanceOf(DuplicateRecordError);
    });

    it('should return NotFoundError for code PGRST116', () => {
      const err = (repo as any).wrapError({ code: 'PGRST116', message: 'not found' });
      expect(err).toBeInstanceOf(NotFoundError);
    });

    it('should return TenantScopeError for permission-related messages', () => {
      const err = (repo as any).wrapError({ code: 'PGRST200', message: 'violates row-level security' });
      expect(err).toBeInstanceOf(TenantScopeError);
    });

    it('should return generic Error for unknown codes', () => {
      const err = (repo as any).wrapError({ code: 'UNKNOWN', message: 'something broke' });
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(NotFoundError);
    });
  });
});
