import type React from 'react';
import { useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';

interface SignUpProps {
  onViewChange?: (view: 'login' | 'signup' | 'forgot-password') => void;
  onLoginSuccess?: () => void;
  language?: 'EN' | 'AR';
}

export const SignUp: React.FC<SignUpProps> = ({ onViewChange, onLoginSuccess, language = 'EN' }) => {
  const t = TRANSLATIONS[language].login as any;

  const [state, setState] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isLoading: false,
    error: null as string | null,
    success: false,
    showPassword: false,
    validationErrors: {} as Record<string, string>,
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!state.name.trim()) {
      errors.name = t.validationNameRequired || 'Full name is required';
      isValid = false;
    }
    if (!state.username.trim()) {
      errors.username = t.validationUsernameRequired || 'Username is required';
      isValid = false;
    } else if (state.username.includes(' ') || state.username.includes('@')) {
       errors.username = language === 'AR' ? 'اسم المستخدم يجب أن يكون كلمة واحدة بدون رموز' : 'Username must be a single word without symbols';
       isValid = false;
    }
    if (!state.email.trim() || !state.email.includes('@')) {
      errors.email = t.errorInvalidCredentials || 'Invalid email';
      isValid = false;
    }
    if (!state.password || state.password.length < 6) {
      errors.password = t.validationPasswordLength || 'Password must be at least 6 characters';
      isValid = false;
    }
    if (state.password !== state.confirmPassword) {
      errors.confirmPassword = t.passwordsDoNotMatch || 'Passwords do not match';
      isValid = false;
    }

    setState((prev) => ({ ...prev, validationErrors: errors }));
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null, success: false }));

    const { success, message } = await authService.signUp(state.name, state.username, state.email, state.password);

    if (success) {
      setState((prev) => ({ ...prev, isLoading: false, success: true }));
      // Optional auto-login can be done here, or redirect to login. We will auto-redirect to login
      setTimeout(() => {
        onViewChange?.('login');
      }, 5000);
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message || t.errorGeneric,
      }));
    }
  };

  const toggleShowPassword = () => setState((prev) => ({ ...prev, showPassword: !prev.showPassword }));

  return (
    <div
      className='min-h-screen w-full flex items-center justify-center text-white p-4 sm:p-6'
      style={{ backgroundColor: '#000000' }}
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      <div className='w-full max-w-[400px] space-y-8 pb-10'>
        {/* Header Section */}
        <div className='text-center mb-10'>
          <div className='flex flex-col items-center mb-8'>
            <img src='/logo_icon_white.svg' className='w-14 h-14 object-contain mb-4' alt='Logo Icon' />
            <img src='/logo_word_white.svg' className='h-7 object-contain opacity-90' alt='Zinc' />
          </div>
          {!state.success && <p className='text-zinc-400 text-sm'>{t.signUpSubtitle || 'Join us to access the system.'}</p>}
        </div>

        {state.success ? (
          <div className='w-full py-20 flex flex-col items-center animate-in fade-in duration-700 text-center'>
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mb-6">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
             </svg>
            <h3 className='text-xl font-bold text-white mb-2 tracking-wide'>
              {language === 'AR' ? 'تم إنشاء الحساب بنجاح!' : 'Account Created Successfully!'}
            </h3>
            <p className='text-zinc-400 text-sm mb-6 max-w-[280px]'>
              {language === 'AR' 
                ? 'لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني. يرجى تفعيل الحساب قبل تسجيل الدخول.' 
                : 'We have sent a confirmation link to your email. Please activate your account before logging in.'}
            </p>
            <p className='text-white/30 text-xs font-medium'>
              {language === 'AR' ? 'جاري التحويل لصفحة الدخول...' : 'Redirecting to login...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-6'>
            {state.error && (
              <div role='alert' className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm'>
                <span>{state.error}</span>
              </div>
            )}

            <fieldset disabled={state.isLoading} className='space-y-4'>
              {/* Full Name Field */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='name'>
                  {language === 'AR' ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  id='name'
                  type='text'
                  autoComplete='off'
                  placeholder={language === 'AR' ? 'أحمد محمود' : 'John Doe'}
                  value={state.name}
                  onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value, validationErrors: { ...prev.validationErrors, name: '' } }))}
                  className={`w-full bg-zinc-900 border ${state.validationErrors.name ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 placeholder:text-start cursor-text focus:bg-zinc-800/50`}
                />
                {state.validationErrors.name && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.name}</p>}
              </div>

              {/* Username Field */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='username'>
                  {language === 'AR' ? 'اسم المستخدم (للدخول)' : 'Username (for Login)'}
                </label>
                <div className='relative'>
                  <input
                    id='username'
                    type='text'
                    autoComplete='off'
                    placeholder={language === 'AR' ? 'mohamed_99' : 'john_doe'}
                    value={state.username}
                    onChange={(e) => setState((prev) => ({ ...prev, username: e.target.value.toLowerCase(), validationErrors: { ...prev.validationErrors, username: '' } }))}
                    className={`w-full bg-zinc-900 border ${state.validationErrors.username ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 pr-20 text-start placeholder:text-start cursor-text focus:bg-zinc-800/50`}
                    dir='ltr'
                  />
                  <span dir="ltr" className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none font-medium'>
                    @zinc.co
                  </span>
                </div>
                {state.validationErrors.username && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.username}</p>}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='email'>
                  {t.email || 'Email Address'}
                </label>
                <input
                  id='email'
                  type='email'
                  autoComplete='off'
                  placeholder={t.emailPlaceholder || 'you@example.com'}
                  value={state.email}
                  onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value, validationErrors: { ...prev.validationErrors, email: '' } }))}
                  className={`w-full bg-zinc-900 border ${state.validationErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 text-start placeholder:text-start cursor-text focus:bg-zinc-800/50`}
                  dir='ltr'
                />
                {state.validationErrors.email && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.email}</p>}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='password'>
                  {t.password}
                </label>
                <div className='relative'>
                  <input
                    id='password'
                    type={state.showPassword ? 'text' : 'password'}
                    autoComplete='off'
                    placeholder={t.passwordPlaceholder}
                    value={state.password}
                    onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value, validationErrors: { ...prev.validationErrors, password: '' } }))}
                    className={`w-full bg-zinc-900 border ${state.validationErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 pr-10 text-start placeholder:text-start cursor-text focus:bg-zinc-800/50`}
                    dir='ltr'
                  />
                  <button type='button' onClick={toggleShowPassword} className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:text-green-500 cursor-pointer'>
                    {state.showPassword ? (
                      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
                        <path d='M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
                        <path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.08' />
                        <line x1='2' x2='22' y1='2' y2='22' />
                      </svg>
                    ) : (
                      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
                        <circle cx='12' cy='12' r='3' />
                      </svg>
                    )}
                  </button>
                </div>
                {state.validationErrors.password && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.password}</p>}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='confirmPassword'>
                  {t.confirmPassword || 'Confirm Password'}
                </label>
                <div className='relative'>
                  <input
                    id='confirmPassword'
                    type={state.showPassword ? 'text' : 'password'}
                    autoComplete='off'
                    placeholder={t.passwordPlaceholder}
                    value={state.confirmPassword}
                    onChange={(e) => setState((prev) => ({ ...prev, confirmPassword: e.target.value, validationErrors: { ...prev.validationErrors, confirmPassword: '' } }))}
                    className={`w-full bg-zinc-900 border ${state.validationErrors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 pr-10 text-start placeholder:text-start cursor-text focus:bg-zinc-800/50`}
                    dir='ltr'
                  />
                </div>
                {state.validationErrors.confirmPassword && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.confirmPassword}</p>}
              </div>

            </fieldset>

            <button
              type='submit'
              disabled={state.isLoading}
              className='w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer'
            >
              {state.isLoading ? (
                <>
                  <svg className='animate-spin w-4 h-4 text-white' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t.signingIn}</span>
                </>
              ) : (
                t.signUpSubmit || 'Sign Up'
              )}
            </button>

            <div className='flex items-center justify-center gap-1 text-sm'>
              <span className='text-zinc-500'>{t.haveAccount || 'Already have an account?'}</span>
              <button
                type='button'
                onClick={() => onViewChange?.('login')}
                className='text-green-500 hover:text-green-400 font-medium focus:outline-hidden transition-all duration-200 cursor-pointer hover:opacity-70 hover:underline underline-offset-4'
              >
                {t.loginLink || 'Login'}
              </button>
            </div>
            
          </form>
        )}
      </div>
    </div>
  );
};
