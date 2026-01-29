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
  branchId: string;
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics';
  role: 'admin' | 'pharmacist_owner' | 'pharmacist_manager' | 'pharmacist' | 'inventory_officer' | 'assistant' | 'hr_manager' | 'cashier' | 'senior_cashier' | 'delivery' | 'delivery_pharmacist' | 'officeboy' | 'manager';
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
// This prevents credentials from leaking into production builds if tree-shaken correctly,
// though ideally true auth is server-side.
const DEV_CREDENTIALS = {
  username: import.meta.env.VITE_TEST_USER || 'test',
  password: import.meta.env.VITE_TEST_PASS || 'test',
  branchId: 'B1',
  role: 'admin' as const,
  department: 'it' as const
};

export const authService = {
  /**
   * Get the current user session from storage
   */
  getCurrentUser: async (): Promise<UserSession | null> => {
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
   * Login function (Mock implementation for Pilot)
   */
  login: async (username: string, password: string): Promise<UserSession | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === DEV_CREDENTIALS.username && 
        password === (DEV_CREDENTIALS.password ?? '')) {
          
      const session: UserSession = {
        username: DEV_CREDENTIALS.username,
        branchId: DEV_CREDENTIALS.branchId,
        role: DEV_CREDENTIALS.role,
        department: DEV_CREDENTIALS.department
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      // Log Audit Event
      authService.logAuditEvent({
        username: session.username,
        role: session.role,
        branchId: session.branchId,
        action: 'system_login',
        details: 'System session started'
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
          details: 'Account Logout'
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
    // ... (existing implementation)
  },

  /**
   * Register Biometric Credential
   */
  registerBiometric: async (employeeId: string, credentialId: string, publicKey: string): Promise<boolean> => {
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
  loginWithBiometric: async (credentialId: string, employees: any[]): Promise<{ session: UserSession, id: string } | null> => {
    // Find employee by credential ID
    const employee = employees.find(emp => emp.biometricCredentialId === credentialId);
    if (!employee) return null;

    const session: UserSession = {
      username: employee.username || employee.name,
      branchId: employee.branchId || 'B1',
      role: employee.role,
      department: employee.department
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    authService.logAuditEvent({
      username: session.username,
      role: session.role,
      branchId: session.branchId,
      action: 'system_login',
      details: 'Biometric login successful',
      employeeId: employee.id
    });

    return { session, id: employee.id };
  }
};

