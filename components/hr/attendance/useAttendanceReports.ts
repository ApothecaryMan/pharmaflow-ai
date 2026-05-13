import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../../context';
import { useData } from '../../../services';
import { attendanceReportService, type AttendanceReportSummary } from '../../../services/hr/attendanceReportService';
import { formatDuration } from '../../../utils/attendanceUtils';
import { TRANSLATIONS } from '../../../i18n/translations';
import { usePersistedState } from '../../../hooks/common/usePersistedState';
import { StorageKeys } from '../../../config/storageKeys';

interface UseAttendanceReportsProps {
  onViewChange?: (view: string, params?: any) => void;
}

export const useAttendanceReports = ({ onViewChange }: UseAttendanceReportsProps = {}) => {
  const { language } = useSettings();
  const { activeBranch } = useData();
  const isRTL = language === 'AR';
  const branchId = activeBranch?.id;
  const t = TRANSLATIONS[language];

  // Helper to get local ISO string (YYYY-MM-DDTHH:mm)
  const getLocalISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [targetDate, setTargetDate] = useState(getLocalISO());
  const [report, setReport] = useState<AttendanceReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = usePersistedState(StorageKeys.HEADER_STATS_VISIBLE, true);
  const [showOnlyPresent, setShowOnlyPresent] = useState(true);

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
    
    let baseList = report.employees;
    
    // Filter by presence if requested
    if (showOnlyPresent) {
      baseList = baseList.filter(e => e.firstIn !== null);
    }

    if (!searchQuery.trim()) return baseList;

    const q = searchQuery.toLowerCase();
    return baseList.filter(e => 
      e.employeeName.toLowerCase().includes(q) || 
      e.employeeCode.toLowerCase().includes(q)
    );
  }, [report, searchQuery, showOnlyPresent]);

  // --- Handlers ---
  const handleDateChange = (date: string) => {
    setTargetDate(date);
  };

  // --- Column Configuration ---
  const columns = useMemo(() => [
    { 
      id: 'code', 
      label: t.attendance.employeeCode, 
      width: '10%',
      key: 'employeeCode'
    },
    { 
      id: 'employee', 
      label: t.attendance.employeeName, 
      width: '20%',
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
    showStats,
    setShowStats,
    showOnlyPresent,
    setShowOnlyPresent,
  };
};
