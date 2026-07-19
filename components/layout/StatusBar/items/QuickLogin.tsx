import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAlert } from '../../../../context';
import { employeeRepository } from '../../../../services/hr/repositories/employeeRepository';
import type { Employee } from '../../../../types';
import { useContextMenu } from '../../../common/ContextMenu';
import { usePosSounds } from '../../../common/hooks/usePosSounds';
import { useSmartDirection } from '../../../common/SmartInputs';
import { StatusBarItem } from '../StatusBarItem';

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
  t?: any;
}

type Step = 'idle' | 'username' | 'password' | 'new-password';

// --- Sub-components for flattening and modularity ---

const PasskeyButton: React.FC<{
  onClick: () => void;
  title: string;
}> = ({ onClick, title }) => (
  <button
    onClick={onClick}
    className='flex items-center justify-center h-full px-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors'
    title={title}
    type='button'
  >
    <span
      className='material-symbols-rounded text-primary-500 leading-none'
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
  language: 'EN' | 'AR';
  dir: 'rtl' | 'ltr';
  inputRef: React.RefObject<HTMLInputElement | null>;
  t?: any;
}> = ({
  step,
  inputVal,
  setInputVal,
  isError,
  setIsError,
  onKeyDown,
  language,
  dir,
  inputRef,
  t,
}) => {
  const isNewPass = step === 'new-password';
  const _isAR = language === 'AR';

  const placeholder = useMemo(() => {
    if (step === 'username') return t?.username || 'Username...';
    if (isNewPass) return t?.newPassword || 'New Password...';
    return t?.password || 'Password...';
  }, [step, t, isNewPass]);

  return (
    <div
      className={`relative flex items-center h-full w-fit overflow-hidden ${isNewPass ? 'px-0 border-none' : 'px-2 gap-2 bg-white/50 dark:bg-gray-900/50 border-x border-gray-300 dark:border-gray-700'}`}
    >
      {isNewPass && (
        <>
          <div
            className='absolute inset-[-100%] animate-spin-slow'
            style={{
              background:
                'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #ef4444, #f59e0b, #10b981, #3b82f6)',
            }}
          />
          <div className='absolute inset-[1.5px] bg-(--bg-menu) rounded-[1px] z-0' />
        </>
      )}

      <div className='relative z-10 flex items-center h-full w-full gap-2'>
        <span
          className={`material-symbols-rounded leading-none ${isError ? 'text-red-500' : ''}`}
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
          autoComplete='off'
        />
        {step === 'username' && isError && (
          <span className='text-[9px] text-red-500 ml-1 font-normal'>
            {t?.notFound || 'Not found'}
          </span>
        )}
      </div>
    </div>
  );
};

export const QuickLogin: React.FC<QuickLoginProps> = ({
  userName,
  roleLabel,
  avatarUrl,
  employees = [],
  currentEmployeeId,
  onSelectEmployee,
  language = 'EN',
  isRecoveringPassword,
  isLoading = false,
  t,
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
  const alert = useAlert();

  const isAR = language === 'AR';
  const dir = useSmartDirection(inputVal, t?.password || 'Password...');

  // --- Smart Memoization ---
  const tooltipText = useMemo(() => {
    if (!currentEmployeeId) return t?.login || 'Login';
    return (
      <div className='flex items-center gap-3 py-0.5 pr-2 pl-0.5' dir={isAR ? 'rtl' : 'ltr'}>
        <div className='w-10 h-10 rounded-full overflow-hidden bg-white/20 dark:bg-black/10 flex-shrink-0 border-2 border-white/30 dark:border-black/10 flex items-center justify-center shadow-inner'>
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className='w-full h-full object-cover' />
          ) : (
            <span className='material-symbols-rounded text-white dark:text-gray-700 text-2xl'>
              person
            </span>
          )}
        </div>
        <div className='flex flex-col gap-0.5 justify-center min-w-20'>
          <span className='text-[13px] font-bold text-white dark:text-gray-900 leading-none'>
            {userName}
          </span>
          {roleLabel && (
            <span className='text-[10px] text-white/70 dark:text-gray-600 font-semibold tracking-wider uppercase'>
              {roleLabel}
            </span>
          )}
        </div>
      </div>
    );
  }, [currentEmployeeId, userName, roleLabel, avatarUrl, t, isAR]);

  const loginLabel = useMemo(() => {
    if (!currentEmployeeId) return t?.login || 'Login';
    return userName;
  }, [currentEmployeeId, userName, t]);

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

      let found = employees.find((emp) => emp.username === query);

      if (!found) {
        try {
          const dbFound = await employeeRepository.getByUsername(query);
          if (dbFound) found = dbFound;
        } catch (err) {
          console.error('Direct username search failed', err);
        }
      }

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
        const fresh = tempEmployee.id
          ? (await employeeRepository.getById(tempEmployee.id)) ?? tempEmployee
          : tempEmployee;
        const { verifyPassword } = await import('../../../../services/auth/hashUtils');
        const isValid = fresh.password
          ? await verifyPassword(inputVal.trim(), fresh.password)
          : false;
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
        alert.success(t?.changeSuccess || 'Password updated successfully');
        setTimeout(() => {
          window.location.replace(`${window.location.origin}/#/`);
        }, 1500);
      } else {
        setIsError(true);
        playError();
        alert.error(res.message || 'Failed to update password');
      }
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { generateChallenge, bufferToBase64, isWebAuthnSupported } = await import(
        '../../../../utils/webAuthnUtils'
      );
      const { authService } = await import('../../../../services/auth/authService');

      if (!(await isWebAuthnSupported())) {
        alert.warning(
          t?.biometricUnsupported || 'Browser does not support Passkeys. Ensure you are on HTTPS.'
        );
        return;
      }

      // Smart optimization: If user already typed their username, target their specific passkey
      // to skip the browser selection list.
      let allowCredentials: any[];
      if (step === 'username' && inputVal.trim()) {
        const found = employees.find((emp) => emp.username === inputVal.trim());
        if (found?.biometricCredentialId) {
          allowCredentials = [
            {
              id: found.biometricCredentialId,
              type: 'public-key' as const,
              transports: ['internal'] as AuthenticatorTransport[],
            },
          ];
        }
      }

      const challengeBase64 = bufferToBase64(generateChallenge());
      const asseResp = await startAuthentication({
        optionsJSON: {
          challenge: challengeBase64,
          rpId: window.location.hostname,
          allowCredentials,
          userVerification: 'required' as UserVerificationRequirement,
          timeout: 60000,
        } as any,
        mediation: 'optional', // Supported by browser, bypassing strict library types
      } as any);

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
    } catch (err: any) {
      // Ignore AbortError (user cancelled)
      if (err.name === 'AbortError') return;

      const { parseWebAuthnError } = await import('../../../../utils/webAuthnUtils');
      setIsError(true);
      playError();
      alert.error(parseWebAuthnError(err, language as any));
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!currentEmployeeId || !onSelectEmployee) return;
    e.preventDefault();
    showMenu(e.clientX, e.clientY, [
      {
        label: t?.signOut || (isAR ? 'تسجيل الخروج' : 'Sign Out'),
        icon: 'logout',
        danger: true,
        action: () => {
          onSelectEmployee(null);
          resetState();
        },
      },
    ]);
  };

  const handleForgotPassword = async () => {
    if (tempEmployee?.email) {
      const { authService } = await import('../../../../services/auth/authService');
      const res = await authService.handleForgotPassword(tempEmployee.email);
      if (res.success) {
        alert.success(t?.resetSent || 'Reset link sent to your email');
      } else {
        alert.error(res.message || 'Failed to send reset link');
      }
    } else {
      alert.info(t?.contactManager || 'Contact manager to reset password');
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
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        step !== 'idle'
      )
        resetState();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [step, resetState]);

  if (!onSelectEmployee) {
    return (
      <StatusBarItem icon='person' tooltip={roleLabel || userName} variant='default'>
        <span
          className='!font-["GraphicSansFont"] tracking-tight pt-px'
          style={{
            fontFeatureSettings:
              '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
          }}
        >
          {roleLabel ? `${userName} (${roleLabel})` : userName}
        </span>
      </StatusBarItem>
    );
  }

  return (
    <div
      className='relative flex items-center h-full'
      ref={containerRef}
      dir={isAR ? 'rtl' : 'ltr'}
    >
      {step === 'idle' ? (
        <div role="button" tabIndex={0} onContextMenu={handleContextMenu} className='h-full flex items-center'>
          <StatusBarItem
            icon='person'
            tooltip={tooltipText}
            onClick={handleStartLogin}
            variant={currentEmployeeId ? 'info' : 'warning'}
            className='cursor-pointer hover:bg-black/5 dark:hover:bg-white/10'
          >
            {currentEmployeeId ? (
              <span
                className='!font-["GraphicSansFont"] tracking-tight pt-px'
                style={{
                  fontFeatureSettings:
                    '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
                }}
              >
                {loginLabel}
              </span>
            ) : (
              <span className='pt-px'>{loginLabel}</span>
            )}
            {isLoading && currentEmployeeId && (
              <span className='inline-flex items-center gap-1'>
                <span className='w-12 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full' />
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
        <>
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
            language={language}
            dir={dir}
            inputRef={inputRef}
            t={t}
          />
          {step === 'password' && isError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleForgotPassword();
              }}
              className='flex items-center justify-center h-full px-2 opacity-85 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'
              title={t?.forgotPassword || 'Forgot Password?'}
              type='button'
            >
              <span
                className='material-symbols-rounded block leading-none'
                style={{ fontSize: 'var(--status-icon-size, 16px)' }}
              >
                help
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default QuickLogin;
