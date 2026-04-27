import { supabase } from '../../lib/supabase';
import { settingsService } from '../settings/settingsService';
import { idGenerator } from '../../utils/idGenerator';

export abstract class BaseDomainService<T extends { id: string; branchId?: string; orgId?: string }> {
  protected abstract tableName: string;

  /**
   * Maps a database record to the domain object.
   */
  protected abstract mapDbToDomain(db: any): T;

  /**
   * Maps a domain object to a database record.
   */
  protected abstract mapDomainToDb(domain: Partial<T>): any;

  /**
   * Fetches all records for a specific branch.
   */
  async getAll(branchId?: string): Promise<T[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const isAllBranch = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    try {
      let query = (supabase as any).from(this.tableName).select('*');
      
      if (effectiveBranchId && !isAllBranch) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAllBranch && settings.orgId) {
        // If fetching all branches, scope to the organization to maintain multi-tenancy
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error(`[BaseDomainService] getAll failed for ${this.tableName}:`, err);
      return [];
    }
  }

  /**
   * Fetches a single record by ID.
   */
  async getById(id: string): Promise<T | null> {
    try {
      const { data, error } = await (supabase as any)
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data ? this.mapDbToDomain(data) : null;
    } catch (err) {
      console.error(`[BaseDomainService] getById failed for ${this.tableName}:`, err);
      return null;
    }
  }

  /**
   * Creates a new record.
   */
  async create(data: Omit<T, 'id'>, branchId?: string): Promise<T> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (data as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newEntity: T = {
      ...data,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: (data as any).orgId || settings.orgId,
    } as T;

    const dbData = this.mapDomainToDb(newEntity);
    const { error } = await (supabase as any).from(this.tableName).insert(dbData);
    if (error) throw error;

    return newEntity;
  }

  /**
   * Updates an existing record.
   */
  async update(id: string, updates: Partial<T>, skipFetch: boolean = false): Promise<T> {
    const dbUpdates = this.mapDomainToDb(updates);
    const { error } = await (supabase as any)
      .from(this.tableName)
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
    
    if (skipFetch) {
      return { id, ...updates } as T;
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Entity not found after update: ${id}`);
    return updated;
  }

  /**
   * Deletes a record.
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await (supabase as any).from(this.tableName).delete().eq('id', id);
    if (error) return false;
    return true;
  }
}
