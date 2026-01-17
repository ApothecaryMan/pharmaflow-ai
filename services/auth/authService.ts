/**
 * Auth Service - Mock authentication for branch pilot
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
   */
  getCurrentUser: async (): Promise<UserSession | null> => {
    try {
      // Check session storage first
      const stored = sessionStorage.getItem(SESSION_KEY);
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
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
      }
    }
    
    // In production, this would fail if no real API is hooked up
    return null;
  },

  /**
   * Logout and clear session
   */
  logout: async (): Promise<void> => {
    sessionStorage.removeItem(SESSION_KEY);
  }
};

