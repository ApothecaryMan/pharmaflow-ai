/**
 * Attendance Service
 * Handles biometric clock in/out via WebAuthn + Terminal UUID token.
 *
 * Security Architecture (3 Layers):
 *   Layer 1: WebAuthn Biometric  → Proves WHO (employee identity)
 *   Layer 2: Terminal UUID Token  → Proves WHERE (pharmacy device, in-memory only)
 *   Layer 3: Supabase now()       → Proves WHEN (server time, untamperable)
 *
 * Key Design Decisions:
 *   - Event-based log: each IN/OUT is a separate row in attendance_events.
 *   - Terminal token lives in React state only (no LocalStorage, no Cookies).
 *   - Timestamp is ALWAYS server-generated via now() in the RPC function.
 *   - No GPS, No IP — Terminal UUID is the location proof.
 */

import { supabase } from '../../lib/supabase';
import type { AttendanceEvent, AttendanceEventType } from '../../types/hr';
import { idGenerator } from '../../utils/idGenerator';

// ═══════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════

/** Raw DB row from attendance_events table */
interface AttendanceEventRow {
  id: string;
  employee_id: string;
  branch_id: string;
  org_id: string | null;
  event_type: string;
  is_biometric: boolean;
  timestamp: string;
  created_at: string;
  /** Joined from employees table */
  employees?: { name: string } | null;
}

// ═══════════════════════════════════════════
// Mappers
// ═══════════════════════════════════════════

/** Maps a raw DB row to the AttendanceEvent domain type */
function mapFromDb(row: AttendanceEventRow): AttendanceEvent {
  return {
    id: row.id,
    employeeId: row.employee_id,
    branchId: row.branch_id,
    orgId: row.org_id || undefined,
    eventType: row.event_type as AttendanceEventType,
    isBiometric: row.is_biometric,
    timestamp: row.timestamp,
    employeeName: row.employees?.name || undefined,
  };
}

// ═══════════════════════════════════════════
// Service Implementation
// ═══════════════════════════════════════════

export const attendanceService = {
  /**
   * Log an attendance event (clock in or out).
   * Uses the server-side RPC function which:
   *   1. Validates the terminal token against the branch's stored token.
   *   2. Inserts the event with server-generated timestamp (now()).
   *
   * @param employeeId - The employee clocking in/out
   * @param branchId - The branch where the terminal is located
   * @param orgId - Organization ID for multi-tenant isolation
   * @param eventType - 'IN' or 'OUT'
   * @param terminalToken - The UUID token entered by the owner/IT (held in React state)
   * @param isBiometric - Whether this was verified via WebAuthn
   * @returns The created AttendanceEvent with server timestamp
   * @throws Error if terminal token is invalid
   */
  async logEvent(
    employeeId: string,
    branchId: string,
    orgId: string | undefined,
    eventType: AttendanceEventType,
    terminalToken: string,
    isBiometric: boolean = false
  ): Promise<AttendanceEvent> {
    const { data, error } = await supabase.rpc('log_attendance_event', {
      p_employee_id: employeeId,
      p_branch_id: branchId,
      p_org_id: orgId || null,
      p_event_type: eventType,
      p_terminal_token: terminalToken,
      p_is_biometric: isBiometric,
    });

    if (error) {
      // Surface the specific error for invalid terminal tokens
      if (error.message?.includes('INVALID_TERMINAL_TOKEN')) {
        throw new Error('INVALID_TERMINAL_TOKEN');
      }
      throw error;
    }

    return {
      id: data.id,
      employeeId: data.employee_id,
      branchId: data.branch_id,
      eventType: data.event_type as AttendanceEventType,
      isBiometric: data.is_biometric,
      timestamp: data.timestamp,
    };
  },

  /**
   * Get today's attendance timeline for a branch.
   * Returns all events sorted by timestamp ascending (chronological order).
   * Includes employee names via a join on the employees table.
   *
   * @param branchId - The branch to fetch events for
   * @returns Array of AttendanceEvent with employeeName populated
   */
  async getTodayTimeline(branchId: string): Promise<AttendanceEvent[]> {
    // Calculate today's date boundaries using UTC to match Supabase
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data, error } = await supabase
      .from('attendance_events')
      .select('*, employees(name)')
      .eq('branch_id', branchId)
      .gte('timestamp', startOfDay)
      .lt('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFromDb);
  },

  /**
   * Get the last event for a specific employee today.
   * Used to determine the button state (show "Clock In" or "Clock Out").
   *
   * @param employeeId - The employee to check
   * @param branchId - The branch context
   * @returns The last event type ('IN' | 'OUT') or null if no events today
   */
  async getEmployeeStatus(employeeId: string, branchId: string): Promise<AttendanceEventType | null> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    const { data, error } = await supabase
      .from('attendance_events')
      .select('event_type')
      .eq('employee_id', employeeId)
      .eq('branch_id', branchId)
      .gte('timestamp', startOfDay)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? (data.event_type as AttendanceEventType) : null;
  },

  /**
   * Validate a terminal token against the branch's stored token.
   * Used when activating the attendance terminal (entering the UUID).
   * Does NOT store anything — just checks if the token is correct.
   *
   * @param branchId - The branch to validate against
   * @param terminalToken - The token entered by the owner/IT
   * @returns true if valid, false otherwise
   */
  async validateTerminalToken(branchId: string, terminalToken: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('validate_terminal_token', {
      p_branch_id: branchId,
      p_terminal_token: terminalToken,
    });

    if (error) return false;
    return data === true;
  },

  /**
   * Generate a new terminal token for a branch.
   * This replaces any existing token (invalidating the old one instantly).
   * Only callable by users with 'attendance.generate_token' permission.
   *
   * @param branchId - The branch to generate a token for
   * @returns The new UUID token (for the owner to copy and paste into the terminal)
   */
  async generateTerminalToken(branchId: string): Promise<string> {
    const newToken = idGenerator.uuid();

    const { error } = await supabase
      .from('branches')
      .update({ attendance_terminal_token: newToken })
      .eq('id', branchId);

    if (error) throw error;
    return newToken;
  },

  // ═══════════════════════════════════════════
  // PIN Fallback Methods
  // ═══════════════════════════════════════════

  /**
   * Set a 4-digit attendance PIN for an employee.
   * The PIN is hashed before storage using the same bcrypt utility
   * used for password hashing throughout the app.
   *
   * @param employeeId - The employee to set the PIN for
   * @param pin - The raw 4-digit PIN
   */
  async setEmployeePin(employeeId: string, pin: string): Promise<void> {
    const { hashPassword } = await import('../auth/hashUtils');
    const hashed = await hashPassword(pin);

    const { error } = await supabase
      .from('employees')
      .update({ attendance_pin: hashed })
      .eq('id', employeeId);

    if (error) throw error;
  },

  /**
   * Verify an employee's 4-digit attendance PIN.
   *
   * @param employeeId - The employee to verify
   * @param pin - The raw 4-digit PIN to check
   * @param storedHash - The bcrypt hash from the employee record
   * @returns true if PIN matches
   */
  async verifyEmployeePin(pin: string, storedHash: string): Promise<boolean> {
    const { verifyPassword } = await import('../auth/hashUtils');
    return verifyPassword(pin, storedHash);
  },
};
