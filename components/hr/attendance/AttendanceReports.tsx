import type React from 'react';
import { formatDuration } from '../../../utils/attendanceUtils';
import { CARD_LG } from '../../../utils/themeStyles';
import { DataPortButton } from '../../common/DataPortButton';
import { DatePicker } from '../../common/DatePicker';
import { PageHeader } from '../../common/PageHeader';
import { SearchInput } from '../../common/SearchInput';
import { SmallCard } from '../../common/SmallCard';
import { useAttendanceReports } from './useAttendanceReports';

interface AttendanceReportsProps {
  onViewChange?: (view: string, params?: any) => void;
}

const AttendanceReports: React.FC<AttendanceReportsProps> = ({ onViewChange }) => {
  const {
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
    showStats,
    setShowStats,
    showOnlyPresent,
    setShowOnlyPresent,
  } = useAttendanceReports({ onViewChange });

  const renderStats = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <SmallCard
        title={t.attendance.present}
        value={report?.presentCount || 0}
        valueSuffix={`/ ${report?.totalEmployees || 0}`}
        icon='person_check'
        iconColor='emerald'
        className='w-full'
      />
      <SmallCard
        title={t.attendance.absent}
        value={report?.absentCount || 0}
        icon='person_off'
        iconColor='rose'
        className='w-full'
      />
      <SmallCard
        title={t.attendance.late}
        value={report?.lateCount || 0}
        icon='schedule'
        iconColor='amber'
        className='w-full'
      />
      <SmallCard
        title={t.attendance.avgHours}
        value={report?.avgMinutes ? Math.floor(report.avgMinutes / 60) : 0}
        valueSuffix={formatDuration(report?.avgMinutes || 0, language)
          .replace(/[0-9]/g, '')
          .trim()}
        icon='timer'
        iconColor='indigo'
        className='w-full'
      />
    </div>
  );

  return (
    <div
      className={`h-full flex flex-col gap-4 overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <PageHeader
        title={t.attendance.attendanceReports}
        mb='mb-0'
        leftContent={
          <div className='flex items-center gap-3 w-full max-w-lg'>
            <div className='flex-1'>
              <SearchInput
                placeholder={t.attendance.searchEmployee}
                value={searchQuery}
                onSearchChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>
        }
        rightContent={
          <div className='flex items-center gap-3'>
            <DatePicker
              value={targetDate}
              onChange={(val) => handleDateChange(val)}
              label={t.attendance.date || 'Date'}
              color='primary'
              variant='pill-dark'
              size='md'
              translations={{
                cancel: t.common.cancel,
                ok: t.global.datePicker.ok,
                hour: t.global.datePicker.hour,
                minute: t.global.datePicker.minute,
                am: t.common.am,
                pm: t.common.pm,
              }}
            />
            <button
              onClick={() => setShowOnlyPresent(!showOnlyPresent)}
              className={`p-2.5 rounded-xl flex items-center justify-center border ${
                showOnlyPresent
                  ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
              }`}
              title={showOnlyPresent ? t.global.table.showAll : t.attendance.showPresentOnly}
            >
              <span className='material-symbols-rounded text-xl'>
                {showOnlyPresent ? 'person_check' : 'group'}
              </span>
            </button>
            <DataPortButton
              language={isRTL ? 'AR' : 'EN'}
              data={filteredEmployees}
              filename={`attendance-report-${targetDate.replace(/:/g, '-')}`}
              iconOnly={true}
              columns={columns.map((c) => ({
                key: c.key as any,
                header: c.label,
                format: (val, row) => {
                  if (c.id === 'duration') return formatDuration(val, language);
                  if (c.id === 'status')
                    return val ? t.attendance.lateStatusLate : t.attendance.lateStatusOk;
                  if (c.id === 'firstIn' || c.id === 'lastOut') {
                    return val
                      ? new Date(val).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';
                  }
                  return val;
                },
              }))}
            />
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer ${
                showStats
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
              title={showStats ? t.global.actions.hideStats : t.global.actions.showStats}
            >
              <span className={`material-symbols-rounded ${showStats ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
          </div>
        }
        showStatsToggle={false}
        showBottom={showStats}
        onToggleBottom={() => setShowStats(!showStats)}
        bottomContent={renderStats()}
      />

      <div className='flex-1 min-h-0'>
        <div className={`h-full flex flex-col overflow-hidden rounded-3xl ${CARD_LG}`}>
          <div className='flex-1 overflow-auto p-6 main-content-scroll'>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center py-20 gap-4'>
                <div className='w-12 h-12 border-4 border-primary-500/20 border-t-blue-500 rounded-full animate-spin' />
                <span className='text-gray-500 font-medium'>{t.common.loading}</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full min-h-[50vh] text-center'>
                <div className='flex items-center justify-center mb-8'>
                  <img
                    src='/empty-attendance.png'
                    alt='Empty'
                    className='w-56 h-56 object-contain opacity-90 drop-shadow-sm'
                  />
                </div>
                <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3'>
                  {t.attendance.noDataFound}
                </h3>
                <p className='text-lg text-gray-500 max-w-sm'>{t.attendance.noReportData}</p>
              </div>
            ) : (
              <table className='w-full text-left rtl:text-right border-separate border-spacing-y-2'>
                <thead>
                  <tr className='text-[11px] font-black tracking-widest text-(--text-tertiary) uppercase'>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className='pb-2 px-4 text-center'
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employeeId} className='bg-gray-100 dark:bg-(--bg-input) group'>
                      <td className='py-3 px-4 rounded-l-2xl rtl:rounded-l-none rtl:rounded-r-2xl text-center'>
                        <span className='text-sm text-gray-500 font-mono font-bold'>
                          {emp.employeeCode}
                        </span>
                      </td>
                      <td className='py-3 px-4 text-center'>
                        <span
                          className='font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer'
                          onClick={() =>
                            onViewChange?.('employee-attendance-profile', {
                              employeeId: emp.employeeId,
                            })
                          }
                        >
                          {emp.employeeName}
                        </span>
                      </td>
                      <td className='py-3 px-4 text-center'>
                        {emp.firstIn ? (
                          <div className='flex items-center justify-center gap-2'>
                            <span
                              className='material-symbols-rounded text-emerald-500'
                              style={{ fontSize: 'var(--icon-sm)' }}
                            >
                              login
                            </span>
                            <span className='text-sm font-medium tabular-nums'>
                              {new Date(emp.firstIn).toLocaleTimeString(
                                language === 'AR' ? 'ar-EG' : 'en-US',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </td>
                      <td className='py-3 px-4 text-center'>
                        {emp.lastOut ? (
                          <div className='flex items-center justify-center gap-2'>
                            <span
                              className='material-symbols-rounded text-rose-500'
                              style={{ fontSize: 'var(--icon-sm)' }}
                            >
                              logout
                            </span>
                            <span className='text-sm font-medium tabular-nums'>
                              {new Date(emp.lastOut).toLocaleTimeString(
                                language === 'AR' ? 'ar-EG' : 'en-US',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                          </div>
                        ) : emp.isOngoing ? (
                          <div className='flex items-center justify-center gap-2'>
                            <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                            <span className='text-xs text-emerald-600 font-medium'>
                              {t.attendance.ongoing}
                            </span>
                          </div>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </td>
                      <td className='py-3 px-4 text-center'>
                        <span className='text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300'>
                          {formatDuration(emp.totalMinutes, language)}
                        </span>
                      </td>
                      <td className='py-3 px-4 text-center'>
                        {emp.firstIn ? (
                          <span
                            className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${
                              emp.isLate
                                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                            }`}
                          >
                            <span
                              className='material-symbols-rounded'
                              style={{ fontSize: 'var(--icon-xs)' }}
                            >
                              {emp.isLate ? 'schedule' : 'check_circle'}
                            </span>
                            {emp.isLate ? t.attendance.lateStatusLate : t.attendance.lateStatusOk}
                          </span>
                        ) : (
                          <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                            {t.attendance.absent}
                          </span>
                        )}
                      </td>
                      <td className='py-3 px-4 rounded-r-2xl rtl:rounded-r-none rtl:rounded-l-2xl text-center'>
                        {emp.lateMinutes > 0 && (
                          <span className='text-xs font-bold text-rose-600 tabular-nums'>
                            +{formatDuration(emp.lateMinutes, language)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;
