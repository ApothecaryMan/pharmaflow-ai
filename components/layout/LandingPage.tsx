import type React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';

interface LandingPageProps {
  language: 'EN' | 'AR';
  darkMode: boolean;
  color: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ language, darkMode, color }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className='h-full w-full flex flex-col items-center justify-center p-8 animate-fade-in select-none'>
      {/* Abstract Background Decoration */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div
          className={`absolute -top-24 -right-24 w-96 h-96 bg-${color}-500/5 rounded-full blur-3xl`}
        ></div>
        <div
          className={`absolute -bottom-24 -left-24 w-96 h-96 bg-${color}-500/5 rounded-full blur-3xl`}
        ></div>
      </div>

      <div className='relative flex flex-col items-center text-center max-w-2xl'>
        {/* Logo Section */}
        <div className='mb-12 relative group'>
          {/* Glowing Aura */}
          <div
            className={`absolute inset-0 bg-${color}-500/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-all duration-1000`}
          ></div>

          <div className='relative transform hover:scale-105 transition-transform duration-500'>
            {/* Light Mode Logo */}
            <img src='/logo_icon_black.svg' alt='ZINC' className='h-32 w-auto dark:hidden' />
            {/* Dark Mode Logo */}
            <img src='/logo_icon_white.svg' alt='ZINC' className='h-32 w-auto hidden dark:block' />
          </div>
        </div>

        {/* Text Section */}
        <h1 className='text-4xl md:text-5xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500'>
          {language === 'AR' ? 'مرحباً بك في ZINC' : 'Welcome to Zinc'}
        </h1>

        <p className='text-xl text-zinc-500 dark:text-zinc-400 font-medium mb-12 max-w-md leading-relaxed'>
          {language === 'AR'
            ? 'يرجى اختيار ملف الموظف الخاص بك من الشريط السفلي للبدء في استخدام النظام.'
            : 'Please select your employee profile from the status bar below to start using the system.'}
        </p>

        {/* Action Hint */}
        <div className='flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-bounce'>
          <span className={`material-symbols-rounded text-${color}-500`}>arrow_downward</span>
          <span className='text-sm font-bold text-zinc-600 dark:text-zinc-300'>
            {language === 'AR' ? 'اختر ملف الموظف بالأسفل' : 'Select Profile Below'}
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className='absolute bottom-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500'>
        <img
          src={darkMode ? '/logo_word_white.svg' : '/logo_word_black.svg'}
          alt='Zinc'
          className='h-6 w-auto'
        />
      </div>
    </div>
  );
};
