import { supabase } from '../../lib/supabase';
import type { AttendanceEvent } from '../../types/hr';
import { calculateWorkingHours, checkLateness } from '../../utils/attendanceUtils';
import { type BaseReportFilters, BaseReportService } from '../core/baseReportService';

// ── Types ──

export interface AttendanceReportFilters extends BaseReportFilters {
  employeeId?: string;
  dateMode?: 'day' | 'range';
  targetDate?: string; // ISO date for single day
}

export interface DailyEmployeeSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  firstIn: string | null; // Earliest IN timestamp
  lastOut: string | null; // Latest OUT timestamp
  totalMinutes: number; // Total working hours
  sessions: number; // Number of IN/OUT pairs
  isLate: boolean; // Compared to shift schedule
  lateMinutes: number; // How many minutes late
  isOngoing: boolean; // Still working (no final OUT)
}

export interface AttendanceReportSummary {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  avgMinutes: number; // Average working hours
  employees: DailyEmployeeSummary[];
}

// ── Monthly Employee Report Types ──

export interface DayAttendanceSummary {
  date: string; // "2026-05-01" (ISO date string)
  dayOfWeek: number; // 0=Sun ... 6=Sat
  firstIn: string | null; // ISO timestamp of first IN
  lastOut: string | null; // ISO timestamp of last OUT (may be next day for overnight)
  totalMinutes: number;
  sessions: number; // completed IN→OUT pairs
  isPresent: boolean;
  isLate: boolean;
  lateMinutes: number;
  isOngoing: boolean; // true ONLY for today's last unclosed session
}

export interface MonthlyEmployeeReport {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  month: string; // "2026-05"
  // KPIs
  totalDays: number; // calendar days in month (28-31)
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalMinutes: number; // sum of all working minutes
  attendanceRate: number; // (presentDays / totalDays) * 100, rounded to 1 decimal
  avgDailyMinutes: number; // totalMinutes / presentDays, rounded. 0 if no present days.
  totalLateMinutes: number; // sum of all lateMinutes
  // Daily breakdown
  days: DayAttendanceSummary[];
}

/**
 * AttendanceReportService
 * Handles aggregation and reporting for attendance events.
 */
export class AttendanceReportService extends BaseReportService<
  AttendanceEvent,
  AttendanceReportFilters
> {
  protected tableName = 'attendance_events';

  protected mapDbToDomain(db: any): AttendanceEvent {
    return {
      id: db.id,
      employeeId: db.employee_id,
      branchId: db.branch_id,
      orgId: db.org_id,
      eventType: db.event_type,
      timestamp: db.timestamp,
      isBiometric: db.is_biometric,
      employeeName: db.employees?.name,
      employeeCode: db.employees?.employee_code,
    };
  }

  protected mapDomainToDb(domain: Partial<AttendanceEvent>): any {
    return {
      employee_id: domain.employeeId,
      branch_id: domain.branchId,
      org_id: domain.orgId,
      event_type: domain.eventType,
      timestamp: domain.timestamp,
      is_biometric: domain.isBiometric,
    };
  }

  /**
   * Fetches a full daily report with KPIs and employee list.
   */
  async getDailyReport(branchId: string, date: string): Promise<AttendanceReportSummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch shift start time for this branch
    const { data: branchData } = await supabase
      .from('branches')
      .select('shift_start_time')
      .eq('id', branchId)
      .single();

    const shiftStartTime = branchData?.shift_start_time || '09:00';

    // 2. Fetch all events for this day
    const { data: events, error } = await supabase
      .from(this.tableName)
      .select('*, employees(name, employee_code)')
      .eq('branch_id', branchId)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[AttendanceReportService] Error:', error);
      throw error;
    }

    // 3. Fetch all active employees for this branch
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .eq('branch_id', branchId)
      .eq('status', 'active');

    const mappedEvents = (events || []).map((e) => this.mapDbToDomain(e));
    const summaries = calculateWorkingHours(mappedEvents);

    // 4. Build per-employee summary
    const employees: DailyEmployeeSummary[] = (allEmployees || []).map((emp) => {
      const summary = summaries.get(emp.id);
      if (summary) {
        const empEvents = mappedEvents.filter((e) => e.employeeId === emp.id);
        const firstIn = empEvents.find((e) => e.eventType === 'IN')?.timestamp || null;
        const lastOut =
          [...empEvents].reverse().find((e) => e.eventType === 'OUT')?.timestamp || null;

        let lateness = { isLate: false, lateMinutes: 0 };
        if (firstIn) {
          lateness = checkLateness(firstIn, shiftStartTime);
        }

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employee_code,
          date,
          firstIn,
          lastOut,
          totalMinutes: summary.totalMinutes,
          sessions: summary.sessions.filter((s) => s.outTime).length,
          isLate: lateness.isLate,
          lateMinutes: lateness.lateMinutes,
          isOngoing: summary.isOngoing,
        };
      }

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employee_code,
        date,
        firstIn: null,
        lastOut: null,
        totalMinutes: 0,
        sessions: 0,
        isLate: false,
        lateMinutes: 0,
        isOngoing: false,
      };
    });

    const present = employees.filter((e) => e.firstIn !== null);

    return {
      totalEmployees: employees.length,
      presentCount: present.length,
      absentCount: employees.length - present.length,
      lateCount: present.filter((e) => e.isLate).length,
      avgMinutes:
        present.length > 0
          ? Math.round(present.reduce((s, e) => s + e.totalMinutes, 0) / present.length)
          : 0,
      employees,
    };
  }

  /**
   * Fetches a full monthly report for a single employee.
   * Uses a session-anchored algorithm to handle overnight shifts safely.
   */
  async getMonthlyEmployeeReport(
    branchId: string,
    employeeId: string,
    year: number,
    month: number
  ): Promise<MonthlyEmployeeReport> {
    // [Supabase RPC] Uses: supabase/attendance_report_rpc.sql
    // This RPC handles high-performance server-side pairing and aggregation.
    const { data, error } = await supabase.rpc('get_monthly_attendance_report', {
      p_branch_id: branchId,
      p_employee_id: employeeId,
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error('[AttendanceReportService] RPC Error:', error);
      throw error;
    }

    // 2. Fetch employee basic info (one simple query)
    const { data: empInfo } = await supabase
      .from('employees')
      .select('name, employee_code')
      .eq('id', employeeId)
      .single();

    // 3. Transform the RPC results into the MonthlyEmployeeReport structure
    const days: DayAttendanceSummary[] = (data.days || []).map((d: any) => ({
      date: d.date,
      dayOfWeek: new Date(d.date).getDay(),
      firstIn: d.firstIn,
      lastOut: d.lastOut,
      totalMinutes: d.totalMinutes,
      isPresent: d.isPresent,
      isLate: d.lateMinutes > 0,
      lateMinutes: d.lateMinutes,
      isOngoing: d.isOngoing,
      sessions: 0, // Not strictly needed for the profile view
    }));

    const daysInMonth = days.length;
    const presentDays = days.filter((d) => d.isPresent).length;
    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
    const totalLateMinutes = days.reduce((sum, d) => sum + d.lateMinutes, 0);

    return {
      employeeId,
      employeeName: empInfo?.name || '',
      employeeCode: empInfo?.employee_code || '',
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalDays: daysInMonth,
      presentDays,
      absentDays: daysInMonth - presentDays,
      lateDays: days.filter((d) => d.isLate).length,
      totalMinutes,
      attendanceRate: daysInMonth > 0 ? Math.round((presentDays / daysInMonth) * 1000) / 10 : 0,
      avgDailyMinutes: presentDays > 0 ? Math.round(totalMinutes / presentDays) : 0,
      totalLateMinutes,
      days,
    };
  }
}

export const attendanceReportService = new AttendanceReportService();
