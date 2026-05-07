/**
 * AttendanceTerminal Component
 * Main page for biometric attendance tracking.
 *
 * Architecture: 3 Security Layers
 *   Layer 1: WebAuthn Biometric  → Proves WHO (employee identity)
 *   Layer 2: Terminal UUID Token  → Proves WHERE (pharmacy device)
 *   Layer 3: Supabase now()       → Proves WHEN (server time, untamperable)
 *
 * Three UI States:
 *   State 1: Access Denied — user lacks attendance.clock permission
 *   State 2: Locked — terminal not activated (token not entered)
 *     - If user has attendance.activate_terminal → shows token input
 *     - If user does NOT → shows "contact admin" message
 *   State 3: Ready — token validated, scanner + timeline active
 *
 * Token Storage: sessionStorage
 *   - Survives page refresh ✅
 *   - Cleared automatically when tab/browser closes ✅
 *   - Scoped to the current tab only (not shared across tabs) ✅
 *   - NOT in localStorage (never persists beyond session)
 *   - On mount, re-validates stored token with server before activating
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../../../i18n/translations';
import { useData } from '../../../services';
import { attendanceService } from '../../../services/hr/attendanceService';
import { permissionsService } from '../../../services/auth/permissionsService';
import { isWebAuthnSupported } from '../../../utils/webAuthnUtils';
import { startAuthentication } from '@simplewebauthn/browser';
import type { AttendanceEvent, AttendanceEventType, Employee } from '../../../types/hr';
import { AttendanceTimeline } from './AttendanceTimeline';

// ═══════════════════════════════════════════
// Props
// ═══════════════════════════════════════════

interface AttendanceTerminalProps {
  language: 'EN' | 'AR';
}

// ═══════════════════════════════════════════
// Terminal States
// ═══════════════════════════════════════════

type TerminalState = 'denied' | 'locked' | 'ready';

// sessionStorage key — scoped per tab, cleared on browser close
const SESSION_TOKEN_KEY = 'attendance_terminal_token';

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export const AttendanceTerminal: React.FC<AttendanceTerminalProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const { employees, activeBranchId, activeOrgId } = useData();

  // ─── Permission Checks ───
  const canClock = permissionsService.can('attendance.clock');
  const canActivate = permissionsService.can('attendance.activate_terminal');

  // ─── Terminal State (sessionStorage — survives refresh, clears on tab close) ───
  const [terminalToken, setTerminalToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Loading state for auto-restore

  // ─── PIN Fallback State ───
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // ─── Attendance Data ───
  const [timeline, setTimeline] = useState<AttendanceEvent[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<AttendanceEventType | null>(null);
  const [isClocking, setIsClocking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAction, setLastAction] = useState<{ type: AttendanceEventType; name: string } | null>(null);

  // ─── Derived State ───
  const terminalState: TerminalState = !canClock ? 'denied' : terminalToken ? 'ready' : 'locked';

  // Filter active employees for the selector
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const filteredEmployees = searchQuery
    ? activeEmployees.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.nameArabic?.includes(searchQuery) ||
          e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeEmployees;

  // ─── Fetch Timeline ───
  const refreshTimeline = useCallback(async () => {
    if (!activeBranchId || !terminalToken) return;
    try {
      const events = await attendanceService.getTodayTimeline(activeBranchId);
      setTimeline(events);
    } catch (err) {
      console.error('[AttendanceTerminal] Failed to fetch timeline:', err);
    }
  }, [activeBranchId, terminalToken]);

  // ─── Fetch Employee Status ───
  const refreshEmployeeStatus = useCallback(async () => {
    if (!selectedEmployee || !activeBranchId) return;
    try {
      const status = await attendanceService.getEmployeeStatus(selectedEmployee.id, activeBranchId);
      setEmployeeStatus(status);
    } catch (err) {
      console.error('[AttendanceTerminal] Failed to fetch employee status:', err);
    }
  }, [selectedEmployee, activeBranchId]);

  // ─── Auto-restore token from sessionStorage on mount ───
  useEffect(() => {
    const restore = async () => {
      const stored = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (stored && activeBranchId) {
        // Re-validate with server to ensure the token is still valid
        const isValid = await attendanceService.validateTerminalToken(activeBranchId, stored);
        if (isValid) {
          setTerminalToken(stored);
        } else {
          // Token was invalidated (owner regenerated it) — clear stale value
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
      setIsRestoring(false);
    };
    restore();
  }, [activeBranchId]);

  // Auto-refresh timeline when terminal becomes ready
  useEffect(() => {
    if (terminalState === 'ready') {
      refreshTimeline();
    }
  }, [terminalState, refreshTimeline]);

  // Auto-refresh status when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      refreshEmployeeStatus();
    }
  }, [selectedEmployee, refreshEmployeeStatus]);

  // ─── Token Validation Handler ───
  const handleActivateTerminal = async () => {
    if (!tokenInput.trim() || !activeBranchId) return;
    setIsValidating(true);
    setTokenError('');

    try {
      const isValid = await attendanceService.validateTerminalToken(activeBranchId, tokenInput.trim());
      if (isValid) {
        const token = tokenInput.trim();
        setTerminalToken(token);
        setTokenInput('');
        // Persist in sessionStorage — survives refresh, clears on tab close
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        setTokenError(t.attendance.invalidToken);
      }
    } catch (err) {
      setTokenError(t.attendance.invalidToken);
    } finally {
      setIsValidating(false);
    }
  };

   // ─── Clock In/Out Handler ───
  const handleClock = async (pinOverride?: string) => {
    if (!selectedEmployee || !activeBranchId || isClocking) return;

    const nextEventType: AttendanceEventType = employeeStatus === 'IN' ? 'OUT' : 'IN';
    setIsClocking(true);
    setLastAction(null);

    try {
      // Step 1: Identity Verification
      let isBiometric = false;

      if (selectedEmployee.biometricCredentialId && isWebAuthnSupported()) {
        // Path A: Biometric available → try WebAuthn
        try {
          const asseResp = await startAuthentication({
            optionsJSON: {
              challenge: btoa(Date.now().toString()),
              rpId: window.location.hostname,
              allowCredentials: [
                {
                  id: selectedEmployee.biometricCredentialId,
                  type: 'public-key',
                },
              ],
              timeout: 60000,
              userVerification: 'required',
            },
          });
          if (asseResp?.id) {
            isBiometric = true;
          }
        } catch (bioErr) {
          // Biometric failed or cancelled
          // If employee has PIN → show PIN input instead
          if (selectedEmployee.attendancePin && !pinOverride) {
            setShowPinInput(true);
            setIsClocking(false);
            return;
          }
          console.warn('[AttendanceTerminal] Biometric verification skipped:', bioErr);
        }
      } else if (selectedEmployee.attendancePin && !pinOverride) {
        // Path B: No biometric, but has PIN → show PIN input
        setShowPinInput(true);
        setIsClocking(false);
        return;
      }

      // Step 1b: PIN verification (if coming from PIN input)
      if (pinOverride && selectedEmployee.attendancePin) {
        const pinValid = await attendanceService.verifyEmployeePin(
          pinOverride,
          selectedEmployee.attendancePin
        );
        if (!pinValid) {
          setPinError(t.attendance.invalidPin);
          setIsClocking(false);
          return;
        }
        // PIN verified — clear PIN UI
        setShowPinInput(false);
        setPinInput('');
        setPinError('');
      }

      // Step 2: Log the event via RPC (server validates token + generates timestamp)
      await attendanceService.logEvent(
        selectedEmployee.id,
        activeBranchId,
        activeOrgId || undefined,
        nextEventType,
        terminalToken,
        isBiometric
      );

      // Step 3: Update UI
      setLastAction({ type: nextEventType, name: selectedEmployee.name });
      await refreshTimeline();
      await refreshEmployeeStatus();

      // Auto-clear success message after 3 seconds
      setTimeout(() => setLastAction(null), 3000);
    } catch (err: any) {
      if (err?.message === 'INVALID_TERMINAL_TOKEN') {
        // Token was invalidated (owner generated a new one)
        setTerminalToken('');
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setTokenError(t.attendance.invalidToken);
      } else {
        console.error('[AttendanceTerminal] Clock error:', err);
      }
    } finally {
      setIsClocking(false);
    }
  };

  // ═══════════════════════════════════════════
  // RENDER: Restoring (checking sessionStorage)
  // ═══════════════════════════════════════════
  if (isRestoring) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-600 mb-3 block animate-spin">
            progress_activity
          </span>
          <p className="text-gray-400 dark:text-gray-500 text-xs">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (terminalState === 'denied') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-rounded text-5xl text-gray-300 dark:text-gray-600 mb-4 block">
            lock
          </span>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t.attendance.accessDenied}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER: Terminal Locked
  // ═══════════════════════════════════════════
  if (terminalState === 'locked') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          {/* Locked Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-4">
              <span className="material-symbols-rounded text-4xl text-gray-400 dark:text-gray-500">
                lock
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {t.attendance.terminalLocked}
            </h2>
          </div>

          {/* If user CAN activate → show token input */}
          {canActivate ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t.attendance.enterToken}
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTokenError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleActivateTerminal()}
                placeholder={t.attendance.tokenPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                autoFocus
                dir="ltr"
              />

              {/* Error Message */}
              {tokenError && (
                <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm">error</span>
                  {tokenError}
                </p>
              )}

              {/* Activate Button */}
              <button
                onClick={handleActivateTerminal}
                disabled={!tokenInput.trim() || isValidating}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span>
                ) : (
                  <span className="material-symbols-rounded text-lg">lock_open</span>
                )}
                {t.attendance.activateTerminal}
              </button>
            </div>
          ) : (
            /* User CANNOT activate → show "contact admin" message */
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.attendance.terminalNotActivated}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t.attendance.contactAdmin}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER: Terminal Ready (Main Attendance Screen)
  // ═══════════════════════════════════════════

  // Determine button state based on employee's last event
  const isClockIn = employeeStatus !== 'IN';
  const buttonLabel = isClockIn ? t.attendance.clockIn : t.attendance.clockOut;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* ─── Header ─── */}
      <div className="pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white page-title">
            {t.attendance.title}
          </h1>
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono tabular-nums">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.attendance.subtitle}</p>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* ─── Success Banner ─── */}
        {lastAction && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all animate-in slide-in-from-top-2 ${
              lastAction.type === 'IN'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400'
            }`}
          >
            <span className="material-symbols-rounded text-xl">
              {lastAction.type === 'IN' ? 'check_circle' : 'logout'}
            </span>
            <span className="text-sm font-bold">
              {lastAction.name} — {lastAction.type === 'IN' ? t.attendance.clockInSuccess : t.attendance.clockOutSuccess}
            </span>
          </div>
        )}

        {/* ─── Employee Selector ─── */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            {t.attendance.selectEmployee}
          </label>

          {/* Search Input */}
          <div className="relative mb-3">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.attendance.searchEmployee}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Employee List */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    {emp.image ? (
                      <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {emp.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {emp.name}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {emp.position || emp.role}
                    </div>
                  </div>

                  {/* Biometric Indicator */}
                  {emp.biometricCredentialId && (
                    <span className="material-symbols-rounded text-sm text-emerald-500">
                      fingerprint
                    </span>
                  )}

                  {/* Selected Check */}
                  {isSelected && (
                    <span className="material-symbols-rounded text-blue-500 text-lg">check_circle</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Clock Button (Large Fingerprint Action) ─── */}
        {selectedEmployee && (
          <div className="flex flex-col items-center py-4">
            {/* Status Label */}
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              {employeeStatus === 'IN'
                ? t.attendance.currentlyIn
                : employeeStatus === 'OUT'
                ? t.attendance.currentlyOut
                : t.attendance.notClockedIn}
            </p>

            {/* PIN Input (shown when biometric fails/unavailable) */}
            {showPinInput ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <span className="material-symbols-rounded text-4xl text-amber-600 dark:text-amber-400">pin</span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(val);
                    setPinError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pinInput.length === 4) {
                      handleClock(pinInput);
                    } else if (e.key === 'Escape') {
                      setShowPinInput(false);
                      setPinInput('');
                      setPinError('');
                    }
                  }}
                  placeholder={t.attendance.pinPlaceholder}
                  className="w-32 text-center text-2xl font-bold tracking-[0.5em] px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoFocus
                  dir="ltr"
                />
                {pinError && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">error</span>
                    {pinError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleClock(pinInput)}
                    disabled={pinInput.length !== 4 || isClocking}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                  >
                    {t.attendance.enterPin}
                  </button>
                  <button
                    onClick={() => { setShowPinInput(false); setPinInput(''); setPinError(''); }}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-sm font-bold transition-colors hover:bg-gray-200 dark:hover:bg-white/15"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Big Fingerprint Button */}
                <button
                  onClick={() => handleClock()}
                  disabled={isClocking}
                  className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                    isClocking
                      ? 'bg-gray-200 dark:bg-gray-700 cursor-wait'
                      : isClockIn
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                      : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                  }`}
                >
                  <span className="material-symbols-rounded text-5xl text-white">
                    {isClocking ? 'progress_activity' : 'fingerprint'}
                  </span>
                </button>

                {/* Button Label */}
                <p
                  className={`mt-3 text-sm font-bold ${
                    isClockIn
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {buttonLabel}
                </p>

                {/* Verification Method Hint */}
                {selectedEmployee.biometricCredentialId && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {t.attendance.touchSensor}
                  </p>
                )}
                {!selectedEmployee.biometricCredentialId && selectedEmployee.attendancePin && (
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs">pin</span>
                    {t.attendance.pinOrBiometric}
                  </p>
                )}
                {!selectedEmployee.biometricCredentialId && !selectedEmployee.attendancePin && (
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs">warning</span>
                    {t.attendance.noPinNoBiometric}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Today's Timeline ─── */}
        <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <AttendanceTimeline
            events={timeline}
            language={language}
            t={{
              todayTimeline: t.attendance.todayTimeline,
              noEventsToday: t.attendance.noEventsToday,
              eventIn: t.attendance.eventIn,
              eventOut: t.attendance.eventOut,
              totalHours: t.attendance.totalHours,
              ongoing: t.attendance.ongoing,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceTerminal;
