import { supabase } from '../../../lib/supabase';

export interface UserActiveSession {
  id: string;
  user_id: string;
  org_id?: string;
  branch_id?: string;
  employee_id?: string;
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
   * Register a new active session upon login
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
      let ipAddress: string | undefined;
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          ipAddress = data.ip;
        }
      } catch (e) {
        console.warn('Could not fetch IP address', e);
      }

      const { data: existingData } = await supabase
        .from('user_active_sessions')
        .select('id')
        .eq('user_id', payload.userId)
        .eq('user_agent', payload.userAgent)
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false })
        .limit(1);

      const existing = existingData?.[0];

      if (existing) {
        // Just update last_seen_at, IP, and session context (employee, branch, org)
        await supabase
          .from('user_active_sessions')
          .update({ 
            last_seen_at: new Date().toISOString(),
            org_id: payload.orgId || null,
            branch_id: payload.branchId || null,
            employee_id: payload.employeeId || null,
            ...(ipAddress ? { ip_address: ipAddress } : {})
          })
          .eq('id', existing.id);
        return existing.id;
      }

      // Otherwise insert new
      const { data, error } = await supabase
        .from('user_active_sessions')
        .insert({
          user_id: payload.userId,
          org_id: payload.orgId || null,
          branch_id: payload.branchId || null,
          employee_id: payload.employeeId || null,
          device_info: payload.deviceInfo,
          user_agent: payload.userAgent,
          ip_address: ipAddress || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to register active session:', error);
        return null;
      }
      return data?.id;
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
    let query = supabase
      .from('user_active_sessions')
      .select('*')
      .eq('is_active', true);

    // Scope to specific user for faster indexed lookups (owner view)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('last_seen_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch active sessions:', error);
      return [];
    }
    
    // Deduplicate identical sessions (caused by previous race conditions)
    const seen = new Set<string>();
    const deduped: UserActiveSession[] = [];
    for (const session of data || []) {
      const key = `${session.user_id}-${session.org_id || 'portal'}-${session.user_agent}-${session.ip_address || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(session);
      } else {
        // Clean up orphaned duplicate session in the background
        this.logoutSession(session.id).catch(() => {});
      }
    }
    
    return deduped;
  },

  /**
   * Helper to broadcast without conflicting with existing subscriptions
   */
  async _broadcastEvent(sessionId: string, event: string, payload: any): Promise<void> {
    const channelName = `session-${sessionId}`;
    const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    
    if (existingChannel) {
      // Use existing channel (don't remove it!)
      try {
        await existingChannel.send({ type: 'broadcast', event, payload });
      } catch (e) {
        console.warn('Failed to send broadcast on existing channel', e);
      }
      return;
    }

    // Create temporary channel if none exists
    await new Promise<void>((resolve) => {
      const channel = supabase.channel(channelName);
      let resolved = false;
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        supabase.removeChannel(channel);
        resolve();
      };

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event, payload }).finally(cleanup);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
           cleanup();
        }
      });
      
      setTimeout(cleanup, 1500);
    });
  },

  /**
   * Mark a session as logged out
   */
  async logoutSession(sessionId: string, terminatorName?: string): Promise<boolean> {
    if (terminatorName) {
      await this._broadcastEvent(sessionId, 'remote-logout-named', { sessionId, terminatorName });
    }

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
      await this._broadcastEvent(sessionId, 'remote-employee-logout', { sessionId, terminatorName });
    }

    const { error } = await supabase.rpc('logout_employee_from_session', {
      p_session_id: sessionId
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
  }
};
