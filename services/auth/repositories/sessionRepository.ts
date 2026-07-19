import { supabase } from '../../../lib/supabase';

const SESSION_LIST_COLUMNS =
  'id, user_id, org_id, branch_id, employee_id, employee_name, user_name, role, device_info, user_agent, ip_address, is_active, created_at, last_seen_at, logged_out_at';

export interface UserActiveSession {
  id: string;
  user_id: string;
  org_id?: string;
  branch_id?: string;
  employee_id?: string;
  employee_name?: string;
  user_name?: string;
  role?: string;
  device_info?: string;
  user_agent?: string;
  ip_address?: string;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
  logged_out_at?: string;
}

let registerPromise: Promise<string | null> | null = null;

export const sessionRepository = {
  /**
   * Register or refresh an active session via atomic database upsert.
   * Uses INSERT ON CONFLICT UPDATE under the hood — no race conditions.
   */
  async registerSession(payload: {
    userId: string;
    orgId?: string;
    branchId?: string;
    employeeId?: string;
    deviceInfo: string;
    userAgent: string;
  }): Promise<string | null> {
    if (registerPromise) return registerPromise;

    registerPromise = (async () => {
      // Best-effort IP fetch with a hard 3s timeout — never blocks session registration
      let ipAddress: string | undefined;
      try {
        const res = await fetch('https://api.ipify.org?format=json', {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          ipAddress = data.ip;
        }
      } catch {
        // Silent — IP is optional metadata
      }

      // Single atomic RPC: INSERT ON CONFLICT UPDATE
      const { data, error } = await supabase.rpc('upsert_active_session', {
        p_user_id: payload.userId,
        p_org_id: payload.orgId || null,
        p_branch_id: payload.branchId || null,
        p_employee_id: payload.employeeId || null,
        p_device_info: payload.deviceInfo,
        p_user_agent: payload.userAgent,
        p_ip_address: ipAddress || null,
      });

      if (error) {
        console.error('Failed to upsert active session:', error);
        return null;
      }
      return data as string;
    })().finally(() => {
      registerPromise = null;
    });

    return registerPromise;
  },

  /**
   * Get all active sessions visible to the current user.
   * Optionally filter by userId for owner views (faster query path).
   */
  async getActiveSessions(userId?: string): Promise<UserActiveSession[]> {
    let query = supabase.from('user_active_sessions').select(SESSION_LIST_COLUMNS).eq('is_active', true);

    // Scope to specific user for faster indexed lookups (owner view)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('last_seen_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch active sessions:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Broadcast an event to all subscribers of a session channel.
   * Creates a transient subscription, sends the event, then tears down.
   */
  async _broadcastEvent(sessionId: string, event: string, payload: any): Promise<void> {
    try {
      const channelName = `session-${sessionId}`;

      await new Promise<void>((resolve) => {
        const channel = supabase.channel(channelName);
        let resolved = false;

        const done = () => {
          if (resolved) return;
          resolved = true;
          setTimeout(() => supabase.removeChannel(channel), 500);
          resolve();
        };

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel
              .send({ type: 'broadcast', event, payload })
              .then(() => done())
              .catch(() => done());
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            done();
          }
        });

        setTimeout(done, 5000);
      });
    } catch (e) {
      console.warn('Silent failure in _broadcastEvent to prevent blocking execution:', e);
    }
  },

  /**
   * Mark a session as logged out
   */
  async logoutSession(sessionId: string, terminatorName?: string): Promise<boolean> {
    const name = terminatorName || 'Admin';
    await this._broadcastEvent(sessionId, 'remote-logout-named', {
      sessionId,
      terminatorName: name,
    });

    const { error } = await supabase
      .from('user_active_sessions')
      .update({
        is_active: false,
        logged_out_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to logout session:', error);
      return false;
    }
    return true;
  },

  /**
   * Log out an employee from a specific session (Leaves the session active for the owner)
   */
  async logoutEmployeeFromSession(sessionId: string, terminatorName?: string): Promise<boolean> {
    if (terminatorName) {
      await this._broadcastEvent(sessionId, 'remote-employee-logout', {
        sessionId,
        terminatorName,
      });
    }

    const { error } = await supabase.rpc('logout_employee_from_session', {
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Failed to remove employee from session:', error);
      return false;
    }
    return true;
  },

  /**
   * Ping session heartbeat via optimized RPC.
   * Also performs probabilistic cleanup of stale sessions server-side.
   */
  async pingSession(sessionId: string): Promise<void> {
    await supabase.rpc('ping_session', { p_session_id: sessionId });
  },

  /**
   * Update the employee tied to the session
   */
  async updateSessionEmployee(sessionId: string, employeeId: string | null): Promise<void> {
    const { error } = await supabase
      .from('user_active_sessions')
      .update({
        employee_id: employeeId,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to update session employee:', error);
    }
  },

  /**
   * Update the workspace tied to the session
   */
  async updateSessionWorkspace(
    sessionId: string,
    orgId: string | null,
    branchId: string | null,
    employeeId?: string | null
  ): Promise<void> {
    const updates: any = {
      org_id: orgId,
      branch_id: branchId,
      last_seen_at: new Date().toISOString(),
    };
    if (employeeId !== undefined) {
      updates.employee_id = employeeId;
    }

    const { error } = await supabase
      .from('user_active_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to update session workspace:', error);
    }
  },
};
