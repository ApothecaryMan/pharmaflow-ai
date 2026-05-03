/**
 * Auth Service - Authentication and session management
 * Refactored to use Repositories for data access.
 */

import { 
  type UserSession, 
  type LoginAuditEntry,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { storage } from '../../utils/storage';
import { employeeRepository } from '../hr/repositories/employeeRepository';
import { orgRepository } from '../org/repositories/orgRepository';
import { orgService } from '../org/orgService';

const SESSION_KEY = 'branch_pilot_session';
const AUDIT_KEY = 'pharmaflow_login_audit';

let cachedSession: UserSession | null = null;

export const authService = {
  /**
   * Get the current user session
   */
  async getCurrentUser(forceRefresh = false): Promise<UserSession | null> {
    if (!isSupabaseConfigured) return this.getCurrentUserSync();

    if (!forceRefresh && cachedSession) {
      return cachedSession;
    }

    try {
      const { data: { user: sbUser }, error } = await supabase.auth.getUser();
      
      if (error || !sbUser) {
        localStorage.removeItem(SESSION_KEY);
        cachedSession = null;
        return null;
      }

      return await this.syncSessionWithDatabase(sbUser.id);
    } catch (err) {
      console.warn('Failed to verify Supabase session', err);
      return this.getCurrentUserSync();
    }
  },

  /**
   * Sync session data with the database truth
   */
  async syncSessionWithDatabase(userId: string): Promise<UserSession | null> {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const existingSession: UserSession | null = stored ? JSON.parse(stored) : null;

      const [employeeData, memberData] = await Promise.all([
        employeeRepository.getByAuthUserId(userId),
        orgRepository.getMemberByUserId(userId)
      ]);

      const orgRole = memberData?.role || 'member';
      const orgId = memberData?.orgId;

      let session: UserSession;

      const hasActiveManualEmployee = existingSession?.employeeId && 
                                    existingSession.userId === userId && 
                                    existingSession.orgId === orgId;

      if (hasActiveManualEmployee) {
        session = {
          ...existingSession!,
          orgRole: orgRole as any,
          orgId: orgId || existingSession!.orgId,
        };
      } else if (employeeData) {
        session = {
          userId: userId,
          username: employeeData.username || employeeData.name,
          employeeId: employeeData.id,
          branchId: employeeData.branchId || '',
          orgId: orgId || employeeData.orgId,
          role: employeeData.role,
          orgRole: orgRole as any,
          department: employeeData.department,
        };
      } else {
        const current = existingSession || this.getCurrentUserSync();
        if (!current) return null;
        session = {
          ...current,
          userId: userId,
          orgRole: orgRole as any,
          orgId: orgId || current.orgId,
        };
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      cachedSession = session;
      return session;
    } catch (err) {
      console.error('Failed to sync session with database', err);
      return this.getCurrentUserSync();
    }
  },

  getCurrentUserSync(): UserSession | null {
    if (cachedSession) return cachedSession;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        cachedSession = JSON.parse(stored);
        return cachedSession;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateSession(updates: Partial<UserSession>): UserSession | null {
    const current = this.getCurrentUserSync();
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      cachedSession = updated;
      return updated;
    }
    return null;
  },

  async signUp(name: string, username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase.auth.signUp({
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
    let loginEmail = username;
    if (!username.includes('@')) {
      try {
        const resolvedEmail = await employeeRepository.getEmailByUsername(username);
        loginEmail = resolvedEmail || `${username}@zinc.co`;
      } catch (err) {
        loginEmail = `${username}@zinc.co`;
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password 
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    let employeeData = await employeeRepository.getByAuthUserId(authData.user.id);
    const memberData = await orgRepository.getMemberByUserId(authData.user.id);
    
    const orgRole = memberData?.role || 'member';
    const orgId = memberData?.orgId;

    if (!employeeData) {
      const fallbackData = await employeeRepository.getByUsername(username);
      if (fallbackData) {
        employeeData = fallbackData;
        if (!employeeData.userId) {
          await employeeRepository.update(employeeData.id, { userId: authData.user.id });
        }
      }
    }

    let session: UserSession;

    if (employeeData) {
      session = {
        userId: authData.user.id,
        username: employeeData.username || employeeData.name,
        employeeId: employeeData.id,
        branchId: employeeData.branchId || '',
        orgId: orgId || employeeData.orgId,
        role: employeeData.role,
        orgRole: orgRole as any,
        department: employeeData.department,
      };
    } else {
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
      this.clearEmployeeSession();
      
      const userId = storage.getUserId();
      
      storage.remove(SESSION_KEY);
      storage.remove('pharma_active_org_id');
      storage.remove('pharma_active_branch_id');
      storage.remove('area_unlocked');
      
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

  clearEmployeeSession(): void {
    storage.remove('pharma_currentEmployeeId');
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session._originalRole) {
          session.role = session._originalRole;
          session.department = session._originalDepartment;
          session.orgRole = session._originalOrgRole;
          session.username = session._originalUsername;
          delete session._originalRole;
          delete session._originalDepartment;
          delete session._originalOrgRole;
          delete session._originalUsername;
        }
        delete session.employeeId;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'pharma_currentEmployeeId',
      newValue: null
    }));
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
      await employeeRepository.update(employeeId, {
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
  
  generateTempPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },

  async handleForgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await this.resetPassword(email);
      if (!result.success) throw new Error(result.message);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to handle request' };
    }
  },

  async updatePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      if (data.user) {
        const userId = data.user.id;
        const email = data.user.email;
        
        let empData = await employeeRepository.getByAuthUserId(userId);

        if (!empData && email) {
          // Add a temporary method to employeeRepository if needed, or just use existing
          const all = await employeeRepository.getAll(''); // Empty branch to get all
          empData = all.find(e => e.email === email) || null;
        }
        
        if (empData) {
          const { hashPassword } = await import('./hashUtils');
          const hashed = await hashPassword(newPassword);
          await employeeRepository.update(empData.id, { password: hashed });
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update password' };
    }
  },

  async resendConfirmation(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to resend confirmation' };
    }
  },
};
