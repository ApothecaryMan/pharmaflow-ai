import { supabase as defaultSupabase } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, DuplicateRecordError, TenantScopeError } from './errors';

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract tableName: string;
  protected abstract listColumns: string;
  protected abstract fullColumns: string;

  abstract mapFromDb(db: Record<string, unknown>): T;
  abstract mapToDb(entity: Partial<T>): Record<string, unknown>;

  constructor(protected supabase: SupabaseClient = defaultSupabase) {}

  protected applyTenantScope(query: any, branchId?: string, orgId?: string): any {
    const isAll = typeof branchId === 'string' && branchId.toLowerCase() === 'all';
    if (branchId && !isAll) {
      return query.eq('branch_id', branchId);
    }
    if (orgId) {
      return query.eq('org_id', orgId);
    }
    return query;
  }

  async getById(id: string, branchId?: string, orgId?: string): Promise<T | null> {
    const query = (this.supabase as any)
      .from(this.tableName)
      .select(this.fullColumns)
      .eq('id', id);

    const { data, error } = await this.applyTenantScope(query, branchId, orgId).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw this.wrapError(error);
    }

    return this.mapFromDb(data);
  }

  async insert(entity: Partial<T>): Promise<T> {
    const dbEntity = this.mapToDb(entity);
    const { data, error } = await (this.supabase as any)
      .from(this.tableName)
      .insert(dbEntity)
      .select(this.listColumns)
      .single();

    if (error) {
      if (error.code === '23505') throw new DuplicateRecordError(error.message);
      throw this.wrapError(error);
    }

    return this.mapFromDb(data);
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const dbUpdates = this.mapToDb(updates);
    const { data, error } = await (this.supabase as any)
      .from(this.tableName)
      .update(dbUpdates)
      .eq('id', id)
      .select(this.listColumns)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundError(`Record not found: ${id}`);
      throw this.wrapError(error);
    }

    return this.mapFromDb(data);
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any)
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select();

    if (error) throw this.wrapError(error);
    return data !== null && data.length > 0;
  }

  async upsert(entities: Partial<T>[]): Promise<T[]> {
    const dbEntities = entities.map(e => this.mapToDb(e));
    const { data, error } = await (this.supabase as any)
      .from(this.tableName)
      .upsert(dbEntities)
      .select(this.listColumns);

    if (error) throw this.wrapError(error);
    return (data || []).map((e: any) => this.mapFromDb(e));
  }

  protected wrapError(error: any): Error {
    if (error.code === '23505') return new DuplicateRecordError(error.message);
    if (error.code === 'PGRST116') return new NotFoundError(error.message);
    if (
      error.message?.toLowerCase().includes('permission') ||
      error.message?.toLowerCase().includes('policy') ||
      error.message?.toLowerCase().includes('violates row-level security')
    ) {
      return new TenantScopeError(error.message);
    }
    return new Error(error.message || 'Database error');
  }
}
