import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';
import { startAuthentication } from '@simplewebauthn/browser';
import { isWebAuthnSupported } from '../../utils/webAuthnUtils';
import { hashPassword } from '../../services/auth/hashUtils';
import { supabase } from '../../lib/supabase';
import { SmartInput } from './SmartInputs';

// --- CONFIGURATION CONSTANTS ---
const INACTIVITY_TIMEOUT = 12 * 60 * 1000; // 12 Minutes

interface SecureGateProps {
  children?: React.ReactNode;
  language: 'EN' | 'AR';
  storageKey?: string;
  // New props for standalone mode
  isOpen?: boolean;
  onUnlock?: () => void;
  onClose?: () => void;
  standalone?: boolean;
}

export const SecureGate: React.FC<SecureGateProps> = ({
  children,
  language,
  storageKey = 'area_unlocked',
  isOpen: externalIsOpen,
  onUnlock,
  onClose,
  standalone = false,
}) => {
  const t = TRANSLATIONS[language];
  const { currentEmployee } = useData();

  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(storageKey) === 'true');
  const [internalIsOpen, setInternalIsOpen] = useState(true);

  // Determine authorization based on role
  const userRole = currentEmployee?.role;
  const isAuthorized =
    userRole === 'admin' ||
    userRole === 'pharmacist_owner' ||
    userRole === 'pharmacist_manager' ||
    userRole === 'manager' ||
    permissionsService.isOrgAdmin() ||
    permissionsService.isManager();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameInput, setUsernameInput] = useState(() => currentEmployee?.username || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Reset form states on key change
  useEffect(() => {
    setShowPasswordForm(false);
    setUsernameInput(currentEmployee?.username || '');
    setPasswordInput('');
    setErrorMessage('');
  }, [storageKey, currentEmployee]);

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usernameInput.trim()) {
      setErrorMessage(t.secureGate.usernameRequiredError);
      return;
    }

    if (!passwordInput) {
      setErrorMessage(t.secureGate.passwordRequiredError);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Hash the password client-side, then verify server-side via RPC
      // The stored hash NEVER leaves the database
      const passwordHash = await hashPassword(passwordInput);

      const { data, error } = await supabase.rpc('verify_employee_credentials', {
        p_payload: {
          username: usernameInput.trim(),
          passwordHash,
        },
      });

      if (error) {
        console.error('[SecureGate] RPC error:', error);
        setErrorMessage(t.secureGate.verificationFailedError);
        return;
      }

      if (!data?.success) {
        // Map server error codes to user-facing messages
        const errorMap: Record<string, string> = {
          username_required: t.secureGate.usernameRequiredError,
          password_required: t.secureGate.passwordRequiredError,
          user_not_found: t.secureGate.usernameNotFoundError,
          no_password_set: t.secureGate.verificationFailedError,
          invalid_credentials: t.secureGate.incorrectPassword,
        };
        setErrorMessage(errorMap[data?.error] || t.secureGate.verificationFailedError);
        return;
      }

      // Server confirmed credentials — check authorization
      if (!data.isAuthorized) {
        setErrorMessage(t.secureGate.unauthorizedErrorMessage);
        return;
      }

      setIsUnlocked(true);
      sessionStorage.setItem(storageKey, 'true');
      resetInactivityTimer();
      setPasswordInput('');
      if (onUnlock) onUnlock();
    } catch (err: any) {
      console.error('[SecureGate] Password unlock error:', err);
      setErrorMessage(t.secureGate.verificationFailedError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!currentEmployee || !isAuthorized) return;
    if (!currentEmployee.biometricCredentialId) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn not supported');
      }

      const asseResp = await startAuthentication({
        optionsJSON: {
          challenge: btoa(Date.now().toString()),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              id: currentEmployee.biometricCredentialId,
              type: 'public-key',
            },
          ],
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (!asseResp?.id) {
        throw new Error('Biometric authentication failed');
      }

      setIsUnlocked(true);
      sessionStorage.setItem(storageKey, 'true');
      resetInactivityTimer();
      if (onUnlock) onUnlock();
    } catch (err: any) {
      console.error('[SecureGate] Biometric unlock error:', err);
      setErrorMessage(t.secureGate.biometricFailedError);
    } finally {
      setIsLoading(false);
    }
  };

  // Decide which state to use
  const actualIsModalOpen = standalone ? !!externalIsOpen : internalIsOpen;

  useEffect(() => {
    if (actualIsModalOpen) {
      setShowPasswordForm(false);
      setUsernameInput('');
      setPasswordInput('');
      setErrorMessage('');
    }
  }, [actualIsModalOpen]);

  // Inactivity Timeout (only if not standalone or if unlocked)
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (isUnlocked) {
      inactivityTimeoutRef.current = setTimeout(() => {
        setIsUnlocked(false);
        if (!standalone) setInternalIsOpen(true);
        sessionStorage.removeItem(storageKey);
      }, INACTIVITY_TIMEOUT);
    }
  }, [isUnlocked, storageKey, standalone]);

  useEffect(() => {
    if (isUnlocked) {
      resetInactivityTimer();
    }

    const handleGlobalActivity = () => resetInactivityTimer();
    window.addEventListener('mousedown', handleGlobalActivity);
    window.addEventListener('keydown', handleGlobalActivity);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      window.removeEventListener('mousedown', handleGlobalActivity);
      window.removeEventListener('keydown', handleGlobalActivity);
    };
  }, [isUnlocked, resetInactivityTimer]);

  // Lock the gate when navigating away from this component (on unmount)
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(storageKey);
    };
  }, [storageKey]);

  // NOTE: handleUnlockInternal was removed as it bypassed password/biometric verification.
  // All unlock paths now go through handlePasswordUnlock or handleBiometricUnlock.

  const handleCloseInternal = () => {
    if (standalone) {
      if (onClose) onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const renderForm = () => {
    const isHasBiometric = !!currentEmployee?.biometricCredentialId;
    const isDisplayingPasswordForm = !isHasBiometric || showPasswordForm;

    const handleSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (isDisplayingPasswordForm) {
        handlePasswordUnlock(e || new Event('submit') as any);
      } else {
        handleBiometricUnlock();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    return (
      <div className='w-full space-y-3'>
        {isAuthorized && (
          <div className='text-center py-1'>
            <div className='flex flex-col items-center gap-1.5'>
              {isDisplayingPasswordForm ? (
                <span className='material-symbols-rounded text-primary-500 text-2xl'>
                  vpn_key
                </span>
              ) : (
                <span className='material-symbols-rounded text-primary-500 text-3xl animate-pulse'>
                  fingerprint
                </span>
              )}
              <span className='text-zinc-900 dark:text-zinc-100 font-bold text-xs tracking-wide'>
                {isDisplayingPasswordForm ? t.secureGate.passwordRequired : t.secureGate.biometricRequired}
              </span>
              <span className='text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 font-medium'>
                {currentEmployee
                  ? `${currentEmployee.name} (${t.employeeList?.roles[userRole as keyof typeof t.employeeList.roles] || userRole})`
                  : ''}
              </span>
            </div>
          </div>
        )}

        {isAuthorized ? (
          isDisplayingPasswordForm ? (
            <div className='space-y-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-200'>
              <SmartInput
                type='text'
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder={t.secureGate.usernamePlaceholder}
                className='text-center'
                disabled={isLoading}
                onKeyDown={handleKeyDown}
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='off'
                spellCheck={false}
              />
              <SmartInput
                type='text'
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={t.secureGate.passwordPlaceholder}
                className='text-center'
                disabled={isLoading}
                onKeyDown={handleKeyDown}
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='off'
                spellCheck={false}
              />
              <button
                type='button'
                onClick={() => handleSubmit()}
                disabled={isLoading}
                className='w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 group bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 cursor-pointer'
              >
                <span className='material-symbols-rounded text-base'>
                  {isLoading ? 'progress_activity' : 'lock_open'}
                </span>
                {isLoading ? t.secureGate.verifying : t.secureGate.confirmUnlockBtn}
              </button>
              {errorMessage && (
                <p className='text-xs text-rose-500 font-bold flex items-center justify-center gap-1 animate-in fade-in'>
                  <span className='material-symbols-rounded text-sm'>error</span>
                  {errorMessage}
                </p>
              )}
              {isHasBiometric && (
                <button
                  type='button'
                  onClick={() => {
                    setShowPasswordForm(false);
                    setErrorMessage('');
                    setPasswordInput('');
                  }}
                  className='w-full py-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1'
                >
                  <span className='material-symbols-rounded text-base animate-pulse'>fingerprint</span>
                  {t.secureGate.useBiometrics}
                </button>
              )}
            </div>
          ) : (
            <div className='space-y-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-200'>
              <button
                type='button'
                onClick={handleBiometricUnlock}
                disabled={isLoading}
                className='w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 group bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 cursor-pointer'
              >
                <span className='material-symbols-rounded text-base'>
                  {isLoading ? 'progress_activity' : 'fingerprint'}
                </span>
                {isLoading ? t.secureGate.verifying : t.secureGate.scanBiometric}
              </button>
              {errorMessage && (
                <p className='text-xs text-rose-500 font-bold flex items-center justify-center gap-1 animate-in fade-in'>
                  <span className='material-symbols-rounded text-sm'>error</span>
                  {errorMessage}
                </p>
              )}
              <button
                type='button'
                onClick={() => {
                  setShowPasswordForm(true);
                  setErrorMessage('');
                }}
                className='w-full py-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1'
              >
                <span className='material-symbols-rounded text-base'>vpn_key</span>
                {t.secureGate.usePassword}
              </button>
            </div>
          )
        ) : (
          <button
            type='button'
            onClick={handleCloseInternal}
            className='w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 group bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 cursor-pointer'
          >
            {t.common.close}
          </button>
        )}
      </div>
    );
  };

  // Standalone Render
  if (standalone) {
    return (
      <Modal
        isOpen={actualIsModalOpen}
        onClose={handleCloseInternal}
        title={t.secureGate.identityVerification}
        className='max-w-sm'
      >
        <div className='flex flex-col items-center text-center p-3'>
          {!isAuthorized && (
            <>
              <div
                className="mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
              >
                <span
                  className="material-symbols-rounded text-red-500"
                  style={{ fontSize: '32px' }}
                >
                  gpp_bad
                </span>
              </div>

              <div className='mb-6'>
                <h2
                  className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}
                >
                  {t.secureGate.unauthorizedTitle}
                </h2>
                <p className='text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70'>
                  {t.secureGate.unauthorizedDesc}
                </p>
              </div>
            </>
          )}

          {renderForm()}
        </div>
      </Modal>
    );
  }

  // Wrapper Render
  if (!isUnlocked) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center min-h-[500px] w-full animate-fade-in'>
        {!actualIsModalOpen && (
          <div className='flex flex-col items-center justify-center animate-in zoom-in duration-300'>
            <div className='w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6 shadow-sm'>
              <span
                className='material-symbols-rounded text-zinc-400 dark:text-zinc-600'
                style={{ fontSize: '40px' }}
              >
                lock
              </span>
            </div>
            <h3 className='text-zinc-900 dark:text-zinc-100 font-black text-xl mb-2 tracking-tight'>
              {t.secureGate.protectedArea}
            </h3>
            <p className='text-zinc-500 dark:text-zinc-400 text-sm mb-8 max-w-[280px] text-center leading-relaxed opacity-60'>
              {t.secureGate.requiresPassword}
            </p>
            <button
              type='button'
              onClick={() => setInternalIsOpen(true)}
              className='px-8 py-3 rounded-2xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-zinc-100/5 cursor-pointer flex items-center gap-2'
            >
              <span className='material-symbols-rounded text-lg'>lock_open</span>
              {t.secureGate.unlockNow}
            </button>
          </div>
        )}

        <Modal
          isOpen={actualIsModalOpen}
          onClose={handleCloseInternal}
          title={t.secureGate.identityVerification}
          className='max-w-sm'
        >
          <div className='flex flex-col items-center text-center p-3'>
            {!isAuthorized && (
              <>
                <div
                  className="mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                >
                  <span
                    className="material-symbols-rounded text-red-500"
                    style={{ fontSize: '32px' }}
                  >
                    gpp_bad
                  </span>
                </div>

                <div className='mb-6'>
                  <h2
                    className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}
                  >
                    {t.secureGate.unauthorizedTitle}
                  </h2>
                  <p className='text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70'>
                    {t.secureGate.unauthorizedDesc}
                  </p>
                </div>
              </>
            )}

            {renderForm()}
          </div>
        </Modal>
      </div>
    );
  }

  return <>{children}</>;
};
