/**
 * AttendanceTimeline Component
 * Displays a chronological vertical timeline of today's attendance events.
 * Color-coded: green for IN (دخول), red for OUT (انصراف).
 *
 * Features:
 *   - Summary bar showing total working hours per employee
 *   - Duration badges on OUT events showing session length
 *   - Pulsing "ongoing" indicator for employees currently clocked in
 *
 * Used inside AttendanceTerminal to show all clock in/out events
 * for the current day in the branch.
 */

import type React from 'react';
import { useMemo } from 'react';
import type { AttendanceEvent } from '../../../types/hr';
import {
  calculateSessionDuration,
  calculateWorkingHours,
  formatDuration,
} from '../../../utils/attendanceUtils';

interface AttendanceTimelineProps {
  events: AttendanceEvent[];
  language: 'EN' | 'AR';
  /** Translation object for attendance keys */
  t: {
    todayTimeline: string;
    noEventsToday: string;
    eventIn: string;
    eventOut: string;
    totalHours?: string;
    ongoing?: string;
  };
}

export const AttendanceTimeline: React.FC<AttendanceTimelineProps> = ({ events, language, t }) => {
  // ─── Localized Time Formatter ───
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ─── Calculate working hours summary ───
  const summaries = useMemo(() => calculateWorkingHours(events), [events]);
  const summaryEntries = useMemo(() => Array.from(summaries.values()), [summaries]);

  return (
    <div className='attendance-timeline'>
      {/* Section Title */}
      <h3 className='text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3'>
        {t.todayTimeline}
      </h3>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500'>
          <span className='material-symbols-rounded mb-2 opacity-40' style={{ fontSize: '32px' }}>
            event_busy
          </span>
          <p className='text-sm'>{t.noEventsToday}</p>
        </div>
      ) : (
        <>
          {/* ─── Working Hours Summary Bar ─── */}
          {summaryEntries.length > 0 && (
            <div className='flex flex-wrap gap-2 mb-3 px-1'>
              {summaryEntries.map((summary) => (
                <div
                  key={summary.employeeId}
                  className='flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm'
                >
                  <span className='text-[10px] font-bold text-blue-700 dark:text-blue-300 truncate max-w-[80px]'>
                    {summary.employeeName || summary.employeeId.substring(0, 6)}
                  </span>
                  <span className='text-[10px] font-bold text-blue-600 dark:text-blue-400 tabular-nums'>
                    {formatDuration(summary.totalMinutes, language)}
                  </span>
                  {summary.isOngoing && (
                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Timeline List */}
          <div className='space-y-1'>
            {events.map((event) => {
              const isIn = event.eventType === 'IN';
              // Calculate session duration for OUT events
              const sessionMinutes = !isIn ? calculateSessionDuration(event, events) : null;

              return (
                <div
                  key={event.id}
                  className='flex items-center gap-3 px-3 py-2 rounded-md bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800/60'
                >
                  {/* Status Indicator Dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isIn
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                        : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                    }`}
                  />

                  {/* Time */}
                  <span className='text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums min-w-[70px]'>
                    {formatTime(event.timestamp)}
                  </span>

                  {/* Employee Name */}
                  <span className='text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate'>
                    {event.employeeName || event.employeeId.substring(0, 8)}
                  </span>

                  {/* Session Duration Badge (OUT events only) */}
                  {sessionMinutes !== null && sessionMinutes > 0 && (
                    <span className='text-[9px] font-bold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md tabular-nums border border-transparent dark:border-white/5'>
                      {formatDuration(sessionMinutes, language)}
                    </span>
                  )}

                  {/* Event Type Label */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isIn
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20'
                    }`}
                  >
                    {isIn ? t.eventIn : t.eventOut}
                  </span>

                  {/* Biometric Indicator */}
                  {event.isBiometric && (
                    <span
                      className='material-symbols-rounded text-emerald-500 dark:text-emerald-400'
                      title='Verified by biometric'
                      style={{ fontSize: '18px' }}
                    >
                      fingerprint
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceTimeline;
