import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService, type UserSession } from '../../services/auth/authService';

interface LoginState {
  username: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  user: UserSession | null;
  showPassword: boolean;
  validationErrors: {
    username?: string;
    password?: string;
  };
  progress: number;
  loadingMessage: string;
}

interface LoginProps {
  onViewChange?: (view: string) => void;
  onLoginSuccess?: () => void;
  language?: 'EN' | 'AR';
}

export const Login: React.FC<LoginProps> = ({ onViewChange, onLoginSuccess, language = 'EN' }) => {
  const t = TRANSLATIONS[language].login;

  const [state, setState] = useState<LoginState>({
    username: '',
    password: '',
    rememberMe: false,
    isLoading: false,
    error: null,
    success: false,
    user: null,
    showPassword: false,
    validationErrors: {},
    progress: 0,
    loadingMessage: language === 'AR' ? 'جاري التحقق من البيانات...' : 'Validing credentials...',
  });

  const loadingMessages = useMemo(
    () => [
      language === 'AR' ? 'جاري التحقق من البيانات...' : 'Validing credentials...',
      language === 'AR' ? 'جاري تحميل الملف الشخصي...' : 'Loading profile...',
      language === 'AR' ? 'جاري تهيئة لوحة التحكم...' : 'Preparing dashboard...',
      language === 'AR' ? 'جاري التحويل...' : 'Redirecting...',
    ],
    [language]
  );

  useEffect(() => {
    if (state.success) {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 100) currentProgress = 100;

        const messageIndex = Math.min(
          Math.floor((currentProgress / 100) * loadingMessages.length),
          loadingMessages.length - 1
        );

        setState((prev) => ({
          ...prev,
          progress: currentProgress,
          loadingMessage: loadingMessages[messageIndex],
        }));

        if (currentProgress === 100) clearInterval(interval);
      }, 200);

      return () => clearInterval(interval);
    }
  }, [state.success, loadingMessages]);

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    let isValid = true;

    if (!state.username.trim()) {
      errors.username = t.validationUsernameRequired;
      isValid = false;
    }

    if (!state.password) {
      errors.password = t.validationPasswordRequired;
      isValid = false;
    } else if (state.password.length < 4) {
      errors.password = t.validationPasswordLength;
      isValid = false;
    }

    setState((prev) => ({ ...prev, validationErrors: errors }));
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null, success: false, user: null }));

    try {
      const user = await authService.login(state.username, state.password);

      if (user) {
        setState((prev) => ({ ...prev, isLoading: false, error: null, success: true, user: user }));
        // Redirect to dashboard after short delay
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          } else if (onViewChange) {
            onViewChange('dashboard');
          }
        }, 1500);
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: t.errorInvalidCredentials,
          success: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t.errorGeneric;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        success: false,
      }));
    }
  };

  const toggleShowPassword = () =>
    setState((prev) => ({ ...prev, showPassword: !prev.showPassword }));
  const toggleRememberMe = () => setState((prev) => ({ ...prev, rememberMe: !prev.rememberMe }));

  return (
    <div
      className='min-h-screen w-full flex items-center justify-center text-white p-4 sm:p-6'
      style={{ backgroundColor: '#000000' }}
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      <div className='w-full max-w-[400px] space-y-8'>
        {/* Header Section */}
        <div className='text-center mb-10'>
          <div className='flex flex-col items-center mb-8'>
            {/* Icon Logo - No container as requested */}
            <img
              src='/logo_icon_white.svg'
              className='w-14 h-14 object-contain mb-4'
              alt='Logo Icon'
            />

            {/* Word Mark Logo (Image instead of text) */}
            <img src='/logo_word_white.svg' className='h-7 object-contain opacity-90' alt='Zinc' />
          </div>

          {!state.success && <p className='text-zinc-400 text-sm'>{t.subtitle}</p>}
        </div>

        {/* Success State */}
        {state.success ? (
          <div className='w-full py-20 flex flex-col items-center animate-in fade-in duration-700'>
            <h3 className='text-xl font-bold text-white mb-3 tracking-wide'>
              {language === 'AR' ? 'تم تسجيل الدخول بنجاح!' : 'Login Successful!'}
            </h3>
            <p className='text-white/50 text-sm font-medium mb-10 min-h-[20px]'>
              {state.loadingMessage}
            </p>

            <div className='w-full max-w-[200px] bg-white/5 rounded-full h-1 overflow-hidden ring-1 ring-white/10'>
              <div
                className='h-full bg-white transition-all duration-300 ease-out shadow-[0_0_20px_rgba(255,255,255,0.6)]'
                style={{ width: `${state.progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Error Alert */}
            {state.error && (
              <div
                role='alert'
                aria-live='polite'
                className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm animate-in slide-in-from-top-2 duration-300'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='shrink-0'
                >
                  <circle cx='12' cy='12' r='10' />
                  <line x1='12' x2='12' y1='8' y2='12' />
                  <line x1='12' x2='12.01' y1='16' y2='16' />
                </svg>
                <span>{state.error}</span>
              </div>
            )}

            <fieldset disabled={state.isLoading} className='space-y-4'>
              {/* Username Input */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='username'>
                  {t.username}
                </label>
                <input
                  id='username'
                  type='text'
                  placeholder={t.usernamePlaceholder}
                  autoComplete='username'
                  value={state.username}
                  onChange={(e) => {
                    setState((prev) => ({
                      ...prev,
                      username: e.target.value,
                      validationErrors: { ...prev.validationErrors, username: undefined },
                    }));
                  }}
                  className={`w-full bg-zinc-900 border ${state.validationErrors.username ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200 focus:ring-1 focus:ring-green-500/20`}
                />
                {state.validationErrors.username && (
                  <p className='text-xs text-red-500 mt-1 pl-1'>
                    {state.validationErrors.username}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='text-sm font-medium text-zinc-300' htmlFor='password'>
                    {t.password}
                  </label>
                </div>

                <div className='relative'>
                  <input
                    id='password'
                    type={state.showPassword ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    autoComplete='current-password'
                    value={state.password}
                    onChange={(e) => {
                      setState((prev) => ({
                        ...prev,
                        password: e.target.value,
                        validationErrors: { ...prev.validationErrors, password: undefined },
                      }));
                    }}
                    className={`w-full bg-zinc-900 border ${state.validationErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200 focus:ring-1 focus:ring-green-500/20 ${language === 'AR' ? 'pl-10' : 'pr-10'}`}
                  />
                  <button
                    type='button'
                    onClick={toggleShowPassword}
                    aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                    className={`absolute ${language === 'AR' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none focus:text-green-500`}
                  >
                    {state.showPassword ? (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
                        <path d='M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
                        <path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.08' />
                        <line x1='2' x2='22' y1='2' y2='22' />
                      </svg>
                    ) : (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
                        <circle cx='12' cy='12' r='3' />
                      </svg>
                    )}
                  </button>
                </div>
                {state.validationErrors.password && (
                  <p className='text-xs text-red-500 mt-1 pl-1'>
                    {state.validationErrors.password}
                  </p>
                )}
              </div>
            </fieldset>

            <div className='flex items-center justify-between'>
              <button
                type='button'
                onClick={toggleRememberMe}
                className='flex items-center gap-2 cursor-pointer group outline-none focus:underline'
              >
                <div
                  className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${state.rememberMe ? 'bg-green-600 border-green-600' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}
                >
                  {state.rememberMe && (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='12'
                      height='12'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='white'
                      strokeWidth='4'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                  )}
                </div>
                <span className='text-xs text-zinc-500 group-hover:text-zinc-400'>
                  {t.rememberMe}
                </span>
              </button>
              <span className='text-xs text-green-500 cursor-not-allowed opacity-50'>
                {t.forgotPassword}
              </span>
            </div>

            <button
              type='submit'
              disabled={state.isLoading}
              className='w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950'
            >
              {state.isLoading ? (
                <>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='animate-spin'
                  >
                    <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                  </svg>
                  <span>{t.signingIn}</span>
                </>
              ) : (
                t.submit
              )}
            </button>

            {/* Test credentials hint - DEV ONLY
            {import.meta.env.DEV && !state.error && (
                <div className="text-xs text-zinc-600 text-center p-2 bg-zinc-900/50 rounded border border-zinc-800">
                    💡 Test credentials: <code className="text-green-500">Admin / Admin@123</code>
                </div>
            )} */}

            <p className='text-center text-xs text-zinc-600 pt-2'>{t.authorizedUserNotice}</p>
          </form>
        )}
      </div>
    </div>
  );
};
