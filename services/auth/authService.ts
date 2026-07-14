/**
 * Auth Service - Authentication and session management
 * Refactored to use Repositories for data access.
 */

import { StorageKeys } from '../../config/storageKeys';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type {
  AccountType,
  IndividualRegistrationPayload,
  LoginAuditEntry,
  OrgRole,
  UserSession,
} from '../../types';
import { getBrowserName, getDeviceName, getSessionUserAgent, isTauri } from '../../utils/platform';
import { storage } from '../../utils/storage';
import { employeeRepository } from '../hr/repositories/employeeRepository';
import { orgService } from '../org/orgService';
import { orgRepository } from '../org/repositories/orgRepository';
import { sessionRepository } from './repositories/sessionRepository';

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

const determineAccountType = (user: SupabaseAuthUser): AccountType | null => {
  const meta = user.user_metadata || {};
  return normalizeAccountType(meta.accountType);
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
      const {
        data: { user: sbUser },
        error,
      } = await supabase.auth.getUser();

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
      const authResult = await supabase.auth.getUser();
      const sbUser = authResult.data.user;
      if (!sbUser) return null;

      let accountType = determineAccountType(sbUser);
      let memberData = null;
      let employeeWorkspaces: any[] = [];

      // Auto-migrate legacy accounts missing metadata
      if (!accountType) {
        memberData = await orgRepository.getMemberByUserId(sbUser.id);
        accountType =
          memberData?.role === 'owner' || memberData?.role === 'admin' ? 'pharmacy' : 'employee';
        supabase.auth.updateUser({ data: { accountType } }).catch(() => {});
      }

      if (accountType === 'pharmacy') {
        // Fetch only if not already fetched during migration
        if (!memberData) memberData = await orgRepository.getMemberByUserId(sbUser.id);
      } else {
        employeeWorkspaces = await employeeRepository.getAllByAuthUserId(sbUser.id).catch(() => []);
      }

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
            orgRole: (existingSession?.orgRole || 'unassigned') as OrgRole,
            orgId: memberData?.orgId || existingSession?.orgId,
          }
        : {
            userId,
            username: getDisplayUsername(sbUser, existingSession?.username || ''),
            accountType,
            destination: accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal',
            branchId: '',
            orgId: accountType === 'pharmacy' ? memberData?.orgId : undefined,
            role: 'unassigned',
            orgRole: (memberData?.role || 'unassigned') as OrgRole,
            department: 'unassigned',
            availableWorkspaces: strippedWorkspaces,
            availableEmployeeWorkspaces: strippedWorkspaces,
          };

      storage.set(SESSION_KEY, session);
      if (session.accountType === 'pharmacy' && session.orgId) {
        orgService.setActiveOrgId(session.orgId);
      }
      cachedSession = session;

      // Register or update active session (Full Backend)
      sessionRepository
        .registerSession({
          userId: session.userId,
          orgId: session.orgId,
          branchId: session.branchId,
          employeeId: session.employeeId,
          deviceInfo:
            typeof navigator !== 'undefined'
              ? `${getDeviceName(navigator.userAgent, navigator.platform)} - ${getBrowserName(getSessionUserAgent(navigator.userAgent))}`
              : 'Unknown Device',
          userAgent:
            typeof navigator !== 'undefined'
              ? getSessionUserAgent(navigator.userAgent)
              : 'Unknown User Agent',
        })
        .then((sessionId) => {
          if (sessionId) {
            storage.set(StorageKeys.ACTIVE_SESSION_ID, sessionId);
          }
        })
        .catch((e) => console.warn('Failed to register active session during sync:', e));

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
          data: { name, username, accountType },
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to sign up' };
    }
  },

  async registerIndividual(
    payload: IndividualRegistrationPayload
  ): Promise<{ success: boolean; message?: string }> {
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
          },
        },
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

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert(profileInsert);
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
        redirectTo: `${origin}/reset-password`,
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
      } catch (_err) {
        // Fallback to what they typed if resolution fails
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
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
      const insertUsername =
        metaUsername || (profileUsername.startsWith('@') ? profileUsername : `@${profileUsername}`);

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

    let accountType = determineAccountType(authData.user);
    let memberData = null;
    let employeeWorkspaces: any[] = [];

    // Auto-migrate legacy accounts missing metadata
    if (!accountType) {
      memberData = await orgRepository.getMemberByUserId(authData.user.id);
      accountType =
        memberData?.role === 'owner' || memberData?.role === 'admin' ? 'pharmacy' : 'employee';
      supabase.auth.updateUser({ data: { accountType } }).catch(() => {});
    }

    const destination = accountType === 'pharmacy' ? 'pharmacy' : 'employee_portal';

    if (accountType === 'pharmacy') {
      // Fetch only if not already fetched during migration
      if (!memberData) memberData = await orgRepository.getMemberByUserId(authData.user.id);
    } else {
      employeeWorkspaces = await employeeRepository
        .getAllByAuthUserId(authData.user.id)
        .catch(() => []);
    }

    const orgRole = (memberData?.role || 'member') as OrgRole;
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
    if (session.accountType === 'pharmacy' && session.orgId)
      orgService.setActiveOrgId(session.orgId);

    // Log System Login
    this.logAuditEvent({
      username: session.username,
      role: session.role,
      branchId: session.branchId || '',
      action: 'login',
      employeeId: session.employeeId,
      employeeCode: session.employeeCode,
      employeeName: session.employeeName,
      details: `Account: ${session.username}`,
    });

    try {
      await sessionRepository
        .registerSession({
          userId: session.userId,
          orgId: session.orgId,
          branchId: session.branchId,
          employeeId: session.employeeId,
          deviceInfo:
            typeof navigator !== 'undefined'
              ? `${getDeviceName(navigator.userAgent, navigator.platform)} - ${getBrowserName(getSessionUserAgent(navigator.userAgent))}`
              : 'Unknown Device',
          userAgent:
            typeof navigator !== 'undefined'
              ? getSessionUserAgent(navigator.userAgent)
              : 'Unknown User Agent',
        })
        .then((sessionId) => {
          if (sessionId) {
            storage.set(StorageKeys.ACTIVE_SESSION_ID, sessionId);
          }
        });
    } catch (e) {
      console.warn('Failed to register active session:', e);
    }

    return session;
  },

  async logout(): Promise<void> {
    try {
      const session = this.getCurrentUserSync();
      if (session) {
        // Log System Logout
        await this.logAuditEvent({
          username: session.username,
          role: session.role,
          branchId: session.branchId || '',
          action: 'logout',
          employeeId: session.employeeId,
          employeeCode: session.employeeCode,
          employeeName: session.employeeName,
          details: 'Account Logout',
        });
      }

      // Mark session as inactive in backend
      const currentSessionId = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
      if (currentSessionId) {
        try {
          // Import dynamically or ensure sessionRepository is available
          const { sessionRepository } = await import('./repositories/sessionRepository');
          await sessionRepository.logoutSession(currentSessionId);
        } catch (e) {
          console.warn('Failed to mark session inactive during logout', e);
        }
      }

      // Clear cached session FIRST to prevent stale reads during signOut
      cachedSession = null;
      storage.remove(StorageKeys.ACTIVE_SESSION_ID);
      await supabase.auth.signOut({ scope: 'local' });
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
          if (key?.endsWith(`_${userId}`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }

      // Clear session key last so getScopedKey() works correctly during cleanup
      storage.remove(SESSION_KEY);

      // Flush in-memory caches to prevent stale data in next session
      storage.resetCaches();
    } catch (err) {
      console.error('Logout error:', err);
      // Failsafe: ensure local cleanup even if Supabase signOut fails
      cachedSession = null;

      const userId = storage.getUserId();
      storage.remove('pharma_view');
      storage.remove('pharma_activeModule');
      storage.remove('pharma_active_org_id');
      storage.remove('pharma_active_branch_id');
      storage.remove('area_unlocked');

      if (userId) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.endsWith(`_${userId}`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }

      // Destroy ghost session tokens manually
      try {
        const sbKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
            sbKeys.push(key);
          }
        }
        sbKeys.forEach((key) => localStorage.removeItem(key));
      } catch (_e) {
        // Ignore loop iteration errors
      }

      storage.remove(SESSION_KEY);
      storage.resetCaches();
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
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storage.getScopedKey('pharma_currentEmployeeId'),
          newValue: null,
        })
      );
    }
  },

  hasSession(): boolean {
    return !!storage.get<any>(SESSION_KEY, null);
  },

  async logAuditEvent(entry: Omit<LoginAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const finalEntry: any = { ...entry };
    const session = this.getCurrentUserSync();

    if (!finalEntry.orgId && session?.orgId) {
      finalEntry.orgId = session.orgId;
    }

    if (!finalEntry.employeeName) {
      if (session && session.employeeId === finalEntry.employeeId) {
        finalEntry.employeeName = session.employeeName;
      }
    }

    // 1. Sync to Supabase via SECURITY DEFINER RPC
    try {
      const { auditRepository } = await import('./repositories/auditRepository');
      await auditRepository.insert(finalEntry);
    } catch (_e) {
      // Optional logging for debugging
    }

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
  async getLoginHistory(branchId?: string | string[]): Promise<LoginAuditEntry[]> {
    const { auditRepository } = await import('./repositories/auditRepository');
    return auditRepository.getAll(branchId);
  },

  /**
   * Quick sync fetch from localStorage (for immediate UI needs)
   */
  getLoginHistorySync(): LoginAuditEntry[] {
    return storage.get<LoginAuditEntry[]>(AUDIT_KEY, []);
  },

  async registerBiometric(
    employeeId: string,
    credentialId: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      await employeeRepository.update(employeeId, {
        biometricCredentialId: credentialId,
        biometricPublicKey: publicKey,
      });
      return true;
    } catch {
      return false;
    }
  },

  async loginWithBiometric(
    credentialId: string,
    employees: any[]
  ): Promise<{ session: UserSession; id: string } | null> {
    const employee = employees.find((emp) => emp.biometricCredentialId === credentialId);
    if (!employee) return null;

    const current = this.getCurrentUserSync();
    const session: UserSession = {
      ...(current || {}),
      userId: current?.userId,
      accountType: current?.accountType || 'employee',
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
      details: 'Biometric Login',
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
        password: newPassword,
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
