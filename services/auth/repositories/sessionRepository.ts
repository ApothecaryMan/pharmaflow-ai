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
        // Just update last_seen_at and IP
        await supabase
          .from('user_active_sessions')
          .update({ 
            last_seen_at: new Date().toISOString(),
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
   * Get all active sessions for the current user
   */
  async getActiveSessions(): Promise<UserActiveSession[]> {
    const { data, error } = await supabase
      .from('user_active_sessions')
      .select('*')
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch active sessions:', error);
      return [];
    }
    
    // Deduplicate identical sessions (caused by previous race conditions)
    const seen = new Set<string>();
    const deduped: UserActiveSession[] = [];
    for (const session of data || []) {
      const key = `${session.user_agent}-${session.ip_address || ''}`;
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
   * Mark a session as logged out
   */
  async logoutSession(sessionId: string, terminatorName?: string): Promise<boolean> {
    if (terminatorName) {
      await new Promise<void>((resolve) => {
        const channel = supabase.channel('global-session-events');
        let resolved = false;
        
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          supabase.removeChannel(channel);
          resolve();
        };

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'remote-logout-named',
              payload: { sessionId, terminatorName },
            }).finally(cleanup);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
             cleanup();
          }
        });
        
        // Timeout in case subscription hangs
        setTimeout(cleanup, 1500);
      });
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
   * Update the last_seen_at timestamp for a session
   */
  async pingSession(sessionId: string): Promise<void> {
    await supabase
      .from('user_active_sessions')
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }
};
