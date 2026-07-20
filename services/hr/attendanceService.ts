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

import { attendanceRepository } from './repositories/attendanceRepository';
import type { AttendanceEvent, AttendanceEventType } from '../../types/hr';
import type { AttendanceEventRow } from './repositories/attendanceRepository';
import { idGenerator } from '../../utils/idGenerator';

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

export const attendanceService = {
  async logEvent(
    employeeId: string,
    branchId: string,
    orgId: string | undefined,
    eventType: AttendanceEventType,
    terminalToken: string,
    isBiometric: boolean = false
  ): Promise<AttendanceEvent> {
    const data = await attendanceRepository.logEvent(
      employeeId, branchId, orgId, eventType, terminalToken, isBiometric
    );

    return {
      id: data.id,
      employeeId: data.employee_id,
      branchId: data.branch_id,
      eventType: data.event_type as AttendanceEventType,
      isBiometric: data.is_biometric,
      timestamp: data.timestamp,
    };
  },

  async getTodayTimeline(branchId: string): Promise<AttendanceEvent[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(), today.getMonth(), today.getDate()
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(), today.getMonth(), today.getDate() + 1
    ).toISOString();

    const data = await attendanceRepository.getTodayTimeline(branchId, startOfDay, endOfDay);
    return data.map(mapFromDb);
  },

  async getEmployeeStatus(
    employeeId: string,
    branchId: string
  ): Promise<AttendanceEventType | null> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(), today.getMonth(), today.getDate()
    ).toISOString();

    return attendanceRepository.getEmployeeStatus(employeeId, branchId, startOfDay);
  },

  async validateTerminalToken(branchId: string, terminalToken: string): Promise<boolean> {
    return attendanceRepository.validateTerminalToken(branchId, terminalToken);
  },

  async generateTerminalToken(branchId: string): Promise<string> {
    const newToken = idGenerator.uuid();
    await attendanceRepository.generateTerminalToken(branchId, newToken);
    return newToken;
  },

  async setEmployeePin(employeeId: string, pin: string): Promise<void> {
    const { hashPassword } = await import('../auth/hashUtils');
    const hashed = await hashPassword(pin);
    await attendanceRepository.setEmployeePin(employeeId, hashed);
  },

  async verifyEmployeePin(pin: string, storedHash: string): Promise<boolean> {
    const { verifyPassword } = await import('../auth/hashUtils');
    return verifyPassword(pin, storedHash);
  },
};
