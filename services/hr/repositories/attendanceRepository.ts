import { supabase } from '../../../lib/supabase';
import type { AttendanceEventType } from '../../../types/hr';

export interface AttendanceEventRow {
  id: string;
  employee_id: string;
  branch_id: string;
  org_id: string | null;
  event_type: string;
  is_biometric: boolean;
  timestamp: string;
  created_at: string;
  employees?: { name: string } | null;
}

interface AttendanceEventWithEmployeeRow extends AttendanceEventRow {
  employees?: { name: string; employee_code: string } | null;
}

interface ActiveEmployeeRow {
  id: string;
  name: string;
  employee_code: string;
}

interface LogEventRpcResult {
  id: string;
  employee_id: string;
  branch_id: string;
  event_type: string;
  is_biometric: boolean;
  timestamp: string;
}

interface MonthlyAttendanceDayRow {
  date: string;
  first_in: string | null;
  last_out: string | null;
  total_minutes: number;
  is_present: boolean;
  late_minutes: number;
  is_ongoing: boolean;
}

interface MonthlyAttendanceReportRow {
  days: MonthlyAttendanceDayRow[];
}

export const attendanceRepository = {
  async logEvent(
    employeeId: string,
    branchId: string,
    orgId: string | undefined,
    eventType: AttendanceEventType,
    terminalToken: string,
    isBiometric: boolean
  ): Promise<LogEventRpcResult> {
    const { data, error } = await supabase.rpc('log_attendance_event', {
      p_employee_id: employeeId,
      p_branch_id: branchId,
      p_org_id: orgId || null,
      p_event_type: eventType,
      p_terminal_token: terminalToken,
      p_is_biometric: isBiometric,
    });

    if (error) {
      if (error.message?.includes('INVALID_TERMINAL_TOKEN')) {
        throw new Error('INVALID_TERMINAL_TOKEN');
      }
      throw error;
    }

    return data as LogEventRpcResult;
  },

  async getTodayTimeline(branchId: string, startOfDay: string, endOfDay: string): Promise<AttendanceEventRow[]> {
    const { data, error } = await supabase
      .from('attendance_events')
      .select('*, employees(name)')
      .eq('branch_id', branchId)
      .gte('timestamp', startOfDay)
      .lt('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []) as AttendanceEventRow[];
  },

  async getEmployeeStatus(
    employeeId: string,
    branchId: string,
    startOfDay: string
  ): Promise<AttendanceEventType | null> {
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

  async validateTerminalToken(branchId: string, terminalToken: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('validate_terminal_token', {
      p_branch_id: branchId,
      p_terminal_token: terminalToken,
    });

    if (error) return false;
    return data === true;
  },

  async generateTerminalToken(branchId: string, newToken: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .update({ attendance_terminal_token: newToken })
      .eq('id', branchId);

    if (error) throw error;
  },

  async getBranchShiftStartTime(branchId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('branches')
      .select('shift_start_time')
      .eq('id', branchId)
      .single();

    if (error) return null;
    return data?.shift_start_time || null;
  },

  async getEventsWithEmployees(
    branchId: string,
    startOfDay: string,
    endOfDay: string
  ): Promise<AttendanceEventWithEmployeeRow[]> {
    const { data, error } = await supabase
      .from('attendance_events')
      .select('*, employees(name, employee_code)')
      .eq('branch_id', branchId)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []) as AttendanceEventWithEmployeeRow[];
  },

  async getActiveEmployees(branchId: string): Promise<ActiveEmployeeRow[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .eq('branch_id', branchId)
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  },

  async getEmployeeInfo(employeeId: string): Promise<{ name: string; employee_code: string } | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('name, employee_code')
      .eq('id', employeeId)
      .single();

    if (error) return null;
    return data || null;
  },

  async getMonthlyAttendanceReport(
    branchId: string,
    employeeId: string,
    year: number,
    month: number
  ): Promise<MonthlyAttendanceReportRow> {
    const { data, error } = await supabase.rpc('get_monthly_attendance_report', {
      p_branch_id: branchId,
      p_employee_id: employeeId,
      p_year: year,
      p_month: month,
    });

    if (error) throw error;
    return data as MonthlyAttendanceReportRow;
  },

  async setEmployeePin(employeeId: string, hashedPin: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .update({ attendance_pin: hashedPin })
      .eq('id', employeeId);

    if (error) throw error;
  },
};
