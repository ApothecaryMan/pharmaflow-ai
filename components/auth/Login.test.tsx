import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Login } from './Login';
import { authService } from '../../services/auth/authService';
import React from 'react';

// Mock authService
vi.mock('../../services/auth/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', () => {
    render(<Login />);
    
    const submitBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<Login />);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const toggleBtn = screen.getByLabelText(/show password/i);

    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle again
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login and redirect', async () => {
    const mockUser = { id: 'u1', name: 'User' };
    (authService.login as any).mockResolvedValue(mockUser);
    const onViewChange = vi.fn();

    render(<Login onViewChange={onViewChange} />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitBtn);

    // Advance timers to allow the mock promise to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    
    expect(authService.login).toHaveBeenCalledWith('admin', 'password123');
    
    // Should show success message after login resolves
    expect(screen.getByText(/Login Successful/i)).toBeInTheDocument();

    // Fast-forward delay for redirect
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onViewChange).toHaveBeenCalledWith('dashboard');
  });

  it('handles login failure', async () => {
    (authService.login as any).mockResolvedValue(null); // Invalid credentials

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Advance timers to allow the mock promise to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(authService.login).toHaveBeenCalled();
    expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
