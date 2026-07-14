import type React from 'react';

interface LogoutOverlayProps {
  language: 'EN' | 'AR';
  darkMode: boolean;
  logoutReason?: 'normal' | 'remote';
  terminatorName?: string | null;
}

const _LogoAsterisk = ({ scale = 1.4 }: { scale?: number }) => (
  <svg
    viewBox='0 0 140 140'
    className='w-12 h-12 text-zinc-900 dark:text-white animate-spin'
    style={{ animationDuration: '2s' }}
  >
    <title>Loading</title>
    <g transform={`translate(70 70) scale(${scale})`} fill='currentColor'>
      <rect x='-4' y='-35' width='8' height='70' rx='.5' transform='rotate(45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(-45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(90)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(135)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(180)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(270)' />
    </g>
  </svg>
);

export const LogoutOverlay: React.FC<LogoutOverlayProps> = ({
  language,
  darkMode: _darkMode,
  logoutReason = 'normal',
  terminatorName = null,
}) => {
  return (
    <div className='h-dvh w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black relative overflow-hidden'>
      <div
        className='flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4 px-4 dir-auto mb-16'
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        <h1
          className={`py-2 ${logoutReason === 'remote' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} !font-['GraphicSansFont'] tracking-tight leading-normal text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text text-center`}
          style={{
            fontFeatureSettings:
              '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
          }}
        >
          {logoutReason === 'remote'
            ? language === 'AR'
              ? terminatorName
                ? `تم إنهاء جلستك بواسطة ${terminatorName}. جاري الخروج...`
                : 'تم إنهاء جلستك من جهاز آخر. جاري الخروج...'
              : terminatorName
                ? `Session terminated by ${terminatorName}. Logging out...`
                : 'Session terminated remotely. Logging out...'
            : language === 'AR'
              ? 'جاري تسجيل الخروج...'
              : 'Logging out...'}
        </h1>
      </div>
    </div>
  );
};
