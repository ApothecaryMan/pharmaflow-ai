/**
 * AttendanceTimeline Component
 * Displays a chronological vertical timeline of today's attendance events.
 * Color-coded: green for IN (دخول), red for OUT (انصراف).
 *
 * Used inside AttendanceTerminal to show all clock in/out events
 * for the current day in the branch.
 */

import React from 'react';
import type { AttendanceEvent } from '../../../types/hr';

interface AttendanceTimelineProps {
  events: AttendanceEvent[];
  language: 'EN' | 'AR';
  /** Translation object for attendance keys */
  t: {
    todayTimeline: string;
    noEventsToday: string;
    eventIn: string;
    eventOut: string;
  };
}

/**
 * Formats a timestamp string to a localized time string (e.g., "09:00 AM")
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export const AttendanceTimeline: React.FC<AttendanceTimelineProps> = ({
  events,
  language,
  t,
}) => {
  return (
    <div className="attendance-timeline">
      {/* Section Title */}
      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {t.todayTimeline}
      </h3>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
          <span className="material-symbols-rounded text-3xl mb-2 opacity-40">event_busy</span>
          <p className="text-sm">{t.noEventsToday}</p>
        </div>
      ) : (
        /* Timeline List */
        <div className="space-y-1">
          {events.map((event) => {
            const isIn = event.eventType === 'IN';
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 transition-colors"
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
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums min-w-[70px]">
                  {formatTime(event.timestamp)}
                </span>

                {/* Employee Name */}
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate">
                  {event.employeeName || event.employeeId.substring(0, 8)}
                </span>

                {/* Event Type Label */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isIn
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
                      : 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30'
                  }`}
                >
                  {isIn ? t.eventIn : t.eventOut}
                </span>

                {/* Biometric Indicator */}
                {event.isBiometric && (
                  <span
                    className="material-symbols-rounded text-sm text-emerald-500 dark:text-emerald-400"
                    title="Verified by biometric"
                  >
                    fingerprint
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceTimeline;
