import React, { useState, useRef, useEffect } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { attendanceService } from '../../services/hr/attendanceService';
import { isWebAuthnSupported } from '../../utils/webAuthnUtils';
import { startAuthentication } from '@simplewebauthn/browser';
import { useData } from '../../context/DataContext';
import { Icons } from '../common/Icons';
import { Tooltip } from '../common/Tooltip';
import type { Employee } from '../../types/hr';

interface AttendanceQuickActionProps {
  language: 'EN' | 'AR';
}

type Step = 'idle' | 'username' | 'biometric' | 'success' | 'error';

const SESSION_TOKEN_KEY = 'attendance_terminal_token';

export const AttendanceQuickAction: React.FC<AttendanceQuickActionProps> = ({ language }) => {
  const [step, setStep] = useState<Step>('idle');
  const [username, setUsername] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { employees, activeBranchId, activeOrgId } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];
  const isAR = language === 'AR';

  // Auto-focus input when entering username step
  useEffect(() => {
    if (step === 'username' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const reset = () => {
    setStep('idle');
    setUsername('');
    setSelectedEmployee(null);
    setIsLoading(false);
    setErrorMessage('');
  };

  const handleStart = () => {
    // Check if terminal is activated
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      setStep('error');
      setErrorMessage(isAR ? 'المحطة غير مفعلة' : 'Terminal not activated');
      setTimeout(reset, 3000);
      return;
    }
    setStep('username');
  };

  const handleUsernameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim()) return;

    const found = (employees as Employee[]).find(
      (emp) => emp.username?.toLowerCase() === username.trim().toLowerCase() || 
               emp.employeeCode?.toLowerCase() === username.trim().toLowerCase()
    );

    if (found) {
      if (!found.biometricCredentialId) {
         setStep('error');
         setErrorMessage(isAR ? 'لا يوجد بصمة مسجلة' : 'No biometric registered');
         setTimeout(reset, 3000);
         return;
      }
      setSelectedEmployee(found);
      setStep('biometric');
    } else {
      setStep('error');
      setErrorMessage(isAR ? 'الموظف غير موجود' : 'Employee not found');
      setTimeout(reset, 3000);
    }
  };

  const handleBiometric = async () => {
    if (!selectedEmployee || !activeBranchId) return;
    
    setIsLoading(true);
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);

    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn not supported');
      }

      // 1. Biometric Auth
      const asseResp = await startAuthentication({
        optionsJSON: {
          challenge: btoa(Date.now().toString()),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              id: selectedEmployee.biometricCredentialId!,
              type: 'public-key',
            },
          ],
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (!asseResp?.id) throw new Error('Biometric failed');

      // 2. Log Event
      // We need to know if it's IN or OUT. For quick action, we can toggle based on current status.
      const currentStatus = await attendanceService.getEmployeeStatus(selectedEmployee.id, activeBranchId);
      const nextType = currentStatus === 'IN' ? 'OUT' : 'IN';

      await attendanceService.logEvent(
        selectedEmployee.id,
        activeBranchId,
        activeOrgId || undefined,
        nextType,
        token!,
        true
      );

      setStep('success');
      setTimeout(reset, 2000);
    } catch (err: any) {
      console.error('[AttendanceQuickAction] Error:', err);
      setStep('error');
      setErrorMessage(err.message === 'INVALID_TERMINAL_TOKEN' 
        ? (isAR ? 'توكن غير صالحة' : 'Invalid Token') 
        : (isAR ? 'فشل التحقق' : 'Auth Failed'));
      setTimeout(reset, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-w-[40px] h-9 transition-all duration-300">
      {step === 'idle' && (
        <Tooltip content={isAR ? 'تسجيل الحضور السريع' : 'Quick Attendance'}>
          <button
            onClick={handleStart}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <span className="material-symbols-rounded text-[22px]">schedule</span>
          </button>
        </Tooltip>
      )}

      {step === 'username' && (
        <form onSubmit={handleUsernameSubmit} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => !username && reset()}
            placeholder={isAR ? 'اسم المستخدم...' : 'Username...'}
            className="w-32 h-8 px-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </form>
      )}

      {step === 'biometric' && (
        <button
          onClick={handleBiometric}
          disabled={isLoading}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary-500 text-white shadow-lg shadow-primary-500/30 animate-pulse active:scale-95 transition-all"
        >
          <span className="material-symbols-rounded text-[22px]">
            {isLoading ? 'progress_activity' : 'fingerprint'}
          </span>
        </button>
      )}

      {step === 'success' && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500 text-white animate-in zoom-in">
          <span className="material-symbols-rounded text-[22px]">check</span>
        </div>
      )}

      {step === 'error' && (
        <Tooltip content={errorMessage}>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 text-[10px] font-bold animate-in fade-in">
            <span className="material-symbols-rounded text-sm">error</span>
            <span className="max-w-[80px] truncate">{errorMessage}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
};
