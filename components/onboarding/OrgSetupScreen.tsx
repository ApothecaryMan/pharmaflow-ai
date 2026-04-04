import React, { useState } from 'react';
import { useSettings } from '../../context';
import { SmartInput } from '../common/SmartInputs';
import { SegmentedControl } from '../common/SegmentedControl';
import { orgService } from '../../services/org/orgService';
import { authService } from '../../services/auth/authService';

interface OrgSetupScreenProps {
  language: 'EN' | 'AR';
  onComplete: (orgId: string) => void;
}

export const OrgSetupScreen: React.FC<OrgSetupScreenProps> = ({ language, onComplete }) => {
  const { availableThemes, darkMode, setDarkMode } = useSettings();
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Default theme
  const [selectedTheme, setSelectedTheme] = useState(availableThemes[0]);

  const isRTL = language === 'AR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !ownerName.trim()) return;

    setIsLoading(true);
    try {
      // Get current user ID for ownership
      const currentUser = authService.getCurrentUserSync();
      const ownerId = currentUser?.userId || 'DEV-OWNER';

      // Create organization (returns { org, membership, subscription })
      const result = await orgService.create(orgName.trim(), ownerId);

      // Set as active org
      orgService.setActiveOrgId(result.org.id);
      
      onComplete(result.org.id);
    } catch (error) {
      console.error("Failed to setup organization:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float {
          animation: subtle-float 4s ease-in-out infinite;
        }
      `}} />

      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div 
          className="p-10 text-center relative overflow-hidden"
          style={{ 
            backgroundColor: selectedTheme.hex,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))` 
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]"></div>

          <div className="mb-6 flex justify-center relative z-10">
            <div className="animate-float">
              <span 
                className="material-symbols-rounded text-white"
                style={{ fontSize: '76px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}
              >
                corporate_fare
              </span>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 relative z-10 text-center leading-relaxed">
            {isRTL ? 'إنشاء منظمة جديدة' : 'Create New Organization'}
          </h1>
          
          {/* 3-Step Stepper */}
          <div className="flex items-center justify-center mt-9 mb-2 max-w-sm mx-auto relative z-10 px-6">
            {/* Step 1: Active */}
            <div className="flex flex-col items-center relative z-20">
              <div className="w-8 h-8 rounded-full bg-white text-zinc-900 flex items-center justify-center font-bold text-xs shadow-md transform scale-110">
                1
              </div>
              <span className="text-[10px] font-bold mt-2.5 text-white uppercase tracking-widest opacity-100 whitespace-nowrap">
                {isRTL ? 'المنظمة' : 'Organization'}
              </span>
            </div>

            <div className="flex-1 h-[2px] mx-3 -mt-6.5 bg-white/20 rounded-full" />

            {/* Step 2: Upcoming */}
            <div className="flex flex-col items-center relative z-20">
              <div className="w-8 h-8 rounded-full bg-black/20 text-white/70 flex items-center justify-center font-bold text-xs border border-white/20 backdrop-blur-md">
                2
              </div>
              <span className="text-[10px] font-bold mt-2.5 text-white/50 uppercase tracking-widest whitespace-nowrap">
                {isRTL ? 'الفرع' : 'Branch'}
              </span>
            </div>

            <div className="flex-1 h-[2px] mx-3 -mt-6.5 bg-white/10 rounded-full" />

            {/* Step 3: Upcoming */}
            <div className="flex flex-col items-center relative z-20">
              <div className="w-8 h-8 rounded-full bg-black/20 text-white/70 flex items-center justify-center font-bold text-xs border border-white/20 backdrop-blur-md">
                3
              </div>
              <span className="text-[10px] font-bold mt-2.5 text-white/30 uppercase tracking-widest whitespace-nowrap">
                {isRTL ? 'المدير' : 'Admin'}
              </span>
            </div>
          </div>
          
          <p className="text-white/80 relative z-10 text-sm font-medium mt-4">
            {isRTL 
              ? 'ابدأ بتعريف اسم صيدليتك أو مؤسستك' 
              : 'Start by defining your pharmacy or organization name'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isRTL ? 'اسم المنظمة / الصيدلية' : 'Organization / Pharmacy Name'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={isRTL ? 'مثال: مجموعة صيدليات الأمل' : 'e.g. Hope Pharmacy Group'}
              style={{ '--tw-ring-color': selectedTheme.hex } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isRTL ? 'اسم المالك' : 'Owner Name'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={isRTL ? 'مثال: د. أحمد محمد' : 'e.g. Dr. Ahmed Ali'}
              style={{ '--tw-ring-color': selectedTheme.hex } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              {isRTL ? 'لون الهوية' : 'Brand Identity Color'}
            </label>
            <div className="flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-xl shadow-sm">
              <div className="flex flex-wrap gap-2.5">
                {availableThemes.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${
                      selectedTheme.name === t.name 
                        ? 'border-zinc-800 dark:border-white scale-110 shadow-lg' 
                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: t.hex }}
                    title={t.name}
                  />
                ))}
              </div>

              <div className="flex items-center">
                <SegmentedControl
                  value={darkMode}
                  onChange={(val) => setDarkMode(val as boolean)}
                  color={selectedTheme.primary.toLowerCase()}
                  size="xs"
                  iconSize="--icon-lg"
                  fullWidth={false}
                  shape="pill"
                  options={[
                    { label: '', value: false, icon: 'light_mode' },
                    { label: '', value: true, icon: 'dark_mode' },
                  ]}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !orgName.trim() || !ownerName.trim()}
            className="w-full py-4 px-4 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            style={{ 
              backgroundColor: selectedTheme.hex,
              boxShadow: `0 8px 24px -6px ${selectedTheme.hex}66`
            }}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <span className="ml-2 mr-2">{isRTL ? 'إكمال' : 'Continue'}</span>
                <span className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}>
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
