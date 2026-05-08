import { supabase } from '../../lib/supabase';
import { BaseReportService, type BaseReportFilters } from '../core/baseReportService';
import { calculateWorkingHours, checkLateness, type EmployeeWorkSummary } from '../../utils/attendanceUtils';
import type { AttendanceEvent } from '../../types/hr';

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
  firstIn: string | null;    // Earliest IN timestamp
  lastOut: string | null;    // Latest OUT timestamp
  totalMinutes: number;      // Total working hours
  sessions: number;          // Number of IN/OUT pairs
  isLate: boolean;           // Compared to shift schedule
  lateMinutes: number;       // How many minutes late
  isOngoing: boolean;        // Still working (no final OUT)
}

export interface AttendanceReportSummary {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  avgMinutes: number;        // Average working hours
  employees: DailyEmployeeSummary[];
}

// ── Monthly Employee Report Types ──

export interface DayAttendanceSummary {
  date: string;            // "2026-05-01" (ISO date string)
  dayOfWeek: number;       // 0=Sun ... 6=Sat
  firstIn: string | null;  // ISO timestamp of first IN
  lastOut: string | null;  // ISO timestamp of last OUT (may be next day for overnight)
  totalMinutes: number;
  sessions: number;        // completed IN→OUT pairs
  isPresent: boolean;
  isLate: boolean;
  lateMinutes: number;
  isOngoing: boolean;      // true ONLY for today's last unclosed session
}

export interface MonthlyEmployeeReport {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  month: string;              // "2026-05"
  // KPIs
  totalDays: number;          // calendar days in month (28-31)
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalMinutes: number;       // sum of all working minutes
  attendanceRate: number;     // (presentDays / totalDays) * 100, rounded to 1 decimal
  avgDailyMinutes: number;    // totalMinutes / presentDays, rounded. 0 if no present days.
  totalLateMinutes: number;   // sum of all lateMinutes
  // Daily breakdown
  days: DayAttendanceSummary[];
}

/**
 * AttendanceReportService
 * Handles aggregation and reporting for attendance events.
 */
export class AttendanceReportService extends BaseReportService<AttendanceEvent, AttendanceReportFilters> {
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

    const mappedEvents = (events || []).map(e => this.mapDbToDomain(e));
    const summaries = calculateWorkingHours(mappedEvents);

    // 4. Build per-employee summary
    const employees: DailyEmployeeSummary[] = (allEmployees || []).map(emp => {
      const summary = summaries.get(emp.id);
      if (summary) {
        const empEvents = mappedEvents.filter(e => e.employeeId === emp.id);
        const firstIn = empEvents.find(e => e.eventType === 'IN')?.timestamp || null;
        const lastOut = [...empEvents].reverse().find(e => e.eventType === 'OUT')?.timestamp || null;
        
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
          sessions: summary.sessions.filter(s => s.outTime).length,
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

    const present = employees.filter(e => e.firstIn !== null);

    return {
      totalEmployees: employees.length,
      presentCount: present.length,
      absentCount: employees.length - present.length,
      lateCount: present.filter(e => e.isLate).length,
      avgMinutes: present.length > 0
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
    month: number // 1-indexed: 1=Jan, 12=Dec
  ): Promise<MonthlyEmployeeReport> {
    // 1. Date range with ±1 day buffer for overnight shift safety
    const monthStart = new Date(year, month - 1, 1);           // e.g., May 1 00:00
    const monthEnd = new Date(year, month, 0);                  // e.g., May 31
    const daysInMonth = monthEnd.getDate();                     // e.g., 31

    const queryStart = new Date(year, month - 1, 0);            // Apr 30 (buffer before)
    queryStart.setHours(0, 0, 0, 0);
    const queryEnd = new Date(year, month, 1, 23, 59, 59, 999); // Jun 1 end (buffer after)

    // 2. Fetch shift start time for the branch
    const { data: branchData } = await supabase
      .from('branches')
      .select('shift_start_time')
      .eq('id', branchId)
      .single();
    const shiftStartTime = branchData?.shift_start_time || '09:00';

    // 3. Fetch ALL events in extended range for this specific employee
    const { data: events, error } = await supabase
      .from(this.tableName)
      .select('*, employees(name, employee_code)')
      .eq('branch_id', branchId)
      .eq('employee_id', employeeId)
      .gte('timestamp', queryStart.toISOString())
      .lte('timestamp', queryEnd.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[AttendanceReportService] Monthly report error:', error);
      throw error;
    }

    // 4. Map and run global IN→OUT pairing on the full event set
    const mappedEvents = (events || []).map(e => this.mapDbToDomain(e));
    const summaries = calculateWorkingHours(mappedEvents);
    const empSummary = summaries.get(employeeId);

    // Get basic employee info
    const empName = mappedEvents[0]?.employeeName || '';
    const empCode = mappedEvents[0]?.employeeCode || '';

    // 5. Bucket sessions by IN-date (anchored to the day the shift started)
    const dayBuckets = new Map<string, {
      sessions: { inTime: string; outTime: string | null; minutes: number }[];
      firstIn: string | null;
      lastOut: string | null;
      totalMinutes: number;
      isOngoing: boolean;
    }>();

    if (empSummary) {
      for (const session of empSummary.sessions) {
        const inDate = new Date(session.inTime);
        const inDay = inDate.getDate();
        const inMonth = inDate.getMonth() + 1; // 1-indexed
        const inYear = inDate.getFullYear();

        // CRITICAL: Only include session if it started within the target month
        if (inYear !== year || inMonth !== month) continue;

        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(inDay).padStart(2, '0')}`;

        if (!dayBuckets.has(dateKey)) {
          dayBuckets.set(dateKey, {
            sessions: [],
            firstIn: null,
            lastOut: null,
            totalMinutes: 0,
            isOngoing: false,
          });
        }

        const bucket = dayBuckets.get(dateKey)!;
        bucket.sessions.push({
          inTime: session.inTime,
          outTime: session.outTime,
          minutes: session.minutes,
        });
        bucket.totalMinutes += session.minutes;

        // Track firstIn (earliest IN of the day)
        if (!bucket.firstIn || new Date(session.inTime) < new Date(bucket.firstIn)) {
          bucket.firstIn = session.inTime;
        }

        // Track lastOut (could be early next morning for overnight shifts)
        if (session.outTime) {
          if (!bucket.lastOut || new Date(session.outTime) > new Date(bucket.lastOut)) {
            bucket.lastOut = session.outTime;
          }
        } else {
          bucket.isOngoing = true;
        }
      }
    }

    // 6. Build final calendar: iterate through all days of the month (e.g., 1-31)
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const days: DayAttendanceSummary[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const bucket = dayBuckets.get(dateKey);

      let isLate = false;
      let lateMinutes = 0;

      if (bucket?.firstIn) {
        const lateness = checkLateness(bucket.firstIn, shiftStartTime);
        isLate = lateness.isLate;
        lateMinutes = lateness.lateMinutes;
      }

      days.push({
        date: dateKey,
        dayOfWeek: dateObj.getDay(),
        firstIn: bucket?.firstIn || null,
        lastOut: bucket?.lastOut || null,
        totalMinutes: bucket?.totalMinutes || 0,
        sessions: bucket?.sessions.filter(s => s.outTime !== null).length || 0,
        isPresent: !!bucket?.firstIn,
        isLate,
        lateMinutes,
        isOngoing: dateKey === todayKey && (bucket?.isOngoing || false),
      });
    }

    // 7. Aggregate KPIs
    const presentDays = days.filter(d => d.isPresent).length;
    const absentDays = daysInMonth - presentDays;
    const lateDays = days.filter(d => d.isLate).length;
    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
    const totalLateMinutes = days.reduce((sum, d) => sum + d.lateMinutes, 0);

    return {
      employeeId,
      employeeName: empName,
      employeeCode: empCode,
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalDays: daysInMonth,
      presentDays,
      absentDays,
      lateDays,
      totalMinutes,
      attendanceRate: daysInMonth > 0 ? Math.round((presentDays / daysInMonth) * 1000) / 10 : 0,
      avgDailyMinutes: presentDays > 0 ? Math.round(totalMinutes / presentDays) : 0,
      totalLateMinutes,
      days,
    };
  }
}

export const attendanceReportService = new AttendanceReportService();
