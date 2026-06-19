import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';

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

  // Decide which state to use
  const actualIsModalOpen = standalone ? !!externalIsOpen : internalIsOpen;

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

  const handleUnlockInternal = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isAuthorized) return;

    setIsUnlocked(true);
    sessionStorage.setItem(storageKey, 'true');
    resetInactivityTimer();
    if (onUnlock) onUnlock();
  };

  const handleCloseInternal = () => {
    if (standalone) {
      if (onClose) onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleUnlockInternal} className='w-full space-y-4'>
      <div className='relative p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border-2 border-zinc-100 dark:border-zinc-800 text-center transition-all'>
        {isAuthorized ? (
          <div className='flex flex-col items-center gap-2'>
            <span className='material-symbols-rounded text-green-500 text-3xl'>check_circle</span>
            <span className='text-zinc-900 dark:text-zinc-100 font-black text-sm tracking-wide'>
              {t.secureGate.authorizedTitle}
            </span>
            <span className='text-zinc-500 dark:text-zinc-400 text-xs mt-1 font-medium'>
              {currentEmployee ? `${currentEmployee.name} (${t.employeeList?.roles[userRole as keyof typeof t.employeeList.roles] || userRole})` : ''}
            </span>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-2'>
            <span className='material-symbols-rounded text-red-500 text-3xl'>cancel</span>
            <span className='text-zinc-900 dark:text-zinc-100 font-black text-sm tracking-wide'>
              {t.secureGate.unauthorizedTitle}
            </span>
            <span className='text-zinc-500 dark:text-zinc-400 text-xs px-2 mt-1 leading-relaxed font-medium'>
              {t.secureGate.unauthorizedDesc}
            </span>
          </div>
        )}
      </div>

      {isAuthorized ? (
        <button
          type='submit'
          className='w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 group shadow-lg bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 cursor-pointer shadow-zinc-900/20 dark:shadow-zinc-100/10'
        >
          {t.secureGate.confirmUnlock}
          <span className='material-symbols-rounded text-base group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 opacity-60'>
            arrow_forward
          </span>
        </button>
      ) : (
        <button
          type='button'
          onClick={handleCloseInternal}
          className='w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 group bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 cursor-pointer'
        >
          {t.common.close}
        </button>
      )}
    </form>
  );

  // Standalone Render
  if (standalone) {
    return (
      <Modal
        isOpen={actualIsModalOpen}
        onClose={handleCloseInternal}
        title={t.secureGate.identityVerification}
        className='max-w-sm'
      >
        <div className='flex flex-col items-center text-center p-4'>
          <div
            className={`mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
              isAuthorized
                ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
                : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
            }`}
          >
            <span
              className={`material-symbols-rounded transition-colors ${
                isAuthorized ? 'text-zinc-400 dark:text-zinc-500' : 'text-red-500'
              }`}
              style={{ fontSize: '32px' }}
            >
              {isAuthorized ? 'security' : 'gpp_bad'}
            </span>
          </div>

          <div className='mb-6'>
            <h2
              className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}
            >
              {isAuthorized ? t.secureGate.authorizedTitle : t.secureGate.unauthorizedTitle}
            </h2>
            <p className='text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70'>
              {isAuthorized ? t.secureGate.authorizedDesc : t.secureGate.unauthorizedDesc}
            </p>
          </div>

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
          <div className='flex flex-col items-center text-center p-4'>
            <div
              className={`mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
                isAuthorized
                  ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
              }`}
            >
              <span
                className={`material-symbols-rounded transition-colors ${
                  isAuthorized ? 'text-zinc-400 dark:text-zinc-500' : 'text-red-500'
                }`}
                style={{ fontSize: '32px' }}
              >
                {isAuthorized ? 'security' : 'gpp_bad'}
              </span>
            </div>

            <div className='mb-6'>
              <h2
                className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}
              >
                {isAuthorized ? t.secureGate.authorizedTitle : t.secureGate.unauthorizedTitle}
              </h2>
              <p className='text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70'>
                {isAuthorized ? t.secureGate.authorizedDesc : t.secureGate.unauthorizedDesc}
              </p>
            </div>

            {renderForm()}
          </div>
        </Modal>
      </div>
    );
  }

  return <>{children}</>;
};
