import type React from 'react';
import { useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import { IndividualRegistration } from './IndividualRegistration';

interface SignUpProps {
  onViewChange?: (view: 'login' | 'signup' | 'forgot-password') => void;
  onLoginSuccess?: () => void;
  language?: 'EN' | 'AR';
}

export const SignUp: React.FC<SignUpProps> = ({ onViewChange, onLoginSuccess, language = 'EN' }) => {
  const t = TRANSLATIONS[language].login as any;

  const [registrationType, setRegistrationType] = useState<'org' | 'employee' | null>(null);

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
    <>
      {/* Header Section */}
      <div className='text-center mb-10'>
        {!state.success && registrationType === 'org' && <p className='text-zinc-400 text-sm'>{t.signUpSubtitle || 'Join us to access the system.'}</p>}
      </div>

        {!registrationType ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-center mb-6">{language === 'AR' ? 'نوع الحساب' : 'Account Type'}</h3>
            <button
              onClick={() => setRegistrationType('employee')}
              className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 group flex items-center gap-4 text-start cursor-pointer"
            >
              <svg className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors duration-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors duration-300 mb-1">{language === 'AR' ? 'موظف مستقل' : 'Independent Employee'}</h4>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300 leading-relaxed">{language === 'AR' ? 'سجل مستخدم للحصول على طلبات عمل من الصيدليات' : 'Register with a username to receive employment requests from pharmacies'}</p>
              </div>
            </button>
            <button
              onClick={() => setRegistrationType('org')}
              className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-300 group flex items-center gap-4 text-start cursor-pointer"
            >
              <svg className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors duration-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors duration-300 mb-1">{language === 'AR' ? 'مدير صيدلية' : 'Pharmacy Owner/Manager'}</h4>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300 leading-relaxed">{language === 'AR' ? 'سجل كمنظمة لإدارة الفروع والموظفين' : 'Register as an organization to manage branches and employees'}</p>
              </div>
            </button>

            <div className='flex items-center justify-center gap-1 text-sm mt-6 pt-6 border-t border-zinc-800/50'>
              <span className='text-zinc-500'>{t.haveAccount || 'Already have an account?'}</span>
              <button
                type='button'
                onClick={() => onViewChange?.('login')}
                className='text-white hover:text-zinc-300 font-medium focus:outline-hidden transition-all duration-200 cursor-pointer hover:underline underline-offset-4'
              >
                {t.loginLink || 'Login'}
              </button>
            </div>
          </div>
        ) : registrationType === 'employee' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setRegistrationType(null)}
              className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {language === 'AR' ? 'رجوع' : 'Back'}
            </button>
            <IndividualRegistration
              onSuccess={() => onViewChange?.('login')}
              onLoginClick={() => onViewChange?.('login')}
              t={TRANSLATIONS[language]}
              language={language}
            />
          </div>
        ) : state.success ? (
          <div className='w-full py-20 flex flex-col items-center animate-in fade-in duration-700 text-center'>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white mb-6">
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setRegistrationType(null)}
              className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {language === 'AR' ? 'رجوع' : 'Back'}
            </button>
            <form onSubmit={handleSubmit} className='space-y-6'>
              {state.error && (
                <div role='alert' className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm'>
                  <span>{state.error}</span>
                </div>
              )}

              <fieldset disabled={state.isLoading} className='space-y-4'>
                {/* Full Name Field */}
                <div className='flex flex-col gap-1.5'>
                  <input
                    id='name'
                    type='text'
                    autoComplete='off'
                    placeholder={language === 'AR' ? 'الاسم الكامل' : 'Full Name'}
                    value={state.name}
                    onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value, validationErrors: { ...prev.validationErrors, name: '' } }))}
                    className={`w-full bg-[#111111] border ${state.validationErrors.name ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 placeholder:text-start cursor-text hover:bg-zinc-900`}
                  />
                  {state.validationErrors.name && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.name}</p>}
                </div>

                {/* Username Field */}
                <div className='flex flex-col gap-1.5'>
                  <div className='relative'>
                    <input
                      id='username'
                      type='text'
                      autoComplete='off'
                      placeholder={language === 'AR' ? 'اسم المستخدم' : 'Username'}
                      value={state.username}
                      onChange={(e) => setState((prev) => ({ ...prev, username: e.target.value.toLowerCase(), validationErrors: { ...prev.validationErrors, username: '' } }))}
                      className={`w-full bg-[#111111] border ${state.validationErrors.username ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 text-start placeholder:text-start cursor-text hover:bg-zinc-900`}
                      dir='ltr'
                    />
                  </div>
                  {state.validationErrors.username && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.username}</p>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <input
                    id='email'
                    type='email'
                    autoComplete='off'
                    placeholder={language === 'AR' ? 'البريد الإلكتروني' : 'Email Address'}
                    value={state.email}
                    onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value, validationErrors: { ...prev.validationErrors, email: '' } }))}
                    className={`w-full bg-[#111111] border ${state.validationErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 text-start placeholder:text-start cursor-text hover:bg-zinc-900`}
                    dir='ltr'
                  />
                  {state.validationErrors.email && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.email}</p>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <div className='relative'>
                    <input
                      id='password'
                      type={state.showPassword ? 'text' : 'password'}
                      autoComplete='off'
                      placeholder={language === 'AR' ? 'كلمة المرور' : 'Password'}
                      value={state.password}
                      onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value, validationErrors: { ...prev.validationErrors, password: '' } }))}
                      className={`w-full bg-[#111111] border ${state.validationErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 pr-10 text-start placeholder:text-start cursor-text hover:bg-zinc-900`}
                      dir='ltr'
                    />
                    <button type='button' onClick={toggleShowPassword} className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:text-white cursor-pointer'>
                      <span className="material-symbols-rounded text-[20px]">
                        {state.showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {state.validationErrors.password && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.password}</p>}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <div className='relative'>
                    <input
                      id='confirmPassword'
                      type={state.showPassword ? 'text' : 'password'}
                      autoComplete='off'
                      placeholder={language === 'AR' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                      value={state.confirmPassword}
                      onChange={(e) => setState((prev) => ({ ...prev, confirmPassword: e.target.value, validationErrors: { ...prev.validationErrors, confirmPassword: '' } }))}
                      className={`w-full bg-[#111111] border ${state.validationErrors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 pr-10 text-start placeholder:text-start cursor-text hover:bg-zinc-900`}
                      dir='ltr'
                    />
                  </div>
                  {state.validationErrors.confirmPassword && <p className='text-xs text-red-500 mt-1 pl-1'>{state.validationErrors.confirmPassword}</p>}
                </div>

              </fieldset>

              <button
                type='submit'
                disabled={state.isLoading}
                className='w-full bg-white hover:bg-zinc-200 disabled:bg-white/50 text-black font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2'
              >
                {state.isLoading ? (
                  <>
                    <svg className='animate-spin w-4 h-4 text-black' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t.signingIn}</span>
                  </>
                ) : (
                  t.signUpSubmit || 'Sign Up'
                )}
              </button>

              <div className='flex items-center justify-center gap-1 text-sm pt-2'>
                <span className='text-zinc-500'>{t.haveAccount || 'Already have an account?'}</span>
                <button
                  type='button'
                  onClick={() => onViewChange?.('login')}
                  className='text-white font-medium focus:outline-hidden transition-all duration-200 cursor-pointer hover:underline underline-offset-4'
                >
                  {t.loginLink || 'Login'}
                </button>
              </div>


            </form>
          </div>
        )}
    </>
  );
};
