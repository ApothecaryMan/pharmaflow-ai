import type React from 'react';

export const LandingPage: React.FC<{ language: 'EN' | 'AR'; darkMode: boolean }> = ({ language, darkMode }) => (
  <div className="h-full w-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden" style={{ fontFamily: "'GraphicSansFont', sans-serif" }}>
    {/* High-Visibility Grid Pattern */}
    <div className="absolute inset-0 text-zinc-900/30 dark:text-zinc-100/20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(circle, black, transparent 80%)' }} />

    <div className="flex flex-col items-center text-center max-w-2xl relative z-10">
      <img src={darkMode ? '/logo_icon_white.svg' : '/logo_icon_black.svg'} alt="ZINC" className="h-32 mb-12" />

      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-center gap-6">
          <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-800" />
          <h1 className="text-7xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter uppercase">ZINC</h1>
          <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        
        <div className="space-y-3">
          <p className={`text-[11px] font-bold text-zinc-500 dark:text-zinc-400 ${language === 'EN' ? 'uppercase tracking-[0.6em] pl-[0.6em]' : ''}`}>
            {language === 'AR' ? 'مرحباً بك في نظام زينك' : 'WELCOME TO ZINC OS'}
          </p>
          <p className="text-[15px] text-zinc-400 dark:text-zinc-500 font-medium max-w-[420px] mx-auto leading-relaxed">
            {language === 'AR' ? 'يرجى اختيار ملف الموظف الخاص بك من الشريط السفلي للبدء.' : 'Please select your employee profile from the status bar to start.'}
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-3 px-7 py-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-500">
        <span className="material-symbols-rounded text-xl animate-bounce">arrow_downward</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {language === 'AR' 
            ? (window.innerWidth < 768 ? 'سجل دخول الموظف من الأسفل' : 'اختر ملف الموظف بالأسفل') 
            : (window.innerWidth < 768 ? 'LOGIN AS EMPLOYEE BELOW' : 'Select Profile Below')}
        </span>
      </div>
    </div>
  </div>
);
