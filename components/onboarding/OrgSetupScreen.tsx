import React, { useState } from 'react';
import { useSettings } from '../../context';
import { OnboardingStepper } from './OnboardingStepper';
import { SmartInput } from '../common/SmartInputs';
import { SegmentedControl } from '../common/SegmentedControl';
import { orgService } from '../../services/org/orgService';
import { authService } from '../../services/auth/authService';
import { settingsService } from '../../services/settings/settingsService';

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
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('starter');

  const isRTL = language === 'AR';

  const plans = [
    { id: 'free', name: isRTL ? 'مجاني' : 'Free', desc: isRTL ? 'فرع واحد، ٣ موظفين' : '1 Branch, 3 Employees', icon: 'person' },
    { id: 'starter', name: isRTL ? 'بداية' : 'Starter', desc: isRTL ? 'فرع واحد، ١٠ موظفين' : '1 Branch, 10 Employees', icon: 'storefront', badge: isRTL ? 'الأكثر طلباً' : 'Recommended' },
    { id: 'pro', name: isRTL ? 'احترافي' : 'Pro', desc: isRTL ? '٥ فروع، ٢٠ موظف' : '5 Branches, 20 Employees', icon: 'hub' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !ownerName.trim()) return;

    setIsLoading(true);
    try {
      // Get current user ID for ownership
      const currentUser = authService.getCurrentUserSync();
      const ownerId = currentUser?.userId || import.meta.env.VITE_DEV_OWNER_ID as string;

      // Create organization (returns { org, membership, subscription })
      const result = await orgService.create(orgName.trim(), ownerId, selectedPlan);

      // Set as active org
      orgService.setActiveOrgId(result.org.id);

      // Persist UI preferences (Theme & Light/Dark)
      await settingsService.setMultiple({
        theme: selectedTheme,
        darkMode,
        orgId: result.org.id
      });
      
      onComplete(result.org.id);
    } catch (error) {
      console.error("Failed to setup organization:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 pb-20 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float {
          animation: subtle-float 4s ease-in-out infinite;
        }
        .plan-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .plan-card-selected {
          border-color: var(--theme-color) !important;
          background: var(--theme-bg-soft);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px var(--theme-color-glow);
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
          
          <OnboardingStepper currentStep={1} language={language} />
          
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
              {isRTL ? 'اختر خطة الاشتراك' : 'Choose Subscription Plan'}
            </label>
            <div className="space-y-2.5">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id as any)}
                  className={`plan-card w-full p-4 rounded-2xl border flex items-center text-right ${
                    selectedPlan === plan.id 
                      ? 'border-zinc-800 dark:border-white bg-zinc-50 dark:bg-zinc-800/50' 
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                  }`}
                  style={{ 
                    '--theme-color': selectedTheme.hex,
                    '--theme-color-glow': `${selectedTheme.hex}33`,
                    '--theme-bg-soft': `${selectedTheme.hex}08`
                  } as React.CSSProperties}
                >
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 shrink-0 ${
                      selectedPlan === plan.id ? 'text-white' : 'text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900'
                    }`}
                    style={{ backgroundColor: selectedPlan === plan.id ? selectedTheme.hex : undefined }}
                  >
                    <span className="material-symbols-rounded text-xl">{plan.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{plan.desc}</p>
                  </div>

                  {selectedPlan === plan.id && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mr-2"
                      style={{ backgroundColor: selectedTheme.hex }}
                    >
                      <span className="material-symbols-rounded text-sm font-bold">check</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
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
