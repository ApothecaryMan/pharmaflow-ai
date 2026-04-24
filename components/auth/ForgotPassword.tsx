import type React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useForgotPassword } from './useForgotPassword';

interface ForgotPasswordProps {
  onViewChange?: (view: 'login' | 'signup' | 'forgot-password') => void;
  language?: 'EN' | 'AR';
}

interface ForgotPasswordCopy {
  errorInvalidCredentials?: string;
  errorGeneric: string;
  resetSubtitle?: string;
  resetLinkSent?: string;
  backToLogin?: string;
  email?: string;
  emailPlaceholder?: string;
  resetSubmit?: string;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onViewChange,
  language = 'EN',
}) => {
  const t = TRANSLATIONS[language].login as ForgotPasswordCopy;
  // moved to useForgotPassword.ts
  // moved to forgotPassword.service.ts
  const { email, isLoading, error, success, validationError, handleEmailChange, handleSubmit } =
    useForgotPassword({
      invalidEmail: t.errorInvalidCredentials || 'Invalid email',
      genericError: t.errorGeneric,
    });

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
            <img
              src='/logo_icon_white.svg'
              className='w-14 h-14 object-contain mb-4'
              alt='Logo Icon'
            />
            <img src='/logo_word_white.svg' className='h-7 object-contain opacity-90' alt='Zinc' />
          </div>
          <p className='text-zinc-400 text-sm'>
            {t.resetSubtitle || 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {success ? (
          <div className='w-full py-20 flex flex-col items-center animate-in fade-in duration-700 space-y-6 text-center'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
              width='48'
              height='48'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-green-500'
            >
              <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path>
              <polyline points='22 4 12 14.01 9 11.01'></polyline>
            </svg>
            <h3 className='text-xl font-bold text-white mb-3 tracking-wide'>
              {t.resetLinkSent || 'Reset link has been sent to your email'}
            </h3>
            <button
              type='button'
              onClick={() => onViewChange?.('login')}
              className='text-green-500 hover:text-green-400 underline decoration-green-500/30 underline-offset-8 transition-all cursor-pointer hover:opacity-70'
            >
              {t.backToLogin || 'Back to Login'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-6'>
            {error && (
              <div
                role='alert'
                className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm'
              >
                <span>{error}</span>
              </div>
            )}

            <fieldset disabled={isLoading} className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300' htmlFor='email'>
                  {t.email || 'Email Address'}
                </label>
                <input
                  id='email'
                  type='email'
                  placeholder={t.emailPlaceholder || 'you@example.com'}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full bg-zinc-900 border ${validationError ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-green-500/50'} rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-hidden transition-all duration-200 focus:ring-2 focus:ring-green-500/10 ${language === 'AR' ? 'text-right placeholder:text-right' : 'text-left placeholder:text-left'} cursor-text focus:bg-zinc-800/50`}
                  dir='ltr'
                />
                {validationError && (
                  <p className='text-xs text-red-500 mt-1 pl-1'>{validationError}</p>
                )}
              </div>
            </fieldset>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer'
            >
              {isLoading ? (
                <svg
                  className='animate-spin w-4 h-4 text-white'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
              ) : (
                t.resetSubmit || 'Send Reset Link'
              )}
            </button>
            <div className='text-center pt-2'>
              <button
                type='button'
                onClick={() => onViewChange?.('login')}
                className='text-xs text-zinc-500 hover:text-zinc-300 transition-all duration-200 focus:outline-hidden cursor-pointer hover:opacity-70 hover:underline underline-offset-4'
              >
                {t.backToLogin || 'Back to Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
