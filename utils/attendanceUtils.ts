/**
 * Attendance Utilities
 * Pure client-side calculations for attendance data.
 *
 * Key Functions:
 *   - calculateWorkingHours: Pairs IN→OUT events and sums durations
 *   - formatDuration: Converts minutes to human-readable "Xh Ym" format
 *   - calculateSessionDuration: Gets duration for a single IN→OUT pair
 */

import type { AttendanceEvent } from '../types/hr';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

/** A single work session (IN → OUT pair) */
export interface WorkSession {
  inTime: string;
  outTime: string | null; // null = still ongoing
  minutes: number;
  employeeId: string;
  employeeName?: string;
}

/** Working hours summary for one employee */
export interface EmployeeWorkSummary {
  employeeId: string;
  employeeName?: string;
  totalMinutes: number;
  sessions: WorkSession[];
  isOngoing: boolean; // true if last event is IN (still working)
}

// ═══════════════════════════════════════════
// Core Calculation
// ═══════════════════════════════════════════

/**
 * Calculate working hours from a list of attendance events.
 * Groups events by employee, pairs IN→OUT, sums durations.
 *
 * @param events - All attendance events (typically today's timeline)
 * @returns Map of employeeId → EmployeeWorkSummary
 */
export function calculateWorkingHours(
  events: AttendanceEvent[]
): Map<string, EmployeeWorkSummary> {
  const summaries = new Map<string, EmployeeWorkSummary>();

  // Group events by employee
  const byEmployee = new Map<string, AttendanceEvent[]>();
  for (const event of events) {
    const existing = byEmployee.get(event.employeeId) || [];
    existing.push(event);
    byEmployee.set(event.employeeId, existing);
  }

  // Process each employee's events
  for (const [employeeId, empEvents] of byEmployee) {
    // Sort by timestamp ascending (should already be, but ensure)
    const sorted = [...empEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const sessions: WorkSession[] = [];
    let totalMinutes = 0;
    let currentIn: AttendanceEvent | null = null;

    for (const event of sorted) {
      if (event.eventType === 'IN') {
        // Start a new session (if there was an unclosed IN, ignore it)
        currentIn = event;
      } else if (event.eventType === 'OUT' && currentIn) {
        // Close the session
        const inTime = new Date(currentIn.timestamp).getTime();
        const outTime = new Date(event.timestamp).getTime();
        const minutes = Math.round((outTime - inTime) / 60000);

        sessions.push({
          inTime: currentIn.timestamp,
          outTime: event.timestamp,
          minutes,
          employeeId,
          employeeName: event.employeeName || currentIn.employeeName,
        });

        totalMinutes += minutes;
        currentIn = null;
      }
    }

    // If last event is IN → employee is still working (ongoing)
    const isOngoing = currentIn !== null;
    if (isOngoing && currentIn) {
      const inTime = new Date(currentIn.timestamp).getTime();
      const now = Date.now();
      const ongoingMinutes = Math.round((now - inTime) / 60000);

      sessions.push({
        inTime: currentIn.timestamp,
        outTime: null,
        minutes: ongoingMinutes,
        employeeId,
        employeeName: currentIn.employeeName,
      });

      totalMinutes += ongoingMinutes;
    }

    summaries.set(employeeId, {
      employeeId,
      employeeName: sorted[0]?.employeeName,
      totalMinutes,
      sessions,
      isOngoing,
    });
  }

  return summaries;
}

// ═══════════════════════════════════════════
// Duration for a specific OUT event
// ═══════════════════════════════════════════

/**
 * Calculate the session duration for a specific OUT event.
 * Finds the matching IN event that precedes it.
 *
 * @param outEvent - The OUT event to calculate duration for
 * @param events - All events in the timeline (to find matching IN)
 * @returns Duration in minutes, or null if no matching IN found
 */
export function calculateSessionDuration(
  outEvent: AttendanceEvent,
  events: AttendanceEvent[]
): number | null {
  if (outEvent.eventType !== 'OUT') return null;

  // Find the closest preceding IN event for this employee
  const outTime = new Date(outEvent.timestamp).getTime();
  let closestIn: AttendanceEvent | null = null;

  for (const event of events) {
    if (
      event.employeeId === outEvent.employeeId &&
      event.eventType === 'IN' &&
      new Date(event.timestamp).getTime() < outTime
    ) {
      // Keep the closest one (last IN before this OUT)
      if (
        !closestIn ||
        new Date(event.timestamp).getTime() > new Date(closestIn.timestamp).getTime()
      ) {
        closestIn = event;
      }
    }
  }

  if (!closestIn) return null;

  const inTime = new Date(closestIn.timestamp).getTime();
  return Math.round((outTime - inTime) / 60000);
}

// ═══════════════════════════════════════════
// Formatting
// ═══════════════════════════════════════════

/**
 * Format minutes into a human-readable duration string.
 * Examples: 65 → "1h 05m", 480 → "8h 00m", 30 → "30m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

// ═══════════════════════════════════════════
// Lateness Detection
// ═══════════════════════════════════════════

/**
 * Check if an employee is late based on their first IN event.
 * @param firstInTimestamp - The employee's first IN event timestamp
 * @param shiftStartTime - Branch shift start (e.g., "09:00")
 * @param graceMinutes - Grace period (default: 5 minutes)
 * @returns { isLate, lateMinutes }
 */
export function checkLateness(
  firstInTimestamp: string,
  shiftStartTime: string,
  graceMinutes: number = 5
): { isLate: boolean; lateMinutes: number } {
  const firstIn = new Date(firstInTimestamp);
  
  // Parse shift time "HH:MM" into same day as firstIn
  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const shiftStart = new Date(firstIn);
  shiftStart.setHours(hours, minutes, 0, 0);
  
  // Add grace period
  const deadline = new Date(shiftStart.getTime() + graceMinutes * 60000);
  
  if (firstIn > deadline) {
    const lateMs = firstIn.getTime() - shiftStart.getTime();
    return { isLate: true, lateMinutes: Math.round(lateMs / 60000) };
  }
  
  return { isLate: false, lateMinutes: 0 };
}
