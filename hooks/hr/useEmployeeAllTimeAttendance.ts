/**
 * useEmployeeAllTimeAttendance
 * Calculates all-time attendance for an employee across all branches and organizations.
 * Includes current working hours from today and historical data.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AttendanceEvent } from '../../types/hr';
import { calculateWorkingHours, formatDuration } from '../../utils/attendanceUtils';

export interface AllTimeAttendanceStats {
  totalMinutes: number;
  totalDays: number;
  averageHoursPerDay: number;
  formattedDuration: string;
  lastActiveDate: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch and calculate all-time attendance for an employee
 * across all branches and organizations they've worked in.
 *
 * @param employeeId - The employee ID to calculate attendance for
 * @param language - 'EN' or 'AR' for formatting
 * @returns AttendanceStats including total hours, days, and formatted strings
 */
export const useEmployeeAllTimeAttendance = (
  employeeId: string | undefined,
  language: 'EN' | 'AR' = 'EN'
): AllTimeAttendanceStats => {
  const [stats, setStats] = useState<AllTimeAttendanceStats>({
    totalMinutes: 0,
    totalDays: 0,
    averageHoursPerDay: 0,
    formattedDuration: language === 'AR' ? '0 دقيقة' : '0m',
    lastActiveDate: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!employeeId) {
      setStats((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchAttendanceData = async () => {
      try {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }));

        // Fetch all attendance events for this employee across all branches and orgs
        const { data, error } = await supabase
          .from('attendance_events')
          .select('*')
          .eq('employee_id', employeeId)
          .order('timestamp', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        if (!data || data.length === 0) {
          setStats((prev) => ({
            ...prev,
            isLoading: false,
            totalMinutes: 0,
            totalDays: 0,
            averageHoursPerDay: 0,
            formattedDuration: language === 'AR' ? '0 دقيقة' : '0m',
            lastActiveDate: null,
          }));
          return;
        }

        // Map database rows to AttendanceEvent type
        const events: AttendanceEvent[] = data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id,
          branchId: row.branch_id,
          orgId: row.org_id || undefined,
          eventType: row.event_type as 'IN' | 'OUT',
          isBiometric: row.is_biometric,
          timestamp: row.timestamp,
          employeeName: row.employees?.name || undefined,
          employeeCode: row.employees?.employee_code || undefined,
        }));

        // Use the existing calculateWorkingHours function
        const workSummaries = calculateWorkingHours(events);
        const summary = workSummaries.get(employeeId);

        if (!summary) {
          setStats((prev) => ({
            ...prev,
            isLoading: false,
            totalMinutes: 0,
            totalDays: 0,
            averageHoursPerDay: 0,
            formattedDuration: language === 'AR' ? '0 دقيقة' : '0m',
            lastActiveDate: null,
          }));
          return;
        }

        // Calculate the number of unique days worked
        const uniqueDays = new Set(
          summary.sessions.map((session) => {
            const date = new Date(session.inTime);
            return date.toISOString().split('T')[0];
          })
        ).size;

        // Calculate average hours per day
        const averageHoursPerDay =
          uniqueDays > 0 ? (summary.totalMinutes / 60 / uniqueDays).toFixed(1) : '0';

        // Get the last active date from the most recent event
        const lastActiveDate =
          events.length > 0 ? new Date(events[events.length - 1].timestamp).toLocaleDateString() : null;

        // Format the duration
        const formattedDuration = formatDuration(summary.totalMinutes, language);

        setStats({
          totalMinutes: summary.totalMinutes,
          totalDays: uniqueDays,
          averageHoursPerDay: parseFloat(averageHoursPerDay as string),
          formattedDuration,
          lastActiveDate,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance data';
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          totalMinutes: 0,
          totalDays: 0,
          averageHoursPerDay: 0,
          formattedDuration: language === 'AR' ? '0 دقيقة' : '0m',
          lastActiveDate: null,
        }));
      }
    };

    fetchAttendanceData();
  }, [employeeId, language]);

  return stats;
};
