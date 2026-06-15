import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useSettings } from '../../../context/SettingsContext';
import { TRANSLATIONS } from '../../../i18n/translations';
import {
  attendanceReportService,
  type MonthlyEmployeeReport,
} from '../../../services/hr/attendanceReportService';
import { formatDuration } from '../../../utils/attendanceUtils';

/**
 * Hook to manage the state and data for an employee's monthly attendance profile.
 *
 * @param employeeId The ID of the employee to fetch the report for.
 */
export const useEmployeeAttendanceProfile = (employeeId?: string) => {
  const { language } = useSettings();
  const { activeBranchId } = useData();
  const isRTL = language === 'AR';
  const t = TRANSLATIONS[language];

  // --- State ---
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [report, setReport] = useState<MonthlyEmployeeReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchReport = async () => {
      if (!activeBranchId || !employeeId) return;

      setIsLoading(true);
      try {
        const data = await attendanceReportService.getMonthlyEmployeeReport(
          activeBranchId,
          employeeId,
          selectedYear,
          selectedMonth
        );
        setReport(data);
      } catch (error) {
        console.error('[useEmployeeAttendanceProfile] Error fetching report:', error);
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [activeBranchId, employeeId, selectedYear, selectedMonth]);

  // --- Handlers ---
  const handleMonthChange = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1); // Convert 0-indexed to 1-indexed
  };

  // --- Table Columns ---
  const columns = useMemo(
    () => [
      { id: 'date', label: t.attendance.date, key: 'date', width: '20%' },
      { id: 'day', label: t.attendance.day, key: 'dayOfWeek', width: '10%' },
      { id: 'firstIn', label: t.attendance.firstIn, key: 'firstIn', width: '15%' },
      { id: 'lastOut', label: t.attendance.lastOut, key: 'lastOut', width: '15%' },
      { id: 'duration', label: t.attendance.totalHours, key: 'totalMinutes', width: '15%' },
      { id: 'status', label: t.attendance.lateStatus, key: 'isLate', width: '15%' },
      { id: 'late', label: t.attendance.late, key: 'lateMinutes', width: '10%' },
    ],
    [t]
  );

  return {
    report,
    isLoading,
    selectedYear,
    selectedMonth,
    isRTL,
    t,
    columns,
    handleMonthChange,
    formatDuration,
  };
};
