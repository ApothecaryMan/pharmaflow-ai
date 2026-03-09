import type React from 'react';

interface LandingPageProps {
  language: 'EN' | 'AR';
  darkMode: boolean;
  color: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ language, darkMode, color }) => {
  return (
    <div className='h-full w-full flex flex-col items-center justify-center p-8 animate-fade-in select-none'>
      <div className='flex flex-col items-center text-center max-w-md w-full'>
        {/* Logo Section */}
        <div className='mb-8'>
          <img src='/logo_icon_black.svg' alt='ZINC' className='h-20 w-auto block dark:hidden' loading='eager' />
          <img src='/logo_icon_white.svg' alt='ZINC' className='h-20 w-auto hidden dark:block' loading='eager' />
        </div>

        {/* Text Section */}
        <h1 className='text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3'>
          {language === 'AR' ? 'مرحباً بك في ZINC' : 'Welcome to Zinc'}
        </h1>
        
        <p className='text-base text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed font-medium'>
          {language === 'AR'
            ? 'يرجى اختيار ملف الموظف الخاص بك من الشريط السفلي للبدء في استخدام النظام.'
            : 'Please select your employee profile from the status bar below to start using the system.'}
        </p>

        {/* Action Hint */}
        <div className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300 shadow-sm'>
          <span className='material-symbols-rounded text-[20px] animate-bounce'>arrow_downward</span>
          <span className='text-sm font-medium'>
            {language === 'AR' ? 'اختر ملف الموظف بالأسفل' : 'Select Profile Below'}
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className='absolute bottom-8 opacity-40'>
        <img
          src={darkMode ? '/logo_word_white.svg' : '/logo_word_black.svg'}
          alt='Zinc'
          className='h-5 w-auto'
          loading='lazy'
        />
      </div>
    </div>
  );
};
