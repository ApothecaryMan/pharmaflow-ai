import { supabase } from '../../../lib/supabase';
import type { LoginAuditEntry } from '../../../types';

export const auditRepository = {
  /**
   * Save a new audit event to the database
   */
  async insert(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('login_audits')
      .insert({
        username: entry.username,
        employee_id: entry.employeeId,
        employee_code: entry.employeeCode,
        role: entry.role,
        branch_id: entry.branchId || null,
        action: entry.action,
        details: entry.details,
      });

    if (error) {
      console.error('[AuditRepository] Failed to insert log:', error);
    }
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
      role: row.role,
      branchId: row.branch_id,
      action: row.action as any,
      details: row.details
    }));
  }
};
