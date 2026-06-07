import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import type { UserSession } from '../../types';
import { storage } from '../../utils/storage';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
  });

  it('getCurrentUser should return null if no session', async () => {
    const user = await authService.getCurrentUser();
    expect(user).toBeNull();
  });

  it('getCurrentUserSync should return session from storage', () => {
    const mockSession: UserSession = {
        username: 'test',
        branchId: 'B1',
        role: 'admin',
        department: 'pharmacy'
    };
    localStorage.setItem('branch_pilot_session', JSON.stringify(mockSession));
    
    const user = authService.getCurrentUserSync();
    expect(user).toEqual(mockSession);
  });

  it('hasSession should return true if session exists', () => {
    expect(authService.hasSession()).toBe(false);
    localStorage.setItem('branch_pilot_session', '{}');
    expect(authService.hasSession()).toBe(true);
  });

  it('routes global employee accounts to the employee portal regardless of local employee role', () => {
    const session: UserSession = {
      userId: 'u1',
      username: 'manager',
      accountType: 'employee',
      destination: 'employee_portal',
      branchId: '',
      role: 'pharmacist_owner',
      department: 'pharmacy',
    };

    expect(authService.getAccountDestination(session)).toBe('employee_portal');
  });

  it('routes pharmacy accounts to the pharmacy dashboard', () => {
    const session: UserSession = {
      userId: 'u1',
      username: 'pharmacy-admin',
      accountType: 'pharmacy',
      destination: 'pharmacy',
      branchId: '',
      role: 'unassigned',
      department: 'unassigned',
    };

    expect(authService.getAccountDestination(session)).toBe('pharmacy');
  });

  it('logout should remove session', async () => {
    localStorage.setItem('branch_pilot_session', '{}');
    await authService.logout();
    expect(localStorage.getItem('branch_pilot_session')).toBeNull();
  });


  
  it('login should fail with wrong credentials', async () => {
      await expect(authService.login('wrong', 'pass')).rejects.toThrow();
      expect(localStorage.getItem('branch_pilot_session')).toBeNull();
  });
});
