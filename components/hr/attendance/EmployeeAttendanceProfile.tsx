import React from 'react';
import { PageHeader } from '../../common/PageHeader';
import { SmallCard } from '../../common/SmallCard';
import { DatePicker } from '../../common/DatePicker';
import { DataPortButton } from '../../common/DataPortButton';
import { useEmployeeAttendanceProfile } from './useEmployeeAttendanceProfile';

interface EmployeeAttendanceProfileProps {
  onViewChange?: (view: string, params?: any) => void;
  employeeId?: string; // passed via navigation params
}

export const EmployeeAttendanceProfile: React.FC<EmployeeAttendanceProfileProps> = ({
  onViewChange,
  employeeId,
}) => {
  const {
    report,
    isLoading,
    selectedYear,
    selectedMonth,
    isRTL,
    t,
    columns,
    handleMonthChange,
    formatDuration,
  } = useEmployeeAttendanceProfile(employeeId);

  // Helper for date string construction for DatePicker
  const currentMonthDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01T00:00`;
  const languageLocale = isRTL ? 'ar-EG' : 'en-US';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <PageHeader
        leftContent={
          <button
            onClick={() => onViewChange?.('attendance-reports')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <span className="material-symbols-rounded text-lg">
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </span>
            <span className="text-sm font-medium">{t.attendance.backToReports}</span>
          </button>
        }
        title={report ? `${report.employeeName} (${report.employeeCode})` : t.attendance.attendanceProfile}
        rightContent={
          <div className="flex items-center gap-3">
            <DatePicker
              value={currentMonthDateStr}
              onChange={handleMonthChange}
              label={t.common.selectMonth}
              color="blue"
              maxDate={new Date().toISOString()}
            />
            {report && (
              <DataPortButton
                language={isRTL ? 'AR' : 'EN'}
                data={report.days}
                filename={`attendance-${report.employeeName}-${report.month}`}
                columns={columns.map(c => ({
                  key: c.key as any,
                  header: c.label,
                  format: (val, row) => {
                    if (c.id === 'duration') return formatDuration(val);
                    if (c.id === 'status') return row.isPresent ? (row.isLate ? t.attendance.lateStatusLate : t.attendance.lateStatusOk) : t.attendance.absent;
                    if (c.id === 'firstIn' || c.id === 'lastOut') {
                      return val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                    }
                    if (c.id === 'day') {
                      return new Date(row.date).toLocaleDateString(languageLocale, { weekday: 'short' });
                    }
                    return val;
                  }
                }))}
              />
            )}
          </div>
        }
      />

      <div className="px-page pb-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SmallCard
            title={t.attendance.attendanceRate}
            value={isLoading ? '...' : `${report?.attendanceRate || 0}`}
            valueSuffix="%"
            icon="percent"
            iconColor="emerald"
          />
          <SmallCard
            title={t.attendance.totalHoursMonth}
            value={isLoading ? '...' : `${Math.floor((report?.totalMinutes || 0) / 60)}`}
            valueSuffix={t.attendance.hourSymbol}
            icon="timer"
            iconColor="indigo"
          />
          <SmallCard
            title={t.attendance.lateDays}
            value={isLoading ? '...' : `${report?.lateDays || 0}`}
            valueSuffix={`/ ${report?.totalDays || 0}`}
            icon="schedule"
            iconColor="amber"
          />
          <SmallCard
            title={t.attendance.absentDays}
            value={isLoading ? '...' : `${report?.absentDays || 0}`}
            valueSuffix={`/ ${report?.totalDays || 0}`}
            icon="person_off"
            iconColor="rose"
          />
        </div>

        {/* Attendance Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/30">
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-${isRTL ? 'right' : 'left'}`}
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-zinc-500">{t.common.loading}</span>
                      </div>
                    </td>
                  </tr>
                ) : !report || report.days.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-20 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-rounded text-4xl opacity-20">person_search</span>
                        <span className="text-sm font-medium">{t.attendance.noDataFound}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  report.days.map((day) => {
                    const isOvernightOut = day.firstIn && day.lastOut && 
                      new Date(day.lastOut).toDateString() !== new Date(day.firstIn).toDateString();
                    
                    return (
                      <tr 
                        key={day.date}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group"
                      >
                        {/* Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {new Date(day.date).toLocaleDateString(languageLocale, { day: 'numeric', month: 'short' })}
                          </span>
                        </td>

                        {/* Day */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                            {new Date(day.date).toLocaleDateString(languageLocale, { weekday: 'short' })}
                          </span>
                        </td>

                        {/* First IN */}
                        <td className="px-6 py-4">
                          {day.firstIn ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <span className="material-symbols-rounded text-lg">login</span>
                              <span className="text-sm font-medium">
                                {new Date(day.firstIn).toLocaleTimeString(languageLocale, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">-</span>
                          )}
                        </td>

                        {/* Last OUT */}
                        <td className="px-6 py-4">
                          {day.lastOut ? (
                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                              <span className="material-symbols-rounded text-lg">logout</span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">
                                  {new Date(day.lastOut).toLocaleTimeString(languageLocale, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOvernightOut && (
                                  <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 px-1 rounded text-rose-600 dark:text-rose-400">
                                    {t.attendance.nextDay}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : day.isOngoing ? (
                            <div className="flex items-center gap-2 text-emerald-500">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="text-sm font-medium">{t.attendance.ongoing}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">-</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4">
                          <span className={`text-sm font-mono ${day.totalMinutes > 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-700'}`}>
                            {day.totalMinutes > 0 ? formatDuration(day.totalMinutes) : '-'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {!day.isPresent ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              {t.attendance.absent}
                            </span>
                          ) : day.isLate ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {t.attendance.lateStatusLate}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {t.attendance.lateStatusOk}
                            </span>
                          )}
                        </td>

                        {/* Late Minutes */}
                        <td className="px-6 py-4">
                          {day.lateMinutes > 0 && (
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                              +{day.lateMinutes} {t.attendance.minuteSymbol}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceProfile;
