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

const SESSION_KEY = 'branch_pilot_session';

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
   * 
   * TODO [Backend]: Replace with API call to GET /api/auth/me
   * The server should validate the HttpOnly session cookie and return user data.
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
   * 
   * TODO [Backend]: Replace with API call to POST /api/auth/login
   * The server should:
   * 1. Validate credentials against database
   * 2. Create a server-side session
   * 3. Set HttpOnly cookie with session ID
   * 4. Return user data (without sensitive info)
   */
  login: async (username: string, password: string): Promise<UserSession | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Only allow this simple auth in DEV mode or if specifically configured
    if (import.meta.env.DEV) {
      // Use safe comparison
      if (username === DEV_CREDENTIALS.username && 
          password === (DEV_CREDENTIALS.password ?? '')) {
            
        const session: UserSession = {
          username: DEV_CREDENTIALS.username,
          branchId: DEV_CREDENTIALS.branchId,
          role: DEV_CREDENTIALS.role
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
      }
    }
    
    // In production, this would fail if no real API is hooked up
    return null;
  },

  /**
   * Synchronous check for session existence (Fast UI init)
   * 
   * TODO [Backend]: This can remain for quick UI init, but should be
   * followed by getCurrentUser() to validate with the server.
   */
  hasSession: (): boolean => {
    return !!localStorage.getItem(SESSION_KEY);
  },

  /**
   * Logout and clear session
   * 
   * TODO [Backend]: Replace with API call to POST /api/auth/logout
   * The server should invalidate the session and clear the HttpOnly cookie.
   */
  logout: async (): Promise<void> => {
    localStorage.removeItem(SESSION_KEY);
  }
};

