import { supabase } from '../../lib/supabase';
import { settingsService } from '../settings/settingsService';
import { BaseDomainService } from './BaseDomainService';

/**
 * BaseEntityService extends BaseDomainService to provide standardized
 * search and status-based filtering for business entities like Customers and Suppliers.
 */
export abstract class BaseEntityService<T extends { id: string; branchId?: string; orgId?: string; status?: string }> extends BaseDomainService<T> {
  /**
   * Column(s) used for text search. Defaults to 'name'.
   */
  protected searchColumns: string[] = ['name'];

  /**
   * Searches for entities based on a query string.
   * Performs an 'ilike' search on specified columns.
   */
  async search(query: string, branchId?: string): Promise<T[]> {
    if (!query || query.trim() === '') {
      return this.getAll(branchId);
    }

    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const isAllBranch = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    try {
      let supabaseQuery = (supabase as any).from(this.tableName).select('*');
      
      if (effectiveBranchId && !isAllBranch) {
        supabaseQuery = supabaseQuery.eq('branch_id', effectiveBranchId);
      } else if (isAllBranch && settings.orgId) {
        supabaseQuery = supabaseQuery.eq('org_id', settings.orgId);
      }

      // Build OR filter for search columns
      const orFilter = this.searchColumns
        .map(col => `${col}.ilike.%${query}%`)
        .join(',');
      
      supabaseQuery = supabaseQuery.or(orFilter);

      const { data, error } = await supabaseQuery;
      if (error) throw error;

      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error(`[BaseEntityService] search failed for ${this.tableName}:`, err);
      return [];
    }
  }

  /**
   * Filters entities by their status (e.g., 'active', 'inactive').
   */
  async filterByStatus(status: string, branchId?: string): Promise<T[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const isAllBranch = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    try {
      let query = (supabase as any).from(this.tableName).select('*').eq('status', status);
      
      if (effectiveBranchId && !isAllBranch) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAllBranch && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error(`[BaseEntityService] filterByStatus failed for ${this.tableName}:`, err);
      return [];
    }
  }
}
