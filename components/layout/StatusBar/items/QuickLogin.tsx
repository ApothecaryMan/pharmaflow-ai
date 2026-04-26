import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import type { Employee } from '../../../../types';
import { useContextMenu } from '../../../common/ContextMenu';
import { usePosSounds } from '../../../common/hooks/usePosSounds';
import { useSmartDirection } from '../../../common/SmartInputs';
import { StatusBarItem } from '../StatusBarItem';
import { motion } from 'framer-motion';

interface QuickLoginProps {
  userName?: string;
  roleLabel?: string;
  avatarUrl?: string;
  employees?: Employee[];
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string | null) => void;
  language?: 'EN' | 'AR';
  isRecoveringPassword?: boolean;
  isLoading?: boolean;
}

type Step = 'idle' | 'username' | 'password' | 'new-password';

// --- Sub-components for flattening and modularity ---

const PasskeyButton: React.FC<{ 
  onClick: () => void; 
  title: string;
}> = ({ onClick, title }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center h-full px-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    title={title}
  >
    <span 
      className="material-symbols-rounded text-primary-500 leading-none" 
      style={{ fontSize: 'calc(var(--status-icon-size, 16px) + 2px)' }}
    >
      fingerprint
    </span>
  </button>
);

const LoginInputView: React.FC<{
  step: Step;
  inputVal: string;
  setInputVal: (val: string) => void;
  isError: boolean;
  setIsError: (val: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onForgotPassword: () => void;
  language: 'EN' | 'AR';
  dir: 'rtl' | 'ltr';
  inputRef: React.RefObject<HTMLInputElement | null>;
}> = ({ step, inputVal, setInputVal, isError, setIsError, onKeyDown, onForgotPassword, language, dir, inputRef }) => {
  const isNewPass = step === 'new-password';
  const isAR = language === 'AR';

  const placeholder = useMemo(() => {
    if (step === 'username') return isAR ? 'اسم المستخدم...' : 'Username...';
    if (isNewPass) return isAR ? 'كلمة المرور الجديدة...' : 'New Password...';
    return isAR ? 'كلمــــة المـرور...' : 'Password...';
  }, [step, isAR, isNewPass]);

  return (
    <div className={`relative flex items-center h-full w-fit overflow-hidden ${isNewPass ? 'px-0 border-none' : 'px-2 gap-2 bg-white/50 dark:bg-gray-900/50 border-x border-gray-300 dark:border-gray-700'}`}>
      {isNewPass && (
        <>
          <motion.div
            className="absolute inset-[-100%]"
            style={{ background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #ef4444, #f59e0b, #10b981, #3b82f6)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-[1.5px] bg-(--bg-menu) rounded-[1px] z-0" />
        </>
      )}

      <div className={`relative z-10 flex items-center h-full w-full ${isNewPass ? 'px-2 gap-2' : ''}`}>
        <span 
          className={`material-symbols-rounded leading-none ${isError ? 'text-red-500' : 'text-primary-500 dark:text-blue-400'}`}
          style={{ fontSize: 'var(--status-icon-size, 16px)' }}
        >
          {step === 'username' ? 'badge' : isNewPass ? 'key' : 'lock'}
        </span>
        <input
          ref={inputRef}
          type={step === 'password' || isNewPass ? 'password' : 'text'}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            if (isError) setIsError(false);
          }}
          dir={dir}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`bg-transparent border-none outline-hidden text-[11px] font-bold text-(--text-primary) placeholder-gray-500 ${isNewPass ? 'w-32' : 'w-24'} focus:ring-0 ${isError ? 'text-red-500 dark:text-red-400' : ''}`}
          autoComplete="off"
        />
        {step === 'username' && isError && (
          <span className="text-[9px] text-red-500 ml-1 font-normal">
            {isAR ? 'غير موجود' : 'Not found'}
          </span>
        )}
        {step === 'password' && (
          <button
            onClick={(e) => { e.stopPropagation(); onForgotPassword(); }}
            className="ml-auto text-gray-400 hover:text-primary-500 cursor-pointer"
            title={isAR ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          >
            <span 
              className="material-symbols-rounded block leading-none" 
              style={{ fontSize: 'var(--status-icon-size, 16px)' }}
            >
              help
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export const QuickLogin: React.FC<QuickLoginProps> = ({
  userName,
  roleLabel,
  employees = [],
  currentEmployeeId,
  onSelectEmployee,
  language = 'EN',
  isRecoveringPassword,
  isLoading = false,
}) => {
  const [step, setStep] = useState<Step>('idle');
  const [inputVal, setInputVal] = useState('');
  const [tempEmployee, setTempEmployee] = useState<Employee | null>(null);
  const [isError, setIsError] = useState(false);
  const [hasRecovered, setHasRecovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = usePosSounds();
  const { showMenu } = useContextMenu();

  const isAR = language === 'AR';
  const dir = useSmartDirection(inputVal, isAR ? 'كلمة المرور...' : 'Password...');

  // --- Smart Memoization ---
  const tooltipText = useMemo(() => {
    if (!currentEmployeeId) return isAR ? 'تسجيل الدخول' : 'Login';
    return `${userName}${roleLabel ? ` (${roleLabel})` : ''}`;
  }, [currentEmployeeId, userName, roleLabel, isAR]);

  const loginLabel = useMemo(() => {
    if (isLoading && currentEmployeeId) return undefined;
    if (currentEmployeeId) return userName;
    return isAR ? 'تسجيــــل الدخـول' : 'Login';
  }, [isLoading, currentEmployeeId, userName, isAR]);

  // --- Logic Handlers ---
  const resetState = useCallback(() => {
    setStep('idle');
    setInputVal('');
    setTempEmployee(null);
    setIsError(false);
  }, []);

  const handleStartLogin = () => {
    if (!onSelectEmployee) return;
    setStep('username');
    setInputVal('');
    setIsError(false);
  };

  const checkAuth = async () => {
    if (step === 'username') {
      const query = inputVal.trim();
      if (!query) return;
      const found = employees.find(emp => emp.username === query);
      if (found) {
        setTempEmployee(found);
        setStep('password');
        setInputVal('');
        setIsError(false);
      } else {
        setIsError(true);
        playError();
      }
    } else if (step === 'password') {
      if (tempEmployee && onSelectEmployee) {
        const { verifyPassword } = await import('../../../../services/auth/hashUtils');
        const isValid = tempEmployee.password ? await verifyPassword(inputVal.trim(), tempEmployee.password) : false;
        if (isValid) {
          playSuccess();
          onSelectEmployee(tempEmployee.id);
          resetState();
        } else {
          setIsError(true);
          playError();
        }
      }
    } else if (step === 'new-password') {
      const newPass = inputVal.trim();
      if (!newPass) return;
      const { authService } = await import('../../../../services/auth/authService');
      const res = await authService.updatePassword(newPass);
      if (res.success) {
        playSuccess();
        setHasRecovered(true);
        alert(isAR ? 'تم تغيير كلمة المرور بنجاح' : 'Password updated successfully');
        window.location.replace(window.location.origin + '/#/');
      } else {
        setIsError(true);
        playError();
        alert(res.message);
      }
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { generateChallenge, bufferToBase64, isWebAuthnSupported } = await import('../../../../utils/webAuthnUtils');
      const { authService } = await import('../../../../services/auth/authService');

      if (!(await isWebAuthnSupported())) {
        alert(isAR ? 'هذا المتصفح لا يدعم مفاتيح المرور (Passkeys). تأكد من استخدام HTTPS.' : 'Browser does not support Passkeys. Ensure you are on HTTPS.');
        return;
      }

      const challengeBase64 = bufferToBase64(generateChallenge());
      const asseResp = await startAuthentication({
        optionsJSON: {
          challenge: challengeBase64,
          rpId: window.location.hostname,
          userVerification: 'required' as UserVerificationRequirement,
          timeout: 60000,
        } as any,
      });

      if (asseResp && onSelectEmployee) {
        const result = await authService.loginWithBiometric(asseResp.id, employees);
        if (result) {
          playSuccess();
          onSelectEmployee(result.id);
          resetState();
        } else {
          setIsError(true);
          playError();
        }
      }
    } catch (err) {
      const { parseWebAuthnError } = await import('../../../../utils/webAuthnUtils');
      setIsError(true);
      playError();
      alert(parseWebAuthnError(err, language as any));
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!currentEmployeeId || !onSelectEmployee) return;
    e.preventDefault();
    showMenu(e.clientX, e.clientY, [
      {
        label: isAR ? 'تسجيل الخروج' : 'Sign Out',
        icon: 'logout',
        danger: true,
        action: () => { onSelectEmployee(null); resetState(); },
      },
    ]);
  };

  const handleForgotPassword = async () => {
    if (tempEmployee?.email) {
      const { authService } = await import('../../../../services/auth/authService');
      const res = await authService.handleForgotPassword(tempEmployee.email);
      if (res.success) {
        alert(isAR ? 'تم إرسال رابط إعادة التعيين لبريدك' : 'Reset link sent to your email');
      } else {
        alert(res.message);
      }
    } else {
      alert(isAR ? 'تواصل مع المدير لإعادة تعيين كلمة المرور' : 'Contact manager to reset password');
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (isRecoveringPassword && step === 'idle' && !hasRecovered) {
      setStep('new-password');
      setInputVal('');
    }
  }, [isRecoveringPassword, step, hasRecovered]);

  useEffect(() => {
    if (step !== 'idle' && inputRef.current) inputRef.current.focus();
  }, [step]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && step !== 'idle') resetState();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [step, resetState]);

  if (!onSelectEmployee) {
    return (
      <StatusBarItem
        icon="person"
        label={roleLabel ? `${userName} (${roleLabel})` : userName}
        tooltip={roleLabel || userName}
        variant="default"
      />
    );
  }

  return (
    <div className="relative flex items-center h-full" ref={containerRef} dir={isAR ? 'rtl' : 'ltr'}>
      {step === 'idle' ? (
        <div onContextMenu={handleContextMenu} className="h-full flex items-center">
          <StatusBarItem
            icon="person"
            label={loginLabel}
            tooltip={tooltipText}
            onClick={handleStartLogin}
            variant={currentEmployeeId ? 'info' : 'warning'}
            className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
          >
            {isLoading && currentEmployeeId && (
              <span className="inline-flex items-center gap-1">
                <span className="w-12 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
              </span>
            )}
          </StatusBarItem>
          {!currentEmployeeId && (
            <PasskeyButton 
              onClick={handlePasskeyLogin} 
              title={isAR ? 'تسجيل الدخول بمفتاح المرور' : 'Login with Passkey'} 
            />
          )}
        </div>
      ) : (
        <LoginInputView
          step={step}
          inputVal={inputVal}
          setInputVal={setInputVal}
          isError={isError}
          setIsError={setIsError}
          onKeyDown={(e) => {
            if (e.key === 'Enter') checkAuth();
            else if (e.key === 'Escape') resetState();
          }}
          onForgotPassword={handleForgotPassword}
          language={language}
          dir={dir}
          inputRef={inputRef}
        />
      )}
    </div>
  );
};

export default QuickLogin;
