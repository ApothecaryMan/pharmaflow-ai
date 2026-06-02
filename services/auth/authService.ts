/**
 * Auth Service - Authentication and session management
 * Refactored to use Repositories for data access.
 */

import { 
  type UserSession, 
  type LoginAuditEntry,
  type IndividualRegistrationPayload,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { employeeRepository } from '../hr/repositories/employeeRepository';
import { employeeProfileRepository } from '../hr/repositories/employeeProfileRepository';
import { orgRepository } from '../org/repositories/orgRepository';
import { orgService } from '../org/orgService';
import { isTauri } from '../../utils/platform';

const SESSION_KEY = StorageKeys.SESSION;
const AUDIT_KEY = StorageKeys.LOGIN_AUDIT;

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
        storage.remove(SESSION_KEY);
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
      const existingSession = storage.get<UserSession | null>(SESSION_KEY, null);

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
          employeeCode: employeeData.employeeCode,
          employeeName: employeeData.name,
          branchId: employeeData.branchId || '',
          orgId: orgId || employeeData.orgId,
          role: employeeData.role,
          orgRole: orgRole as any,
          department: employeeData.department,
        };
      } else {
        const current = existingSession || this.getCurrentUserSync();
        if (current) {
          session = {
            ...current,
            userId: userId,
            orgRole: orgRole as any,
            orgId: orgId || current.orgId,
          };
        } else {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username, full_name')
            .eq('id', userId)
            .maybeSingle();

          const { data: { user: sbUser } } = await supabase.auth.getUser();
          const meta = sbUser?.user_metadata || {};
          session = {
            userId,
            username: profile?.username?.replace(/^@/, '') || meta?.username?.replace(/^@/, '') || sbUser?.email?.split('@')[0] || 'user',
            branchId: '',
            orgId: undefined,
            role: 'unassigned',
            orgRole: 'member',
            department: 'unassigned',
          };
        }
      }

      storage.set(SESSION_KEY, session);
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
      const stored = storage.get<UserSession | null>(SESSION_KEY, null);
      if (stored) {
        cachedSession = stored;
        return cachedSession;
      }
      return null;
    } catch {
      return null;
    }
  },
  async refreshSession(): Promise<UserSession | null> {
    return this.getCurrentUser();
  },

  updateSession(updates: Partial<UserSession>): UserSession | null {
    const current = this.getCurrentUserSync();
    if (current) {
      const updated = { ...current, ...updates };
      storage.set(SESSION_KEY, updated);
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

  async registerIndividual(payload: IndividualRegistrationPayload): Promise<{ success: boolean; message?: string }> {
    try {
      const password = payload.password || this.generateTempPassword();
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: password,
        options: {
          data: { 
            name: payload.fullName,
            nameArabic: payload.nameArabic || '',
            username: payload.username,
            phone: payload.phone || '',
            licenseNumber: payload.licenseNumber || '',
          }
        }
      });
      if (error) throw error;

      if (data.user) {
        const session = await supabase.auth.getSession();
        const isAuthenticated = !!session?.data?.session;

        if (isAuthenticated) {
          const profileInsert: Record<string, any> = {
            id: data.user.id,
            username: payload.username,
            full_name: payload.fullName,
            email: payload.email,
            phone: payload.phone,
          };
          if (payload.nameArabic) profileInsert.name_arabic = payload.nameArabic;
          if (payload.licenseNumber) profileInsert.license_number = payload.licenseNumber;

          const { error: profileError } = await supabase.from('user_profiles').insert(profileInsert);
          if (profileError) {
            console.error('Failed to create user profile', profileError);
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to register individual account' };
    }
  },

  async resetPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      // In Tauri desktop mode, redirect to the production web URL
      const origin = isTauri() ? 'https://pharmaflow-ai.vercel.app' : window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: origin + '/reset-password',
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send reset link' };
    }
  },

  async login(username: string, password: string): Promise<UserSession | null> {
    let loginEmail = username;
    const isRealEmail = username.includes('@') && !username.startsWith('@');

    if (!isRealEmail) {
      const cleanUsername = username.replace(/^@/, '');
      try {
        const employee = await employeeRepository.getByUsername(cleanUsername);
        loginEmail = employee?.email || username;
      } catch (err) {
        loginEmail = username;
      }

      if (!loginEmail.includes('@')) {
        try {
          const profile = await employeeProfileRepository.getByUsername(cleanUsername);
          if (profile?.email) {
            loginEmail = profile.email;
          }
        } catch {
          // ignore
        }
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password 
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // Lazy-create user_profiles row if missing
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!existingProfile) {
      const meta = authData.user.user_metadata || {};
      const metaUsername = meta?.username;
      const insertUsername = metaUsername || (username.startsWith('@') ? username : `@${username}`);

      const { error: insertError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        username: insertUsername,
        full_name: meta?.name || authData.user.email?.split('@')[0] || 'User',
        email: authData.user.email,
        phone: meta?.phone || '',
        name_arabic: meta?.nameArabic || null,
        license_number: meta?.licenseNumber || null,
      });
      if (insertError) {
        console.error('Failed to lazy-create user profile:', insertError);
      }
    }

    let employeeDataArray = await employeeRepository.getAllByAuthUserId(authData.user.id);
    let employeeData = employeeDataArray.length > 0 ? employeeDataArray[0] : null;

    if (!employeeData) {
      const fallbackData = await employeeRepository.getByUsername(username);
      if (fallbackData) {
        employeeData = fallbackData;
        employeeDataArray = [fallbackData];
        if (!employeeData.userId) {
          await employeeRepository.update(employeeData.id, { userId: authData.user.id });
        }
      }
    }

    const memberData = await orgRepository.getMemberByUserId(authData.user.id);
    const orgRole = memberData?.role || 'member';
    const orgId = memberData?.orgId;

    let session: UserSession;

    if (employeeData) {
      const needsWorkspaceSelection = employeeDataArray.length > 1;
      
      session = {
        userId: authData.user.id,
        username: employeeData.username || employeeData.name,
        employeeId: employeeData.id,
        employeeCode: employeeData.employeeCode,
        employeeName: employeeData.name,
        branchId: employeeData.branchId || '',
        orgId: employeeData.orgId,
        role: employeeData.role,
        orgRole: orgRole as any,
        department: employeeData.department,
        needsWorkspaceSelection,
        availableWorkspaces: employeeDataArray,
      };
    } else {
      const meta = authData.user.user_metadata || {};
      const metaName = meta?.name;
      const metaUsername = meta?.username;

      session = {
        userId: authData.user.id,
        username: metaUsername?.replace(/^@/, '') || authData.user.email?.split('@')[0] || username,
        branchId: '', 
        orgId,
        role: 'unassigned',
        orgRole: orgRole as any,
        department: 'unassigned',
      };
    }

    storage.set(SESSION_KEY, session);
    if (session.orgId) orgService.setActiveOrgId(session.orgId);
    
    // Log System Login
    this.logAuditEvent({
      username: session.username,
      role: session.role,
      branchId: session.branchId || '',
      action: 'system_login',
      employeeId: session.employeeId,
      employeeCode: session.employeeCode,
      employeeName: session.employeeName,
      details: `Account: ${session.username}`
    });

    return session;
  },

  async logout(): Promise<void> {
    try {
      const session = this.getCurrentUserSync();
      if (session) {
        // Log System Logout
        this.logAuditEvent({
          username: session.username,
          role: session.role,
          branchId: session.branchId || '',
          action: 'system_logout',
          employeeId: session.employeeId,
          employeeCode: session.employeeCode,
          employeeName: session.employeeName,
          details: 'Account Logout'
        });
      }

      cachedSession = null;
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
    const session = storage.get<any>(SESSION_KEY, null);
    if (session) {
      try {
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
        storage.set(SESSION_KEY, session);
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
    if (typeof window !== 'undefined' && typeof StorageEvent !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: storage.getScopedKey('pharma_currentEmployeeId'),
        newValue: null,
        storageArea: localStorage,
      }));
    }
  },

  hasSession(): boolean {
    return !!storage.get<any>(SESSION_KEY, null);
  },

  logAuditEvent(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): void {
    const finalEntry: any = { ...entry };
    if (!finalEntry.employeeName) {
      const session = this.getCurrentUserSync();
      if (session && session.employeeId === finalEntry.employeeId) {
        finalEntry.employeeName = session.employeeName;
      }
    }

    // 1. Sync to Supabase (Server-side)
    import('./repositories/auditRepository').then(({ auditRepository }) => {
      auditRepository.insert(finalEntry);
    });

    // 2. Keep a small local cache for immediate UI feedback (Optional)
    const history = this.getLoginHistorySync();
    const newEntry: LoginAuditEntry = {
      ...finalEntry,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    storage.set(AUDIT_KEY, [newEntry, ...history].slice(0, 50));
  },

  /**
   * Fetch logs from Server (Supabase)
   */
  async getLoginHistory(branchId?: string): Promise<LoginAuditEntry[]> {
    const { auditRepository } = await import('./repositories/auditRepository');
    return auditRepository.getAll(branchId);
  },

  /**
   * Quick sync fetch from localStorage (for immediate UI needs)
   */
  getLoginHistorySync(): LoginAuditEntry[] {
    return storage.get<LoginAuditEntry[]>(AUDIT_KEY, []);
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
      employeeCode: employee.employeeCode,
      employeeName: employee.name,
      branchId: employee.branchId || '',
      role: employee.role,
      orgRole: employee.orgRole,
      department: employee.department,
      orgId: employee.orgId,
    };

    storage.set(SESSION_KEY, session);
    if (session.orgId) orgService.setActiveOrgId(session.orgId);

    // Log Biometric Login
    this.logAuditEvent({
      username: session.username,
      role: session.role,
      branchId: session.branchId || '',
      action: 'login',
      employeeId: session.employeeId,
      employeeCode: session.employeeCode,
      employeeName: session.employeeName,
      details: 'Biometric Login'
    });

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
        empData = await employeeRepository.getByEmail(email);
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
          // In Tauri desktop mode, redirect to the production web URL
          emailRedirectTo: isTauri() ? 'https://pharmaflow-ai.vercel.app' : window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to resend confirmation' };
    }
  },
};
