import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../../context';
import { useData } from '../../../services';
import { attendanceReportService, type AttendanceReportSummary } from '../../../services/hr/attendanceReportService';
import { formatDuration } from '../../../utils/attendanceUtils';
import { TRANSLATIONS } from '../../../i18n/translations';

interface UseAttendanceReportsProps {
  onViewChange?: (view: string, params?: any) => void;
}

export const useAttendanceReports = ({ onViewChange }: UseAttendanceReportsProps = {}) => {
  const { language } = useSettings();
  const { activeBranch } = useData();
  const isRTL = language === 'AR';
  const branchId = activeBranch?.id;
  const t = TRANSLATIONS[language];

  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<AttendanceReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Fetch Data ---
  useEffect(() => {
    const fetchReport = async () => {
      if (!branchId) return;
      setIsLoading(true);
      try {
        const data = await attendanceReportService.getDailyReport(branchId, targetDate);
        setReport(data);
      } catch (err) {
        console.error('[useAttendanceReports] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [branchId, targetDate]);

  // --- Filtering ---
  const filteredEmployees = useMemo(() => {
    if (!report) return [];
    if (!searchQuery.trim()) return report.employees;

    const q = searchQuery.toLowerCase();
    return report.employees.filter(e => 
      e.employeeName.toLowerCase().includes(q) || 
      e.employeeCode.toLowerCase().includes(q)
    );
  }, [report, searchQuery]);

  // --- Handlers ---
  const handleDateChange = (date: string) => {
    setTargetDate(date);
  };

  // --- Column Configuration ---
  const columns = useMemo(() => [
    { 
      id: 'employee', 
      label: t.attendance.employeeName, 
      width: '25%',
      key: 'employeeName'
    },
    { 
      id: 'firstIn', 
      label: t.attendance.firstIn, 
      width: '15%',
      key: 'firstIn'
    },
    { 
      id: 'lastOut', 
      label: t.attendance.lastOut, 
      width: '15%',
      key: 'lastOut'
    },
    { 
      id: 'duration', 
      label: isRTL ? 'الساعات' : 'Hours', // t.attendance.totalHours is plural? let's see
      width: '15%',
      key: 'totalMinutes'
    },
    { 
      id: 'status', 
      label: t.attendance.lateStatus, 
      width: '15%',
      key: 'isLate'
    },
    { 
      id: 'lateMinutes', 
      label: t.attendance.late, // Using 'Late' as header
      width: '15%',
      key: 'lateMinutes'
    }
  ], [t, isRTL]);

  return {
    report,
    isLoading,
    targetDate,
    searchQuery,
    filteredEmployees,
    columns,
    isRTL,
    language,
    t,
    setSearchQuery,
    handleDateChange,
    formatDuration,
  };
};
