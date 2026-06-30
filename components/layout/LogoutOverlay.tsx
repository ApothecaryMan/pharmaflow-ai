import { motion } from 'framer-motion';
import React from 'react';

interface LogoutOverlayProps {
  language: 'EN' | 'AR';
  darkMode: boolean;
  currentEmployeeId: string | null;
  activeBranchId: string | null;
  employees: any[];
  inventory: any[];
  sales: any[];
  logoutReason?: 'normal' | 'remote';
  terminatorName?: string | null;
}

const LogoAsterisk = ({ scale = 1.4 }: { scale?: number }) => (
  <svg
    viewBox='0 0 140 140'
    className='w-12 h-12 text-zinc-900 dark:text-white animate-spin'
    style={{ animationDuration: '2s' }}
  >
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
  darkMode,
  currentEmployeeId,
  activeBranchId,
  employees,
  inventory,
  sales,
  logoutReason = 'normal',
  terminatorName = null,
}) => {
  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);

  return (
    <div className='h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black relative overflow-hidden'>
      <style>{`
        @keyframes wave-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-wave-text {
          background-size: 200% auto;
          animation: wave-shimmer 2s linear infinite;
        }
      `}</style>
      
      <div className='flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4 px-4 dir-auto mb-16' dir={language === 'AR' ? 'rtl' : 'ltr'}>
        <LogoAsterisk scale={1.5} />
        <h1 className={`py-2 ${logoutReason === 'remote' ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'} font-serif tracking-tight leading-normal text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text text-center`}>
          {logoutReason === 'remote'
            ? language === 'AR'
              ? terminatorName ? `تم إنهاء جلستك بواسطة ${terminatorName}. جاري الخروج...` : 'تم إنهاء جلستك من جهاز آخر. جاري الخروج...'
              : terminatorName ? `Session terminated by ${terminatorName}. Logging out...` : 'Session terminated remotely. Logging out...'
            : language === 'AR'
            ? 'جاري تسجيل الخروج...'
            : 'Logging out...'}
        </h1>
      </div>
    </div>
  );
};
