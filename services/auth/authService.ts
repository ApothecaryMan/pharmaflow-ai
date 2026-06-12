/**
 * Auth Service - Authentication and session management
 * Refactored to use Repositories for data access.
 */

import {
  type UserSession,
  type LoginAuditEntry,
  type IndividualRegistrationPayload,
  type OrgRole,
  type AccountType,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { employeeRepository } from '../hr/repositories/employeeRepository';
import { orgRepository } from '../org/repositories/orgRepository';
import { orgService } from '../org/orgService';
import { isTauri } from '../../utils/platform';

const SESSION_KEY = StorageKeys.SESSION;
const AUDIT_KEY = StorageKeys.LOGIN_AUDIT;

let cachedSession: UserSession | null = null;

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
};

const normalizeAccountType = (value: unknown): AccountType | null => {
  if (value === 'employee') return 'employee';
  if (value === 'org' || value === 'pharmacy') return 'pharmacy';
  return null;
};

const stripWorkspacePayload = (emp: any) => {
  const {
    image,
    nationalIdCard,
    nationalIdCardBack,
    mainSyndicateCard,
    subSyndicateCard,
    password,
    biometricPublicKey,
    ...rest
  } = emp;
  return rest;
};

const getDisplayUsername = (user: SupabaseAuthUser, fallback: string): string => {
  const meta = user.user_metadata || {};
  return (
    meta?.username?.replace(/^@/, '') ||
    fallback?.replace(/^@/, '') ||
    user.email?.split('@')[0] ||
    'user'
  );
};

const determineAccountType = (
  user: SupabaseAuthUser,
  orgRole?: OrgRole,
  employeeWorkspaceCount = 0
): AccountType => {
  const meta = user.user_metadata || {};
  const explicitType = normalizeAccountType(meta.accountType || meta.account_type);
  if (explicitType) return explicitType;

  const metaUsername = String(meta.username || '').replace(/^@/, '');
  const isGeneratedPharmacyProfile =
    metaUsername.startsWith('device_') || meta.name === 'Pharmacy Admin';

  if (employeeWorkspaceCount > 0 && !isGeneratedPharmacyProfile) {
    return 'employee';
  }

  const intendedType = normalizeAccountType(storage.get('pharma_intended_account_type', null));
  if (intendedType === 'employee') return 'employee';
  if (intendedType === 'pharmacy' && isGeneratedPharmacyProfile) return 'pharmacy';

  if (orgRole === 'owner' || orgRole === 'admin') return 'pharmacy';

  return 'employee';
};

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
      const [memberData, employeeWorkspaces, authResult] = await Promise.all([
        orgRepository.getMemberByUserId(userId),
        employeeRepository.getAllByAuthUserId(userId).catch(() => []),
        supabase.auth.getUser(),
      ]);

      const sbUser = authResult.data.user;
      if (!sbUser) return null;

      const accountType = determineAccountType(
        sbUser,
        memberData?.role as OrgRole | undefined,
        employeeWorkspaces.length
      );
      const strippedWorkspaces = employeeWorkspaces.map(stripWorkspacePayload);

      const existingSession = storage.get<UserSession | null>(SESSION_KEY, null);
      const hasLocalEmployeeContext =
        existingSession?.userId === userId &&
        existingSession.accountType === 'pharmacy' &&
        !!existingSession.employeeId;

      const session: UserSession = hasLocalEmployeeContext
        ? {
            ...existingSession!,
            accountType,
            destination: accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal',
            orgRole: (memberData?.role || existingSession!.orgRole || 'member') as OrgRole,
            orgId: memberData?.orgId || existingSession!.orgId,
          }
        : {
            userId,
            username: getDisplayUsername(sbUser, existingSession?.username || ''),
            accountType,
            destination: accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal',
            branchId: '',
            orgId: accountType === 'pharmacy' ? memberData?.orgId : undefined,
            role: 'unassigned',
            orgRole: (memberData?.role || 'member') as OrgRole,
            department: 'unassigned',
            availableWorkspaces: strippedWorkspaces,
            availableEmployeeWorkspaces: strippedWorkspaces,
          };

      storage.set(SESSION_KEY, session);
      if (session.accountType === 'pharmacy' && session.orgId) {
        orgService.setActiveOrgId(session.orgId);
      }
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

  getAccountDestination(session: UserSession | null): 'employee_portal' | 'pharmacy' {
    if (session?.destination) return session.destination;
    return session?.accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal';
  },

  async signUp(
    name: string,
    username: string,
    email: string,
    password: string,
    accountType: AccountType = 'employee'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, username, accountType }
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
            accountType: 'employee',
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
      try {
        const resolvedEmail = await employeeRepository.getEmailByUsername(username);
        if (resolvedEmail) {
          loginEmail = resolvedEmail;
        }
      } catch (err) {
        // Fallback to what they typed if resolution fails
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    const profileUsername = getDisplayUsername(authData.user, username);

    // Lazy-create user_profiles row if missing
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!existingProfile) {
      const meta = authData.user.user_metadata || {};
      const metaUsername = meta?.username;
      const insertUsername = metaUsername || (profileUsername.startsWith('@') ? profileUsername : `@${profileUsername}`);

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

    const [employeeWorkspaces, memberData] = await Promise.all([
      employeeRepository.getAllByAuthUserId(authData.user.id).catch(() => []),
      orgRepository.getMemberByUserId(authData.user.id),
    ]);

    const orgRole = (memberData?.role || 'member') as OrgRole;
    const accountType = determineAccountType(authData.user, orgRole, employeeWorkspaces.length);
    const destination = accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal';
    const strippedWorkspaces = employeeWorkspaces.map(stripWorkspacePayload);

    const session: UserSession = {
      userId: authData.user.id,
      username: profileUsername,
      accountType,
      destination,
      branchId: '',
      orgId: accountType === 'pharmacy' ? memberData?.orgId : undefined,
      role: 'unassigned',
      orgRole,
      department: 'unassigned',
      availableWorkspaces: strippedWorkspaces,
      availableEmployeeWorkspaces: strippedWorkspaces,
    };

    storage.set(SESSION_KEY, session);
    cachedSession = session;
    if (session.accountType === 'pharmacy' && session.orgId) orgService.setActiveOrgId(session.orgId);

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

      // Clear navigation state to prevent stale view on next login
      storage.remove('pharma_view');
      storage.remove('pharma_activeModule');
      
      // Clear org-specific keys
      storage.remove('pharma_active_org_id');
      storage.remove('pharma_active_branch_id');
      storage.remove('area_unlocked');

      // Clear user-scoped keys (data keyed by userId suffix)
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

      // Clear session key last so getScopedKey() works correctly during cleanup
      storage.remove(SESSION_KEY);

      // Flush in-memory caches to prevent stale data in next session
      storage.resetCaches();

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
        delete session.employeeCode;
        delete session.employeeName;
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

    const current = this.getCurrentUserSync();
    const session: UserSession = {
      ...(current || {}),
      userId: current?.userId,
      accountType: current?.accountType || 'pharmacy',
      destination: current?.destination || 'pharmacy',
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
