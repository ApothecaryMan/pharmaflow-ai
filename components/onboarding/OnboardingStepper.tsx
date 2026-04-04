import React from 'react';

interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3;
  language: 'EN' | 'AR';
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ currentStep, language }) => {
  const isRTL = language === 'AR';
  
  const steps = [
    { id: 1, label: isRTL ? 'المنظمة' : 'Organization' },
    { id: 2, label: isRTL ? 'الفرع' : 'Branch' },
    { id: 3, label: isRTL ? 'المدير' : 'Admin' },
  ];

  return (
    <div 
      className={`relative w-full max-w-sm mx-auto mt-10 mb-8 px-2 ${isRTL ? 'font-arabic' : ''}`} 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* 
        Unified Progress Track
        Shows a consistent line behind all steps, with a glowing fill for progress
      */}
      <div className="absolute top-[18px] left-10 right-10 h-[3px] bg-white/10 rounded-full overflow-hidden translate-y-[-1.5px]">
        <div 
          className="h-full bg-white/40 shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all duration-1000 ease-in-out"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            [isRTL ? 'marginRight' : 'marginLeft']: '0',
            // In RTL, the width increases from right to left because of dir="rtl" on the container
          }}
        />
      </div>

      <div className="flex items-center justify-between relative z-10">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <div key={step.id} className="flex flex-col items-center">
              {/* Core Step Bubble */}
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 border-2 relative ${
                  isActive 
                    ? 'bg-white text-zinc-900 border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-30' 
                    : isCompleted
                      ? 'bg-white/90 text-zinc-800 border-white scale-95 shadow-md z-20'
                      : 'bg-zinc-800/20 text-white/30 border-white/10 backdrop-blur-md scale-90 z-10'
                }`}
              >
                {isCompleted ? (
                  <span className="material-symbols-rounded text-xl font-bold animate-in zoom-in duration-300">check</span>
                ) : (
                  <span className="text-xs font-black tracking-tighter">{step.id}</span>
                )}
                
                {/* Active Pulse Effect */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-white/30 -z-10" />
                )}
              </div>

              {/* Enhanced Labeling */}
              <div className="h-0 relative w-16 flex justify-center">
                <span 
                  className={`text-[10px] font-black mt-4 uppercase tracking-[0.1em] transition-all duration-500 absolute whitespace-nowrap ${
                    isActive 
                      ? 'text-white opacity-100 translate-y-0 scale-100' 
                      : isCompleted
                        ? 'text-white/60 opacity-80 translate-y-[-2px] scale-90'
                        : 'text-white/20 opacity-40 translate-y-0 scale-90'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
