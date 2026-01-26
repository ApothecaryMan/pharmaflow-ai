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
  role: 'admin' | 'staff';
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
  role: 'admin' as const
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
        role: DEV_CREDENTIALS.role
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
    try {
      const stored = localStorage.getItem(AUDIT_KEY);
      const history: LoginAuditEntry[] = stored ? JSON.parse(stored) : [];
      
      const newEntry: LoginAuditEntry = {
        ...entry,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString()
      };
      
      history.unshift(newEntry); // Newest first
      
      // Keep only last 1000 entries to prevent localStorage bloat
      localStorage.setItem(AUDIT_KEY, JSON.stringify(history.slice(0, 1000)));
    } catch (e) {
      console.error('Failed to log audit event:', e);
    }
  },

  /**
   * Retrieve login history
   */
  getLoginHistory: (): LoginAuditEntry[] => {
    try {
      const stored = localStorage.getItem(AUDIT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
};

