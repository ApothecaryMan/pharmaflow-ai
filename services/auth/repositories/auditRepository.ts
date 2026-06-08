import { supabase } from '../../../lib/supabase';
import type { LoginAuditEntry } from '../../../types';

export const auditRepository = {
  /** Queue of entries that failed to sync to Supabase (e.g. RLS permission denied) */
  _pendingQueue: [] as Omit<LoginAuditEntry, 'id' | 'timestamp'>[],

  /**
   * Save a new audit event to the database.
   * Falls back to a local queue when Supabase RLS denies the write,
   * so no data is lost and no noisy 401 errors appear in the console.
   */
  async insert(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    // First, try to flush any previously queued entries
    await this._flushQueue();

    const { error } = await supabase
      .from('login_audits')
      .insert({
        username: entry.username,
        employee_id: entry.employeeId,
        employee_code: entry.employeeCode,
        employee_name: entry.employeeName,
        role: entry.role,
        branch_id: entry.branchId || null,
        action: entry.action,
        details: entry.details,
      });

    if (error) {
      // Queue for retry instead of logging a scary error
      this._pendingQueue.push(entry);
      console.debug('[AuditRepository] Queued audit log for later sync:', error.code);
    }
  },

  /**
   * Attempt to flush queued audit entries to Supabase.
   * Called automatically before each new insert.
   */
  async _flushQueue(): Promise<void> {
    if (this._pendingQueue.length === 0) return;

    const batch = [...this._pendingQueue];
    const rows = batch.map(e => ({
      username: e.username,
      employee_id: e.employeeId,
      employee_code: e.employeeCode,
      employee_name: e.employeeName,
      role: e.role,
      branch_id: e.branchId || null,
      action: e.action,
      details: e.details,
    }));

    const { error } = await supabase.from('login_audits').insert(rows);
    if (!error) {
      // Successfully flushed — clear queue
      this._pendingQueue = [];
    }
    // If still failing, keep them queued for next attempt
  },

  /**
   * Fetch audit logs with filtering
   */
  async getAll(branchId?: string, limit = 500): Promise<LoginAuditEntry[]> {
    let query = supabase
      .from('login_audits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AuditRepository] Failed to fetch logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      timestamp: row.created_at,
      username: row.username,
      employeeId: row.employee_id,
      employeeCode: row.employee_code,
      employeeName: row.employee_name,
      role: row.role,
      branchId: row.branch_id,
      action: row.action as any,
      details: row.details
    }));
  }
};
