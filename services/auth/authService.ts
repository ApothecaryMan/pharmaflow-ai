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

export interface UserSession {
  username: string;
  employeeId?: string; // Optional for dev admin
  branchId: string;
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics';
  role:
    | 'admin'
    | 'pharmacist_owner'
    | 'pharmacist_manager'
    | 'pharmacist'
    | 'inventory_officer'
    | 'assistant'
    | 'hr_manager'
    | 'cashier'
    | 'senior_cashier'
    | 'delivery'
    | 'delivery_pharmacist'
    | 'officeboy'
    | 'manager';
}

export interface LoginAuditEntry {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  branchId: string;
  action: 'login' | 'logout' | 'switch_user' | 'system_login' | 'system_logout';
  details?: string;
  employeeId?: string;
}

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
let _superAdminSeeded = false;
const ensureSuperAdmin = async (): Promise<void> => {
  if (_superAdminSeeded) return; // Only run once per session

  const superUser = import.meta.env.VITE_SUPER_USER;
  const superPass = import.meta.env.VITE_SUPER_PASS;
  if (!superUser || !superPass) {
    _superAdminSeeded = true;
    return;
  }

  try {
    const { employeeCacheService } = await import('../hr/employeeCacheService');
    const allEmployees = await employeeCacheService.loadAll();
    const exists = allEmployees.some((e) => e.username === superUser);

    if (!exists) {
      const { hashPassword } = await import('./hashUtils');
      const passwordHash = await hashPassword(superPass);

      // Use branchService to get the active branch dynamic fallback
      let activeBranchId = 'B1'; // Minimum fallback
      try {
        const { branchService } = await import('../branchService');
        const activeBranch = branchService.getActive();
        if (activeBranch) {
          activeBranchId = activeBranch.id;
        } else {
          const firstBranch = branchService.getAll()[0];
          if (firstBranch) activeBranchId = firstBranch.id;
        }
      } catch { /* ignore - use fallback */ }

      await employeeCacheService.upsert({
        id: 'SUPER-ADMIN',
        employeeCode: 'EMP-000',
        name: 'SUPER',
        username: superUser,
        password: passwordHash,
        role: 'admin' as any,
        position: 'Super Admin',
        department: 'it',
        phone: '00000000000',
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        branchId: activeBranchId,
      });
      console.log('✨ Super Admin seeded in IndexedDB (pre-login)');
    }
  } catch (err) {
    console.warn('Failed to seed Super Admin:', err);
  }

  _superAdminSeeded = true;
};

export const authService = {
  /**
   * Get the current user session from storage
   */
  getCurrentUser: async (): Promise<UserSession | null> => {
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
   * Login function (Checks Dev credentials then real Employees)
   */
  login: async (username: string, password: string): Promise<UserSession | null> => {
    // Ensure Super Admin exists before any login attempt
    await ensureSuperAdmin();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Check Dev credentials
    if (username === DEV_CREDENTIALS.username && password === (DEV_CREDENTIALS.password ?? '')) {
      const { branchService } = await import('../branchService');
      const activeBranch = branchService.getActive();
      const firstBranch = branchService.getAll()[0];
      const effectiveBranchId = activeBranch?.id || firstBranch?.id || 'B1';

      const session: UserSession = {
        username: DEV_CREDENTIALS.username,
        branchId: effectiveBranchId,
        role: DEV_CREDENTIALS.role,
        department: DEV_CREDENTIALS.department,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      authService.logAuditEvent({
        username: session.username,
        role: session.role,
        branchId: session.branchId,
        action: 'system_login',
        details: 'Dev session started',
      });

      return session;
    }

    // 2. Check real Employees (Importing dynamically to avoid circular dependencies)
    const { employeeCacheService } = await import('../hr/employeeCacheService');
    const { verifyPassword } = await import('./hashUtils');
    
    // Fetch all employees from IndexedDB
    const allEmployees = await employeeCacheService.loadAll();
    
    let employee = null;
    for (const e of allEmployees) {
      if (e.username === username || e.employeeCode === username) {
        // Check if password matches
        const isPasswordMatch = await verifyPassword(password, e.password);
        if (isPasswordMatch) {
          employee = e;
          break;
        }
      }
    }

    if (employee) {
      const { branchService } = await import('../branchService');
      const activeBranch = branchService.getActive();
      const firstBranch = branchService.getAll()[0];

      const session: UserSession = {
        username: employee.username || employee.name,
        employeeId: employee.id,
        branchId: employee.branchId || activeBranch?.id || firstBranch?.id || branchService.getAll()[0]?.id || 'B1',
        role: employee.role,
        department: employee.department,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      authService.logAuditEvent({
        username: session.username,
        role: session.role,
        branchId: session.branchId,
        action: 'system_login',
        details: 'Employee login successful',
        employeeId: employee.id,
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
    try {
      const user = await authService.getCurrentUser();
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
    const activeBranch = branchService.getActive();
    const firstBranch = branchService.getAll()[0];

    const session: UserSession = {
      username: employee.username || employee.name,
      branchId: employee.branchId || activeBranch?.id || firstBranch?.id || branchService.getAll()[0]?.id,
      role: employee.role,
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
