import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { authService } from '../services/auth/authService';
import { ROUTES } from '../config/routes';

// Mock authService
vi.mock('../context', () => ({
  useAlert: vi.fn().mockReturnValue({
    error: vi.fn(),
  }),
}));

vi.mock('../services/auth/authService', () => ({
  authService: {
    hasSession: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with hasSession value', async () => {
    (authService.hasSession as any).mockReturnValue(true);
    // Mock user to prevent state update from overwriting true to false if user is null
    (authService.getCurrentUser as any).mockResolvedValue({ id: 'u1' });
    
    const setView = vi.fn();
    const setToast = vi.fn();
    
    const { result } = renderHook(() => useAuth({ 
      view: ROUTES.DASHBOARD, 
      setView, 
    }));

    expect(result.current.isAuthenticated).toBe(true);

    // Wait for the async effect to complete to avoid act() warnings
    await waitFor(() => {
        expect(authService.getCurrentUser).toHaveBeenCalled();
    });
  });

  it('should check auth async on mount', async () => {
    (authService.hasSession as any).mockReturnValue(false); 
    (authService.getCurrentUser as any).mockResolvedValue({ id: 'u1', name: 'User' }); 
    
    const setView = vi.fn();
    const setToast = vi.fn();
    
    const { result } = renderHook(() => useAuth({ 
      view: ROUTES.LOGIN, 
      setView, 
    }));

    // Wait for update
    await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should handle logout', async () => {
    (authService.hasSession as any).mockReturnValue(true);
    (authService.getCurrentUser as any).mockResolvedValue({ id: 'u1' });

    const setView = vi.fn();
    const setToast = vi.fn();
    
    const { result } = renderHook(() => useAuth({ 
      view: ROUTES.DASHBOARD, 
      setView, 
    }));

    // Wait for initial effect
    await waitFor(() => {
       expect(authService.getCurrentUser).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(setView).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it('resolveView should return LOGIN if not authenticated', async () => {
    (authService.hasSession as any).mockReturnValue(false);
    (authService.getCurrentUser as any).mockResolvedValue(null);

    const setView = vi.fn();
    const setToast = vi.fn();
    
    const { result } = renderHook(() => useAuth({ 
      view: ROUTES.LOGIN, 
      setView, 
    }));
    
    // Wait for effect
    await waitFor(() => {
       expect(authService.getCurrentUser).toHaveBeenCalled();
    });

    // Manually force false (though it should be false already)
    act(() => {
      result.current.setIsAuthenticated(false);
    });

    const nextView = result.current.resolveView(ROUTES.DASHBOARD);
    expect(nextView).toBe(ROUTES.LOGIN);
  });
});
