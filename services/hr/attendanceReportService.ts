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
}

export const attendanceReportService = new AttendanceReportService();
