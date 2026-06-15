import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import type { UserSession } from '../../types';

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
        if (user.needsWorkspaceSelection) {
          setState((prev) => ({ ...prev, isLoading: false, error: null }));
          onViewChange?.('workspace-switcher');
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            success: true,
            user: user,
          }));
          // Trigger login success immediately — Loading Guard handles the transition
          onLoginSuccess?.();
        }
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: t.errorInvalidCredentials,
          success: false,
        }));
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : t.errorGeneric;

      // Map Supabase specific Auth errors to local translations
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        errorMessage = t.errorInvalidCredentials || errorMessage;
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        errorMessage =
          language === 'AR'
            ? 'البريد الإلكتروني غير مؤكد - يرجى تفعيل الحساب من الرابط المرسل لبريدك الإلكتروني أولاً.'
            : 'Email not confirmed - Please verify your account via the link sent to your email first.';
      }

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
    <>
      {/* Header Section */}
      <div className='text-center mb-10'>
        {!state.success && (
          <>
            <h1 className='text-4xl sm:text-5xl font-serif tracking-tight mb-4 text-zinc-100 leading-[1]'>
              {language === 'AR' ? 'ارتقِ بصيدليتك' : 'Elevate your pharmacy'}
            </h1>
            <p className='text-zinc-400 text-sm'>
              {language === 'AR'
                ? 'مخزون ذكي، مبيعات أسهل، وتحكم شامل في مكان واحد'
                : 'Smart inventory, effortless sales, and complete control in one place'}
            </p>
          </>
        )}
      </div>

      {/* Success State */}
      {state.success ? (
        <div className='w-full py-10 flex flex-col items-center animate-in fade-in duration-700'>
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
              {state.error.includes(language === 'AR' ? 'تفعيل' : 'verify') && (
                <button
                  type='button'
                  onClick={async () => {
                    const emailInput = state.username.includes('@') ? state.username : '';
                    if (!emailInput) {
                      setState((prev) => ({
                        ...prev,
                        error:
                          language === 'AR'
                            ? 'يرجى إدخال البريد الإلكتروني أولاً لإعادة الإرسال.'
                            : 'Please enter your email first to resend link.',
                      }));
                      return;
                    }
                    setState((prev) => ({ ...prev, isLoading: true }));
                    const res = await authService.resendConfirmation(emailInput);
                    setState((prev) => ({
                      ...prev,
                      isLoading: false,
                      error: null,
                      success: false, // ensuring we stay on login
                    }));
                    if (res.success) {
                      alert(
                        language === 'AR'
                          ? 'تم إعادة إرسال الرابط بنجاح!'
                          : 'Confirmation link resent!'
                      );
                    } else {
                      setState((prev) => ({ ...prev, error: res.message || 'Error' }));
                    }
                  }}
                  className='ms-auto text-xs underline hover:text-white'
                >
                  {language === 'AR' ? 'إعادة إرسال الرابط' : 'Resend Link'}
                </button>
              )}
            </div>
          )}

          <fieldset disabled={state.isLoading} className='space-y-4'>
            {/* Username Input */}
            <div className='flex flex-col gap-1.5'>
              <input
                id='username'
                type='text'
                placeholder={
                  language === 'AR' ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'
                }
                autoComplete='off'
                value={state.username}
                onChange={(e) => {
                  setState((prev) => ({
                    ...prev,
                    username: e.target.value,
                    validationErrors: { ...prev.validationErrors, username: undefined },
                  }));
                }}
                className={`w-full bg-[#111111] border ${state.validationErrors.username ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 placeholder:text-start cursor-text hover:bg-zinc-900`}
                dir='ltr'
              />
              {state.validationErrors.username && (
                <p className='text-xs text-red-500 mt-1 ps-1'>{state.validationErrors.username}</p>
              )}
            </div>

            {/* Password Input */}
            <div className='flex flex-col gap-1.5'>
              <div className='relative'>
                <input
                  id='password'
                  type={state.showPassword ? 'text' : 'password'}
                  placeholder={language === 'AR' ? 'كلمة المرور' : 'Password'}
                  autoComplete='off'
                  value={state.password}
                  onChange={(e) => {
                    setState((prev) => ({
                      ...prev,
                      password: e.target.value,
                      validationErrors: { ...prev.validationErrors, password: undefined },
                    }));
                  }}
                  className={`w-full bg-[#111111] border ${state.validationErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 pr-10 placeholder:text-start cursor-text hover:bg-zinc-900`}
                  dir='ltr'
                />
                <button
                  type='button'
                  onClick={toggleShowPassword}
                  aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-hidden focus:text-white cursor-pointer`}
                >
                  <span className='material-symbols-rounded text-[20px]'>
                    {state.showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {state.validationErrors.password && (
                <p className='text-xs text-red-500 mt-1 ps-1'>{state.validationErrors.password}</p>
              )}
            </div>
          </fieldset>

          <div className='flex items-center justify-between px-1'>
            <button
              type='button'
              onClick={toggleRememberMe}
              className='flex items-center gap-2 cursor-pointer group outline-hidden focus:underline'
            >
              <div
                className={`w-4 h-4 rounded-sm border transition-all flex items-center justify-center ${state.rememberMe ? 'bg-zinc-200 border-zinc-200' : 'bg-transparent border-zinc-700 group-hover:border-zinc-500'}`}
              >
                {state.rememberMe && (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='black'
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
            <button
              type='button'
              onClick={() => onViewChange?.('forgot-password')}
              className='text-xs text-zinc-400 hover:text-zinc-200 focus:outline-hidden transition-all duration-200 cursor-pointer hover:underline underline-offset-4'
            >
              {t.forgotPassword}
            </button>
          </div>

          <button
            type='submit'
            disabled={state.isLoading}
            className='w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 focus:outline-hidden cursor-pointer mt-2'
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
              <span className='font-semibold'>{t.submit}</span>
            )}
          </button>

          <p className='text-center text-[11px] text-zinc-600 pt-2'>{t.authorizedUserNotice}</p>

          <div className='flex items-center justify-center gap-1 text-sm pt-2'>
            <span className='text-zinc-500'>
              {(t as any).dontHaveAccount || "Don't have an account?"}
            </span>
            <button
              type='button'
              onClick={() => onViewChange?.('signup')}
              className='text-white font-medium focus:outline-hidden transition-all duration-200 cursor-pointer hover:underline underline-offset-4'
            >
              {(t as any).signUpLink || 'Sign Up'}
            </button>
          </div>
        </form>
      )}
    </>
  );
};
