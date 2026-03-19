import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from './Modal';

// --- CONFIGURATION CONSTANTS ---
const INACTIVITY_TIMEOUT = 12 * 60 * 1000; // 12 Minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 1000; // 30 Seconds

// Storage Keys
const ATTEMPTS_KEY = 'secure_gate_attempts';
const LOCKOUT_KEY = 'secure_gate_lockout_until';

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
  const [isUnlocked, setIsUnlocked] = useState(() => 
    sessionStorage.getItem(storageKey) === 'true'
  );
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Security State with Persistence Initialization
  const [attempts, setAttempts] = useState(() => {
    const saved = sessionStorage.getItem(ATTEMPTS_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = sessionStorage.getItem(LOCKOUT_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = sessionStorage.getItem(LOCKOUT_KEY);
    if (!saved) return 0;
    const remaining = Math.ceil((parseInt(saved, 10) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });
  
  // Persist Security State
  useEffect(() => {
    sessionStorage.setItem(ATTEMPTS_KEY, attempts.toString());
  }, [attempts]);

  useEffect(() => {
    if (lockoutUntil) {
      sessionStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
    } else {
      sessionStorage.removeItem(LOCKOUT_KEY);
    }
  }, [lockoutUntil]);

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
        setPasswordInput('');
      }, INACTIVITY_TIMEOUT);
    }
  }, [isUnlocked, storageKey, standalone]);

  // Handle lockout timer
  useEffect(() => {
    if (!lockoutUntil) return;

    const timer = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setAttempts(0);
        setTimeLeft(0);
        sessionStorage.removeItem(ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_KEY);
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutUntil]);

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
    
    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) return;

    const correctPass = import.meta.env.VITE_BRANCH_SETTINGS_PASS;
    if (passwordInput === correctPass) {
      setIsUnlocked(true);
      sessionStorage.setItem(storageKey, 'true');
      sessionStorage.removeItem(ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCKOUT_KEY);
      setPasswordError(false);
      setAttempts(0);
      resetInactivityTimer();
      if (onUnlock) onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPasswordError(true);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const expiry = Date.now() + LOCKOUT_DURATION;
        setLockoutUntil(expiry);
        setTimeLeft(LOCKOUT_DURATION / 1000);
      }
    }
  };

  const handleCloseInternal = () => {
    if (standalone) {
      if (onClose) onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const isLockedOut = (lockoutUntil && timeLeft > 0) || (timeLeft > 0);

  const renderForm = () => (
    <form onSubmit={handleUnlockInternal} className="w-full space-y-4">
      <div className="relative group">
        <input
          type="password"
          value={passwordInput}
          disabled={isLockedOut}
          onChange={(e) => {
            setPasswordInput(e.target.value);
            setPasswordError(false);
          }}
          placeholder={language === 'AR' ? '••••••••' : 'Password'}
          autoFocus
          className={`w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border-2 transition-all outline-none text-center font-mono tracking-widest ${
            isLockedOut 
              ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
              : passwordError 
                ? 'border-red-500 ring-red-500/20 bg-red-50/10' 
                : 'border-zinc-100 dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-800'
          }`}
        />
        
        {isLockedOut ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <span className="material-symbols-rounded text-sm">timer</span>
            {language === 'AR' 
              ? `تم القفل.. حاول بعد ${timeLeft} ثانية` 
              : `Locked out.. retry in ${timeLeft}s`}
          </div>
        ) : passwordError && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-red-500 text-[10px] font-bold uppercase tracking-wider">
            <span className="material-symbols-rounded text-sm">error</span>
            {language === 'AR' ? 'كلمة المرور غير صحيحة' : 'Incorrect password'}
            <span className="ml-1 opacity-60">({attempts}/{MAX_ATTEMPTS})</span>
          </div>
        )}
      </div>
      
      <button
        type="submit"
        disabled={isLockedOut || !passwordInput}
        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 group shadow-lg ${
          isLockedOut || !passwordInput
            ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed shadow-none'
            : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 cursor-pointer shadow-zinc-900/20 dark:shadow-zinc-100/10'
        }`}
      >
        {language === 'AR' ? 'دخول المنطقة' : 'Unlock Area'}
        <span className="material-symbols-rounded text-base group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 opacity-60">
          arrow_forward
        </span>
      </button>
    </form>
  );

  // Standalone Render
  if (standalone) {
    return (
      <Modal
        isOpen={actualIsModalOpen}
        onClose={handleCloseInternal}
        title={language === 'AR' ? 'تحقق من الهوية' : 'Identity Verification'}
        className="max-w-sm"
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className={`mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
            isLockedOut ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
          }`}>
            <span className={`material-symbols-rounded transition-colors ${
              isLockedOut ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'
            }`} style={{ fontSize: '32px' }}>
              {isLockedOut ? 'timer' : 'security'}
            </span>
          </div>

          <div className="mb-6">
            <h2 className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}>
              {isLockedOut 
                ? (language === 'AR' ? 'تم قفل المحاولات' : 'Too Many Attempts')
                : (language === 'AR' ? 'كلمة المرور مطلوبة' : 'Password Required')}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70">
              {isLockedOut
                ? (language === 'AR' ? 'لقد تجاوزت الحد الأقصى للمحاولات.' : 'You have exceeded the maximum attempts.')
                : (language === 'AR' ? 'يرجى إدخال كلمة مرور الفروع للمتابعة' : 'Please enter the branch settings password to continue')}
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] w-full animate-fade-in">
        {!actualIsModalOpen && (
          <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-rounded text-zinc-400 dark:text-zinc-600" style={{ fontSize: '40px' }}>lock</span>
            </div>
            <h3 className="text-zinc-900 dark:text-zinc-100 font-black text-xl mb-2 tracking-tight">
              {language === 'AR' ? 'منطقة محمية' : 'Protected Area'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 max-w-[280px] text-center leading-relaxed opacity-60">
              {language === 'AR' 
                ? 'هذه المنطقة تتطلب كلمة مرور للوصول إليها' 
                : 'This area requires a password to access its contents'}
            </p>
            <button
              onClick={() => setInternalIsOpen(true)}
              className="px-8 py-3 rounded-2xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-zinc-100/5 cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">lock_open</span>
              {language === 'AR' ? 'فتح المنطقة' : 'Unlock Now'}
            </button>
          </div>
        )}

        <Modal
          isOpen={actualIsModalOpen}
          onClose={handleCloseInternal}
          title={language === 'AR' ? 'تحقق من الهوية' : 'Identity Verification'}
          className="max-w-sm"
        >
          <div className="flex flex-col items-center text-center p-4">
            <div className={`mb-6 w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
              isLockedOut ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
            }`}>
              <span className={`material-symbols-rounded transition-colors ${
                isLockedOut ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'
              }`} style={{ fontSize: '32px' }}>
                {isLockedOut ? 'timer' : 'security'}
              </span>
            </div>

            <div className="mb-6">
              <h2 className={`text-xl font-black mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}>
                {isLockedOut 
                  ? (language === 'AR' ? 'تم قفل المحاولات' : 'Too Many Attempts')
                  : (language === 'AR' ? 'كلمة المرور مطلوبة' : 'Password Required')}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed px-4 opacity-70">
                {isLockedOut
                  ? (language === 'AR' ? 'لقد تجاوزت الحد الأقصى للمحاولات.' : 'You have exceeded the maximum attempts.')
                  : (language === 'AR' ? 'يرجى إدخال كلمة مرور الفروع للمتابعة' : 'Please enter the branch settings password to continue')}
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
