/**
 * Auth Service - Mock authentication for branch pilot
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  SECURITY NOTE - FUTURE BACKEND MIGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is a **CLIENT-SIDE MOCK** for development/pilot purposes.
 * When migrating to a real backend, implement the following:
 *
 * 1. **HttpOnly Cookies** (Recommended for session tokens):
 *    - Backend sets: `Set-Cookie: session_token=xxx; HttpOnly; Secure; SameSite=Strict`
 *    - JavaScript CANNOT access HttpOnly cookies (XSS protection)
 *    - Cookies are automatically sent with every request
 *
 * 2. **Server-side Sessions**:
 *    - Store session data in Redis/Database on the server
 *    - Only send a session ID to the client (inside HttpOnly cookie)
 *    - Validate session ID on every API request
 *
 * 3. **JWT (Alternative)**:
 *    - Short-lived Access Token (15 min) in memory/localStorage
 *    - Long-lived Refresh Token in HttpOnly cookie
 *    - Refresh endpoint to get new Access Token
 *
 * 4. **Replace this file** with API calls:
 *    - `login()` → POST /api/auth/login
 *    - `logout()` → POST /api/auth/logout
 *    - `getCurrentUser()` → GET /api/auth/me
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  type UserSession, 
  type LoginAuditEntry,
} from '../../types';

const SESSION_KEY = 'branch_pilot_session';
const AUDIT_KEY = 'pharmaflow_login_audit';

// Development credentials - ONLY visible/active in DEV mode
const DEV_CREDENTIALS = {
  username: import.meta.env.VITE_TEST_USER || 'test',
  password: import.meta.env.VITE_TEST_PASS || 'test',
  role: 'admin' as const,
  department: 'it' as const,
};

/**
 * Ensures the Super Admin account exists in IndexedDB.
 * Called before every login attempt to solve the chicken-and-egg problem
 * where Super Admin was previously only seeded AFTER successful login.
 */
const ensureSuperAdmin = async (): Promise<void> => {
  // Super Admin seeding is now handled securely in the backend via Supabase migrations.
  // Legacy frontend seeding logic has been removed.
};

export const authService = {
  /**
   * Get the current user session from storage or Supabase
   */
  getCurrentUser: async (): Promise<UserSession | null> => {
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If Supabase session expired/invalid, clear local cache
        if (error || !session) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
      } catch (err) {
        console.warn('Failed to verify Supabase session', err);
      }
    }
    
    // Fallback to local cache (contains role/branch metadata not in standard JWT)
    return authService.getCurrentUserSync();
  },

  /**
   * Synchronous current user retrieval
   */
  getCurrentUserSync: (): UserSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Update current session with new metadata
   */
  updateSession: (updates: Partial<UserSession>): UserSession | null => {
    const current = authService.getCurrentUserSync();
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    }
    return null;
  },

  /**
   * Sign up a new user using Supabase
   */
  signUp: async (name: string, username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase is not configured. Local fallback does not support sign up yet.' };
    }

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username,
          }
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to sign up' };
    }
  },

  /**
   * Request password reset link via Supabase
   */
  resetPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase is not configured.' };
    }
    
    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send reset link' };
    }
  },

  /**
   * Resend signup confirmation email
   */
  resendConfirmation: async (email: string): Promise<{ success: boolean; message?: string }> => {
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to resend confirmation email.' };
    }
  },

  /**
   * Login function (Checks Dev credentials then Supabase or local Employees)
   */
  login: async (username: string, password: string): Promise<UserSession | null> => {
    // Check if Supabase is configured
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    
    // Ensure Super Admin exists before any login attempt (local only)
    if (!isSupabaseConfigured) {
      await ensureSuperAdmin();
    }

    // Simulate API delay for local check
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured) {
      // --- DEV DIRECT BYPASS FOR SUPER USER ---
      if (import.meta.env.DEV && (username === 'Super' || username === 'super')) {
        const { supabase } = await import('../../lib/supabase');
        // Because of the 'god' permissions policy, we actually need a valid JWT token
        // to pass RLS, if they don't want to use auth. But to do "Direct Access",
        // we can return a mock session if we strictly want a frontend bypass.
        // Let's attempt to fetch the local employee:
        const { data: godUser } = await supabase.from('employees').select('*').eq('role', 'god').maybeSingle();
        if (godUser) {
           console.log('⚡ Using Direct God Bypass for Dev');
           const session: UserSession = {
            userId: godUser.auth_user_id || 'dev-god-id',
            username: godUser.username || 'Super',
            employeeId: godUser.id,
            branchId: godUser.branch_id || '',
            orgId: godUser.org_id || '79e11c07-d632-4acc-b10e-8876cf4f41fa',
            role: 'god',
            orgRole: 'owner',
            department: 'it',
          };
          localStorage.setItem('branch_pilot_session', JSON.stringify(session));
          return session;
        }
      }

      try {
        const { supabase } = await import('../../lib/supabase');
        
        let loginEmail = username;
        if (!username.includes('@')) {
           try {
             const { data: resolvedEmail } = await supabase.rpc('get_email_by_username', { p_username: username });
             if (resolvedEmail) {
               loginEmail = resolvedEmail;
             } else {
               loginEmail = `${username}@zinc.co`;
             }
           } catch (err) {
             console.warn('Failed to resolve email via RPC, using fallback:', err);
             loginEmail = `${username}@zinc.co`;
           }
        }
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        
        if (authError) {
          // --- DEV SEEDING WORKAROUND FOR SUPABASE AUTH ---
          // Since migrations cannot easily seed auth.users with encrypted passwords,
          // if we are in DEV and Super login fails, we auto-register them in Supabase Auth.
          if (
            import.meta.env.DEV && 
            (username === 'Super' || username === 'super') && 
            authError.message.includes('Invalid')
          ) {
            console.log('🌱 Auto-registering Super user into Supabase Auth...');
            const { error: signUpError } = await supabase.auth.signUp({ 
              email: loginEmail, 
              password,
              options: { data: { username: 'Super', name: 'SUPER' } }
            });
            
            if (!signUpError) {
              // Retry login after successful signup
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
              if (retryError) throw retryError;
              
              // Remap variables to proceed with the normal flow
              authData.user = retryData.user;
              // Link this new auth.user.id to the pre-seeded public.employees record
              await supabase.from('employees').update({ auth_user_id: retryData.user.id }).eq('username', 'Super');
            } else {
              throw signUpError;
            }
          } else {
            if (authError.message.toLowerCase().includes('confirmed') || authError.status === 400) {
              if (authError.message.toLowerCase().includes('not confirmed')) {
                 throw new Error('Email not confirmed. Please check your inbox.');
              }
            }
            throw authError;
          }
        }

        if (!authData.user) throw new Error('No user data returned');

        // Parallel fetch for metadata
        const [employeeResponse, memberResponse] = await Promise.all([
          supabase.from('employees').select('*').eq('auth_user_id', authData.user.id).maybeSingle(),
          supabase.from('org_members').select('role, org_id').eq('user_id', authData.user.id).maybeSingle()
        ]);

        let employeeData = employeeResponse.data;
        
        // Fallback: If no employee found by auth_user_id, try matching by username
        if (!employeeData && username) {
          const { data: fallbackData } = await supabase
            .from('employees')
            .select('*')
            .eq('username', username)
            .maybeSingle();
            
          if (fallbackData) {
            employeeData = fallbackData;
            // Proactively update the auth_user_id link if it's missing
            if (!employeeData.auth_user_id) {
              await supabase
                .from('employees')
                .update({ auth_user_id: authData.user.id })
                .eq('id', employeeData.id);
            }
          }
        }

        const memberData = memberResponse.data;
        
        const orgRole = memberData?.role || 'member';
        const orgId = memberData?.org_id;

        if (employeeData) {
          const session: UserSession = {
            userId: authData.user.id,
            username: employeeData.username || employeeData.name,
            employeeId: employeeData.id,
            branchId: employeeData.branch_id || '',
            orgId: orgId || employeeData.org_id,
            role: employeeData.role,
            orgRole: orgRole as any,
            department: employeeData.department,
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          
          if (session.orgId) {
            const { orgService } = await import('../../services/org/orgService');
            orgService.setActiveOrgId(session.orgId);
          }
          
          return session;
        } else {
          // No employee record - partial session for onboarding
          let defaultBranchId = '';
          try {
            const { branchService } = await import('../branchService');
            const branch = orgId ? await branchService.ensureDefaultBranch(orgId) : null;
            if (branch) defaultBranchId = branch.id;
          } catch {}

          const session: UserSession = {
            userId: authData.user.id,
            username: authData.user.email?.split('@')[0] || username,
            branchId: defaultBranchId, 
            orgId,
            role: 'manager',
            orgRole: orgRole as any,
            department: 'it',
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          
          if (session.orgId) {
            const { orgService } = await import('../../services/org/orgService');
            orgService.setActiveOrgId(session.orgId);
          }
          
          return session;
        }
      } catch (err: any) {
        console.warn('Supabase login failed:', err.message);
        throw err;
      }
    }

    // 3. Local Employees Fallback
    const { employeeCacheService } = await import('../hr/employeeCacheService');
    const { verifyPassword } = await import('./hashUtils');
    const allEmployees = await employeeCacheService.loadAll();
    
    let matchedEmployee = null;
    for (const e of allEmployees) {
      if (e.username === username || e.employeeCode === username) {
        if (await verifyPassword(password, e.password)) {
          matchedEmployee = e;
          break;
        }
      }
    }

    if (matchedEmployee) {
      const { branchService } = await import('../branchService');
      const activeBranch = await branchService.getActive();
      const allBranches = await branchService.getAll();
      const firstBranch = allBranches[0];

      const session: UserSession = {
        username: matchedEmployee.username || matchedEmployee.name,
        employeeId: matchedEmployee.id,
        branchId: matchedEmployee.branchId || activeBranch?.id || firstBranch?.id || '',
        role: matchedEmployee.role,
        orgRole: matchedEmployee.orgRole,
        department: matchedEmployee.department,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      authService.logAuditEvent({
        username: session.username,
        role: session.role,
        branchId: session.branchId,
        action: 'system_login',
        details: 'Local login successful',
        employeeId: matchedEmployee.id,
      });

      return session;
    }

    return null;
  },

  /**
   * Synchronous check for session existence
   */
  hasSession: (): boolean => {
    return !!localStorage.getItem(SESSION_KEY);
  },

  /**
   * Logout and clear session
   */
  logout: async (): Promise<void> => {
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';

    try {
      if (isSupabaseConfigured) {
        const { supabase } = await import('../../lib/supabase');
        await supabase.auth.signOut();
      }

      const user = await authService.getCurrentUserSync();
      if (user) {
        authService.logAuditEvent({
          username: user.username,
          role: user.role,
          branchId: user.branchId,
          action: 'system_logout',
          details: 'Account Logout',
        });
      }
    } finally {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  /**
   * Log an audit event to localStorage
   */
  logAuditEvent: (entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): void => {
    try {
      const history = authService.getLoginHistory();
      const newEntry: LoginAuditEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [newEntry, ...history].slice(0, 500); // Keep last 500 entries
      localStorage.setItem(AUDIT_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  },

  /**
   * Get login audit history
   */
  getLoginHistory: (branchId?: string): LoginAuditEntry[] => {
    try {
      const stored = localStorage.getItem(AUDIT_KEY);
      if (stored) {
        const all: LoginAuditEntry[] = JSON.parse(stored);
        if (branchId) {
          return all.filter((entry) => entry.branchId === branchId);
        }
        return all;
      }
      return [];
    } catch (error) {
      console.error('Failed to get login history:', error);
      return [];
    }
  },

  /**
   * Register Biometric Credential
   */
  registerBiometric: async (
    employeeId: string,
    credentialId: string,
    publicKey: string
  ): Promise<boolean> => {
    try {
      // In a real app, this would be an API call to save to DB.
      // Since we are in pilot mode, this should be handled by the data context update.
      // This helper is for the UI to know it's "theoretically" registered.
      console.log(`Registering biometric for ${employeeId}`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Login with Biometric (Mock for Pilot)
   */
  loginWithBiometric: async (
    credentialId: string,
    employees: any[]
  ): Promise<{ session: UserSession; id: string } | null> => {
    // Find employee by credential ID
    const employee = employees.find((emp) => emp.biometricCredentialId === credentialId);
    if (!employee) return null;

    const { branchService } = await import('../branchService');
    const activeBranch = await branchService.getActive();
    const allBranches = await branchService.getAll();
    const firstBranch = allBranches[0];

    const session: UserSession = {
      username: employee.username || employee.name,
      branchId: employee.branchId || activeBranch?.id || firstBranch?.id || '',
      role: employee.role,
      orgRole: employee.orgRole,
      department: employee.department,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    authService.logAuditEvent({
      username: session.username,
      role: session.role,
      branchId: session.branchId,
      action: 'system_login',
      details: 'Biometric login successful',
      employeeId: employee.id,
    });

    return { session, id: employee.id };
  },
};
