import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, UserSession } from './authService';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getCurrentUser should return null if no session', async () => {
    const user = await authService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('getCurrentUser should return session from storage', async () => {
    const mockSession: UserSession = {
        username: 'test',
        branchId: 'B1',
        role: 'admin',
        department: 'pharmacy'
    };
    localStorage.setItem('branch_pilot_session', JSON.stringify(mockSession));
    
    const user = await authService.getCurrentUser();
    expect(user).toEqual(mockSession);
  });

  it('hasSession should return true if session exists', () => {
    expect(authService.hasSession()).toBe(false);
    localStorage.setItem('branch_pilot_session', '{}');
    expect(authService.hasSession()).toBe(true);
  });

  it('logout should remove session', async () => {
    localStorage.setItem('branch_pilot_session', '{}');
    await authService.logout();
    expect(localStorage.getItem('branch_pilot_session')).toBeNull();
  });

  it('login should work with dev credentials in DEV mode', async () => {
    // Note: This relies on vite's import.meta.env.DEV being true in test env
    // Default values from .env are Admin / Admin@123
    const result = await authService.login('Admin', 'Admin@123');
    expect(result).not.toBeNull();
    expect(result?.username).toBe('Admin');
    expect(localStorage.getItem('branch_pilot_session')).toBeTruthy();
  });
  
  it('login should fail with wrong credentials', async () => {
      const result = await authService.login('wrong', 'pass');
      expect(result).toBeNull();
      expect(localStorage.getItem('branch_pilot_session')).toBeNull();
  });
});
