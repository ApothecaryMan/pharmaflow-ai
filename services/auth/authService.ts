/**
 * Auth Service - Authentication and session management
 * Online-Only implementation using Supabase
 */

import { 
  type UserSession, 
  type LoginAuditEntry,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { storage } from '../../utils/storage';
import { employeeService } from '../hr/employeeService';
import { orgService } from '../org/orgService';

const SESSION_KEY = 'branch_pilot_session';
const AUDIT_KEY = 'pharmaflow_login_audit';

export const authService = {
  /**
   * Get the current user session
   */
  async getCurrentUser(): Promise<UserSession | null> {
    if (!isSupabaseConfigured) return this.getCurrentUserSync();

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    } catch (err) {
      console.warn('Failed to verify Supabase session', err);
    }
    
    return this.getCurrentUserSync();
  },

  /**
   * Synchronous current user retrieval
   */
  getCurrentUserSync(): UserSession | null {
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
   * Update current session
   */
  updateSession(updates: Partial<UserSession>): UserSession | null {
    const current = this.getCurrentUserSync();
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    }
    return null;
  },

  /**
   * Sign up a new user
   */
  async signUp(name: string, username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, username }
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to sign up' };
    }
  },

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send reset link' };
    }
  },

  async login(username: string, password: string): Promise<UserSession | null> {
    // 1. Resolve email if username provided
    let loginEmail = username;
    if (!username.includes('@')) {
      try {
        const { data: resolvedEmail } = await supabase.rpc('get_email_by_username', { p_username: username });
        loginEmail = resolvedEmail || `${username}@zinc.co`;
      } catch (err) {
        loginEmail = `${username}@zinc.co`;
      }
    }

    // 2. Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password 
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // 3. Fetch Metadata
    const [employeeResponse, memberResponse] = await Promise.all([
      supabase.from('employees').select('*').eq('auth_user_id', authData.user.id).maybeSingle(),
      supabase.from('org_members').select('role, org_id').eq('user_id', authData.user.id).maybeSingle()
    ]);

    let employeeData = employeeResponse.data;
    const memberData = memberResponse.data;
    const orgRole = memberData?.role || 'member';
    const orgId = memberData?.org_id;

    // Link employee if missing auth_user_id but matching username
    if (!employeeData) {
      const { data: fallbackData } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .maybeSingle();
        
      if (fallbackData) {
        employeeData = fallbackData;
        if (!employeeData.auth_user_id) {
          await supabase.from('employees').update({ auth_user_id: authData.user.id }).eq('id', employeeData.id);
        }
      }
    }

    let session: UserSession;

    if (employeeData) {
      session = {
        userId: authData.user.id,
        username: employeeData.username || employeeData.name,
        employeeId: employeeData.id,
        branchId: employeeData.branch_id || '',
        orgId: orgId || employeeData.org_id,
        role: employeeData.role,
        orgRole: orgRole as any,
        department: employeeData.department,
      };
    } else {
      // Partial session for onboarding
      session = {
        userId: authData.user.id,
        username: authData.user.email?.split('@')[0] || username,
        branchId: '', 
        orgId,
        role: 'manager',
        orgRole: orgRole as any,
        department: 'it',
      };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.orgId) orgService.setActiveOrgId(session.orgId);
    
    return session;
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      
      // Clear all session and context keys using the smart storage utility
      const userId = storage.getUserId();
      
      storage.remove(SESSION_KEY);
      storage.remove('pharma_active_org_id');
      storage.remove('pharma_active_branch_id');
      storage.remove('area_unlocked');
      
      // Clear any other potentially leaked settings for this user
      if (userId) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.endsWith(`_${userId}`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  hasSession(): boolean {
    return !!localStorage.getItem(SESSION_KEY);
  },

  logAuditEvent(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): void {
    const history = this.getLoginHistory();
    const newEntry: LoginAuditEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(AUDIT_KEY, JSON.stringify([newEntry, ...history].slice(0, 500)));
  },

  getLoginHistory(branchId?: string): LoginAuditEntry[] {
    try {
      const all: LoginAuditEntry[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      return branchId ? all.filter((e) => e.branchId === branchId) : all;
    } catch {
      return [];
    }
  },

  async registerBiometric(employeeId: string, credentialId: string, publicKey: string): Promise<boolean> {
    try {
      await employeeService.update(employeeId, {
        biometricCredentialId: credentialId,
        biometricPublicKey: publicKey
      });
      return true;
    } catch {
      return false;
    }
  },

  async loginWithBiometric(credentialId: string, employees: any[]): Promise<{ session: UserSession; id: string } | null> {
    const employee = employees.find((emp) => emp.biometricCredentialId === credentialId);
    if (!employee) return null;

    const session: UserSession = {
      username: employee.username || employee.name,
      employeeId: employee.id,
      branchId: employee.branchId || '',
      role: employee.role,
      orgRole: employee.orgRole,
      department: employee.department,
      orgId: employee.orgId,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.orgId) orgService.setActiveOrgId(session.orgId);

    return { session, id: employee.id };
  },
  
  /**
   * Generate a random temporary password
   */
  generateTempPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },

  /**
   * Handle forgot password request
   */
  async handleForgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Trigger Supabase standard reset link
      const result = await this.resetPassword(email);
      if (!result.success) throw new Error(result.message);
      
      // 2. Log or handle custom "Temporary Password" if needed
      // Note: Real email sending with a specific temp password would require an Edge Function
      
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to handle request' };
    }
  },

  /**
   * Update Employee Password (via Supabase Auth)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Update Supabase Auth Record
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      // 2. Sync hashed password to employee table
      if (data.user) {
        const userId = data.user.id;
        const email = data.user.email;
        
        // Query the database directly instead of fetching all employees
        let { data: empData, error: empError } = await supabase
          .from('employees')
          .select('id, username')
          .eq('auth_user_id', userId)
          .maybeSingle();

        // Fallback to email if not found by userId
        if (!empData && email) {
          const { data: fallbackData } = await supabase
            .from('employees')
            .select('id, username')
            .eq('email', email)
            .maybeSingle();
          empData = fallbackData;
        }
        
        if (empData) {
          const { hashPassword } = await import('./hashUtils');
          const hashed = await hashPassword(newPassword);
          await employeeService.update(empData.id, { password: hashed });
          console.log(`[AuthService] Synced new password hash for employee ${empData.username}`);
        } else {
          console.warn(`[AuthService] Could not find employee record for userId ${userId} or email ${email} to sync password.`);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update password' };
    }
  },
};
