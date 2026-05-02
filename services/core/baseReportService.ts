import { supabase } from '../../lib/supabase';

export interface BaseReportFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

/**
 * BaseReportService
 * 
 * A specialized service for read-heavy, append-only, or historical data.
 * Unlike BaseDomainService, this focuses on history fetching, pagination, and 
 * data aggregation (sums, counts).
 * 
 * Architecture Note: This is kept separate from BaseDomainService because 
 * reporting data (like Stock Movements) should generally not be modified or 
 * deleted via standard CRUD methods, maintaining data integrity.
 */
export abstract class BaseReportService<T, TFilters extends BaseReportFilters> {
  protected abstract tableName: string;
  protected dateColumn: string = 'timestamp';
  protected branchColumn: string = 'branch_id';

  /**
   * Maps a database record to the domain object.
   */
  protected abstract mapDbToDomain(db: any): T;

  /**
   * Maps a domain object to a database record.
   */
  protected abstract mapDomainToDb(domain: Partial<T>): any;

  /**
   * Fetches history based on provided filters.
   */
  async getHistory(filters: TFilters): Promise<T[] | PaginatedResult<T>> {
    try {
      let query = supabase.from(this.tableName).select('*', { count: filters.page !== undefined ? 'exact' : undefined });

      if (filters.branchId && filters.branchId.toLowerCase() !== 'all') {
        query = query.eq(this.branchColumn, filters.branchId);
      }

      if (filters.startDate) {
        query = query.gte(this.dateColumn, filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte(this.dateColumn, filters.endDate);
      }

      // Apply custom filters from child class
      query = this.applyCustomFilters(query, filters);

      // Add default ordering: newest first
      query = query.order(this.dateColumn, { ascending: false });

      // Apply pagination if provided
      if (filters.page !== undefined && filters.pageSize !== undefined) {
        const from = (filters.page - 1) * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`[BaseReportService] Error fetching history from ${this.tableName}:`, error);
        return [];
      }

      const results = (data || []).map((item) => this.mapDbToDomain(item));

      if (filters.page !== undefined && filters.pageSize !== undefined) {
        return {
          data: results,
          total: count || 0,
          hasMore: (count || 0) > (filters.page * filters.pageSize),
        };
      }

      return results;
    } catch (err) {
      console.error(`[BaseReportService] Critical error in getHistory for ${this.tableName}:`, err);
      return [];
    }
  }

  /**
   * Generic method to apply custom filters.
   * To be overridden or extended by child classes.
   */
  protected applyCustomFilters(query: any, filters: TFilters): any {
    return query;
  }

  /**
   * Fetches aggregated data (sum, count) for specific columns.
   * Optimized to only fetch the columns needed for aggregation.
   */
  async getAggregates(
    filters: TFilters,
    sumColumns: string[] = []
  ): Promise<{ count: number; sums: Record<string, number> }> {
    try {
      // If we only need count, we can use head: true
      const selectColumns = sumColumns.length > 0 ? sumColumns.join(',') : 'id';
      let query = supabase.from(this.tableName).select(selectColumns, { count: 'exact' });

      if (filters.branchId && filters.branchId.toLowerCase() !== 'all') {
        query = query.eq(this.branchColumn, filters.branchId);
      }

      if (filters.startDate) {
        query = query.gte(this.dateColumn, filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte(this.dateColumn, filters.endDate);
      }

      // Apply custom filters
      query = this.applyCustomFilters(query, filters);

      const { data, error, count } = await query;

      if (error) {
        console.error(`[BaseReportService] Error fetching aggregates from ${this.tableName}:`, error);
        return { count: 0, sums: {} };
      }

      const sums: Record<string, number> = {};
      sumColumns.forEach((col) => {
        sums[col] = (data || []).reduce((acc, row: any) => acc + (Number(row[col]) || 0), 0);
      });

      return {
        count: count || 0,
        sums,
      };
    } catch (err) {
      console.error(`[BaseReportService] Critical error in getAggregates for ${this.tableName}:`, err);
      return { count: 0, sums: {} };
    }
  }
}
