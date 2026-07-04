import type React from 'react';

export const LandingPage: React.FC<{ language: 'EN' | 'AR'; darkMode: boolean }> = ({
  language,
  darkMode,
}) => (
  <div
    className='h-full w-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden'
    style={{ 
      fontFamily: "'GraphicSansFont', sans-serif",
      fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1'
    }}
  >
    {/* High-Visibility Grid Pattern */}
    <div
      className='absolute inset-0 text-zinc-900/30 dark:text-zinc-100/20 pointer-events-none'
      style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(circle, black, transparent 80%)',
      }}
    />

    <div className='flex flex-col items-center text-center max-w-2xl relative z-10 -mt-20 md:-mt-32'>
      <img
        src={darkMode ? '/logo_icon_white.svg' : '/logo_icon_black.svg'}
        alt='ZINC'
        className='h-48 md:h-56 mb-8'
      />

      <div className='space-y-6 mb-10'>
        <div className='flex items-center justify-center gap-6'>
          <div className='h-px w-12 bg-zinc-200 dark:bg-zinc-800' />
          <div className='flex items-center gap-2 md:gap-3 text-zinc-900 dark:text-zinc-50' dir='ltr'>
            {[
              { char: 'Z', viewBox: '40 75 170 185', svgElement: <path d='M 40,75 L 210,75 L 210,110 L 85,225 L 210,225 L 210,260 L 40,260 L 40,225 L 165,110 L 40,110 Z' fill='currentColor' /> },
              { char: 'I', viewBox: '290 75 35 185', svgElement: <rect x='290' y='75' width='35' height='185' fill='currentColor' /> },
              { char: 'N', viewBox: '420 75 140 185', svgElement: <path d='M 420,75 L 560,75 L 560,260 L 525,260 L 525,110 L 455,110 L 455,260 L 420,260 Z' fill='currentColor' /> },
              { char: 'C', viewBox: '670 75 170 185', svgElement: <path d='M 670,75 L 840,75 L 840,110 L 705,110 L 705,225 L 840,225 L 840,260 L 670,260 Z' fill='currentColor' /> },
            ].map((item, index) => (
              <svg
                key={index}
                viewBox={item.viewBox}
                className='h-16 md:h-20 w-auto'
              >
                {item.svgElement}
              </svg>
            ))}
          </div>
          <div className='h-px w-12 bg-zinc-200 dark:bg-zinc-800' />
        </div>

        <div className='space-y-3'>
          <p
            className={`text-lg sm:text-xl font-bold !font-['GraphicSansFont'] text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text ${language === 'EN' ? 'uppercase tracking-[0.6em] pl-[0.6em]' : ''}`}
          >
            {language === 'AR' ? 'مرحباً بك في نظام زينك' : 'WELCOME TO ZINC OS'}
          </p>
          <p className='text-[15px] text-zinc-400 dark:text-zinc-500 font-medium !font-["GraphicSansFont"] max-w-[420px] mx-auto leading-relaxed'>
            {language === 'AR'
              ? 'يرجى اختيار ملف الموظف الخاص بك من الشريط السفلي للبدء.'
              : 'Please select your employee profile from the status bar to start.'}
          </p>
        </div>
      </div>

      <div className='inline-flex items-center gap-3 px-7 py-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-500'>
        <span className='material-symbols-rounded text-xl animate-bounce'>keyboard_double_arrow_down</span>
        <span className='text-[11px] font-bold !font-["GraphicSansFont"] uppercase tracking-wider'>
          {language === 'AR'
            ? window.innerWidth < 768
              ? 'سجل دخول الموظف من الأسفل'
              : 'اختر ملف الموظف بالأسفل'
            : window.innerWidth < 768
              ? 'LOGIN AS EMPLOYEE BELOW'
              : 'Select Profile Below'}
        </span>
      </div>
    </div>
  </div>
);
