import { supabase } from '../../../lib/supabase';
import type { LoginAuditEntry } from '../../../types';

export const auditRepository = {
  /** Queue of entries that failed to sync to Supabase (e.g. RLS permission denied) */
  _pendingQueue: [] as Omit<LoginAuditEntry, 'id' | 'timestamp'>[],
  _listenerAttached: false,

  /**
   * Attach a one-time onAuthStateChange listener that flushes the pending
   * queue as soon as the user's session becomes available. This handles the
   * race condition where audit events fire before the auth state propagates.
   */
  _ensureAuthListener(): void {
    if (this._listenerAttached) return;
    this._listenerAttached = true;

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this._flushQueue();
      }
    });
  },

  /**
   * Save a new audit event to the database via SECURITY DEFINER RPC.
   * Falls back to a local queue when Supabase is unreachable,
   * so no data is lost and no noisy 401 errors appear in the console.
   */
  async insert(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    // Ensure auth listener is wired up to flush queue on sign-in
    this._ensureAuthListener();

    // Try to flush any previously queued entries first
    await this._flushQueue();

    const isValidUuid = (id: string | undefined | null) => 
      id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;

    const safeAction = ['login', 'logout'].includes(entry.action) ? entry.action : 'login';
    const finalDetails = entry.action === safeAction 
      ? entry.details 
      : `[Action: ${entry.action}] ${entry.details || ''}`;

    const { error } = await supabase.rpc('log_audit_event', {
      p_username: entry.username || 'System',
      p_employee_id: isValidUuid(entry.employeeId),
      p_employee_code: entry.employeeCode || null,
      p_employee_name: entry.employeeName || null,
      p_role: entry.role || 'unassigned',
      p_branch_id: isValidUuid(entry.branchId),
      p_org_id: isValidUuid(entry.orgId),
      p_action: safeAction,
      p_details: finalDetails || null,
    });

    if (error) {
      // Only queue for retry on network errors (5xx) or timeout.
      // Do NOT queue 400 (Bad Request) or 401/403 (Auth issues) to prevent infinite loops.
      const shouldRetry = error.code && !error.code.startsWith('40') && !error.message?.includes('JWT');
      
      if (shouldRetry) {
        this._pendingQueue.push(entry);
        console.debug('[AuditRepository] Queued audit log for later sync:', error.code);
      } else {
        console.debug('[AuditRepository] Discarded audit log due to unrecoverable error:', error.message);
      }
    }
  },

  /**
   * Attempt to flush queued audit entries to Supabase.
   * Called automatically before each new insert AND on auth state change.
   */
  async _flushQueue(): Promise<void> {
    if (this._pendingQueue.length === 0) return;

    // Take a snapshot of the queue and clear it optimistically
    const batch = [...this._pendingQueue];
    this._pendingQueue = [];

    const results = await Promise.allSettled(
      batch.map((entry) =>
        supabase.rpc('log_audit_event', {
          p_username: entry.username || 'System',
          p_employee_id: entry.employeeId || null,
          p_employee_code: entry.employeeCode || null,
          p_employee_name: entry.employeeName || null,
          p_role: entry.role || 'unassigned',
          p_branch_id: entry.branchId || null,
          p_org_id: entry.orgId || null,
          p_action: entry.action || 'login',
          p_details: entry.details || null,
        })
      )
    );

    // Re-queue any that failed with recoverable errors
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this._pendingQueue.push(batch[i]);
      } else if (result.status === 'fulfilled' && result.value.error) {
        const error = result.value.error;
        const shouldRetry = error.code && !error.code.startsWith('40') && !error.message?.includes('JWT');
        if (shouldRetry) {
          this._pendingQueue.push(batch[i]);
        }
      }
    });
  },

  /**
   * Fetch audit logs with filtering
   */
  async getAll(branchId?: string | string[], limit = 500): Promise<LoginAuditEntry[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return [];

    let query = supabase
      .from('login_audits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (Array.isArray(branchId)) {
      if (branchId.length > 0) {
        query = query.in('branch_id', branchId);
      } else {
        // If empty array passed, return nothing to avoid fetching entire DB
        return [];
      }
    } else if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AuditRepository] Failed to fetch logs:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      username: row.username,
      employeeId: row.employee_id,
      employeeCode: row.employee_code,
      employeeName: row.employee_name,
      role: row.role,
      branchId: row.branch_id,
      orgId: row.org_id,
      action: row.action as any,
      details: row.details,
    }));
  },
};
