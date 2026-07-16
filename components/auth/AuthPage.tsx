import type React from 'react';
import { useCallback, useState } from 'react';
import { ROUTES } from '../../config/routes';
import { useSettings } from '../../context';
import { useClockSkew } from '../../hooks/common/useClockSkew';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import type { Language } from '../../types';
import { useAutoSystemBarColor } from '../../utils/systemBars';
import { SegmentedControl } from '../common/SegmentedControl';
import { PricingPage } from '../settings/PricingPage';
import { ForgotPassword } from './ForgotPassword';
import { Login } from './Login';
import { SignUp } from './SignUp';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'workspace-switcher';

interface AuthPageProps {
  onLoginSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const { language, setLanguage } = useSettings();

  const [currentView, setCurrentView] = useState<AuthView>(() => {
    const hash = window.location.hash;
    if (hash === `#/${ROUTES.SIGNUP}`) return 'signup';
    if (hash === `#/${ROUTES.FORGOT_PASSWORD}`) return 'forgot-password';
    return 'login';
  });
  useAutoSystemBarColor(`${currentView}:${language}`, '--bg-page-surface');

  const { hasClockSkew } = useClockSkew();
  const t = TRANSLATIONS[language || 'EN'];

  const handleViewChange = useCallback((view: AuthView) => {
    setCurrentView(view);
    const hashMap: Record<AuthView, string> = {
      login: ROUTES.LOGIN,
      signup: ROUTES.SIGNUP,
      'forgot-password': ROUTES.FORGOT_PASSWORD,
      'workspace-switcher': 'select-workspace',
    };
    window.history.replaceState(null, '', `#/${hashMap[view]}`);
  }, []);

  const handleLoginSuccessOrDashboard = useCallback(
    (view?: string) => {
      if (view === 'dashboard' && onLoginSuccess) {
        onLoginSuccess();
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    [onLoginSuccess]
  );

  const renderContent = () => {
    if (currentView === 'signup') {
      return (
        <SignUp
          onViewChange={handleViewChange}
          onLoginSuccess={handleLoginSuccessOrDashboard}
          language={language}
        />
      );
    }

    if (currentView === 'forgot-password') {
      return <ForgotPassword onViewChange={handleViewChange} language={language} />;
    }

    if (currentView === 'workspace-switcher') {
      const session = authService.getCurrentUserSync();
      return (
        <WorkspaceSwitcher
          workspaces={session?.availableWorkspaces || []}
          onSelect={() => handleLoginSuccessOrDashboard()}
          onCancel={() => handleViewChange('login')}
          t={TRANSLATIONS[language || 'EN']}
        />
      );
    }

    // Default to Login
    return (
      <Login
        onViewChange={(v) => {
          if (v === 'dashboard') {
            handleLoginSuccessOrDashboard('dashboard');
          } else {
            handleViewChange(v as AuthView);
          }
        }}
        onLoginSuccess={handleLoginSuccessOrDashboard}
        language={language}
      />
    );
  };

  return (
    <>
      {language === 'AR' && (
        <style>{`
          [dir="rtl"] h1, [dir="rtl"] h2, [dir="rtl"] h3, [dir="rtl"] h4,
          [dir="rtl"] .font-serif, [dir="rtl"] [class*="title"] {
            font-family: 'GraphicSansFont', sans-serif !important;
          }
        `}</style>
      )}
      <div
        className='flex flex-col bg-black text-white h-full overflow-y-auto'
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        <div className='relative min-h-full lg:min-h-screen flex shrink-0'>
          {/* Left Pane (Form Area) */}
          <div className='w-full lg:w-1/2 flex flex-col relative p-6 sm:p-12'>
            <nav className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <img
                  src='/logo_icon_white.svg'
                  className='w-10 h-10 object-contain'
                  alt='Logo Icon'
                />
                <img
                  src='/logo_word_white.svg'
                  className='h-6 object-contain opacity-90'
                  alt='Zinc'
                />
              </div>

              {/* Top Language Switcher */}
              <div className='z-50'>
                <SegmentedControl
                  value={language}
                  onChange={(val) => setLanguage(val as Language)}
                  options={[
                    { label: 'EN', value: 'EN' },
                    { label: 'AR', value: 'AR' },
                  ]}
                  size='xs'
                  fullWidth={false}
                  disableAnimation={true}
                  className='!bg-white !shadow-none ring-1 ring-white/10 [&>div]:!bg-black [&>div]:!shadow-none [&_button]:!text-black [&_button[data-active=true]]:!text-white [&_button:not([data-active=true])]:!cursor-pointer [&_button[data-active=true]]:!cursor-default'
                  dir='ltr'
                />
              </div>
            </nav>

            <div className='flex-1 flex flex-col justify-center items-center'>
              {hasClockSkew && (
                <div className='w-full max-w-[360px] mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-400 text-sm'>
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
                    className='shrink-0 mt-0.5'
                  >
                    <title>Clock</title>
                    <circle cx='12' cy='12' r='10' />
                    <polyline points='12 6 12 12 16 14' />
                  </svg>
                  <div>
                    <p className='font-medium mb-0.5'>{t.login.clockSkewTitle}</p>
                    <p className='text-amber-400/80'>{t.login.clockSkewMessage}</p>
                  </div>
                </div>
              )}
              <div
                className={
                  'w-full max-w-[360px] space-y-8 mt-12 lg:mt-0' +
                  (hasClockSkew ? ' pointer-events-none opacity-40' : '')
                }
              >
                {renderContent()}
              </div>
            </div>
          </div>

          {/* Right Pane (Banner) */}
          <div className='hidden lg:flex w-1/2 p-4 sm:p-6 ps-0'>
            <div className='w-full h-full bg-[#111111] rounded-[2rem] border border-white/5 flex items-center justify-center relative overflow-hidden'>
              <div className='flex items-center justify-center gap-3'>
                <img src='/logo_word_ar.svg' className='h-5 object-contain opacity-40' alt='' />
                <img src='/logo_icon_white.svg' className='w-5 h-5 opacity-40' alt='' />
                <img
                  src='/logo_word_white.svg'
                  className='h-5 object-contain opacity-40'
                  alt='Zinc'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section (Below the fold) */}
        <div className='w-full dark'>
          <PricingPage hideBackButton={true} />
        </div>
      </div>
    </>
  );
};
