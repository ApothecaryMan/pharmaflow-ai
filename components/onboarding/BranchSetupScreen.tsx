import React, { useState } from 'react';
import { useSettings } from '../../context';
import { SmartInput } from '../common/SmartInputs';
import { SegmentedControl } from '../common/SegmentedControl';

import { OnboardingStepper } from './OnboardingStepper';
import { branchService } from '../../services/branchService';
import { orgService } from '../../services/org/orgService';
import { settingsService } from '../../services/settings/settingsService';

interface BranchSetupScreenProps {
  language: 'EN' | 'AR';
  color: string;
  onComplete: () => void;
  onBack?: () => void;
}

export const BranchSetupScreen: React.FC<BranchSetupScreenProps> = ({ language, color, onComplete, onBack }) => {
  const { availableThemes, darkMode, setDarkMode } = useSettings();
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with the current theme from props or default to first available
  const [selectedTheme, setSelectedTheme] = useState(
    availableThemes.find(t => t.primary === color) || availableThemes[0]
  );

  // Auto-generate a simple code from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setBranchName(name);
    if (!branchCode) {
      // Alphanumeric only, max 4 chars (to allow + '01' = 6 total)
      const cleaned = name.replace(/[^a-zA-Z0-9]/g, '');
      const generatedCode = cleaned.substring(0, 4).toUpperCase();
      if (generatedCode) {
        setBranchCode(generatedCode + '01');
      }
    }
  };

  const handleCodeChange = (val: string) => {
    // Only allow Alphanumeric (English/Numbers), no symbols, max 6
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    setBranchCode(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) return;

    setIsLoading(true);
    try {
      const activeOrgId = orgService.getActiveOrgId() || 'org_1';
      const newBranch = branchService.create({ 
        name: branchName.trim(), 
        code: branchCode.trim().toUpperCase(), 
        status: 'active',
        orgId: activeOrgId
      });
      branchService.setActive(newBranch.id);
      await settingsService.setMultiple({ 
        activeBranchId: newBranch.id, 
        branchCode: newBranch.code
      });
      
      onComplete();
    } catch (e) {
      console.error("Failed to setup branch:", e);
      setIsLoading(false);
    }
  };

  const isRTL = language === 'AR';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Custom Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float {
          animation: subtle-float 4s ease-in-out infinite;
        }
      `}} />

      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
        
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`absolute top-8 ${isRTL ? 'right-6' : 'left-6'} z-50 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md border border-white/20`}
            title={isRTL ? 'الرجوع' : 'Go Back'}
          >
            <span className="material-symbols-rounded text-2xl">
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </span>
          </button>
        )}

        {/* Header styling */}
        <div 
          className="p-10 text-center relative overflow-hidden"
          style={{ 
            backgroundColor: selectedTheme.hex,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))` 
          }}
        >
          {/* Subtle pattern or glow */}
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]"></div>

          <div className="mb-6 flex justify-center relative z-10">
            <div className="animate-float">
              <span 
                className="material-symbols-rounded text-white"
                style={{ fontSize: '76px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}
              >
                storefront
              </span>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 relative z-10 text-center leading-relaxed">
            {isRTL ? (
              <>مرحباً بك في نظام <img src="/logo_word_white.svg" className="h-[22px] inline-block translate-y-[-4px] mx-1" style={{ filter: 'drop-shadow(0 1px 4px rgba(255,255,255,0.3))' }} alt="ZINC" /> لإدارة الصيدلية</>
            ) : (
              <>Welcome to <img src="/logo_word_white.svg" className="h-[22px] inline-block translate-y-[1px] mx-1" style={{ filter: 'drop-shadow(0 1px 4px rgba(255,255,255,0.3))' }} alt="ZINC" /> Pharmacy Management</>
            )}
          </h1>
          
          <OnboardingStepper currentStep={2} language={language} />
          
          <p className="text-white/80 relative z-10 text-sm font-medium mt-1">
            {isRTL 
              ? 'يرجى إدخال بيانات الفرع الرئيسي للبدء في استخدام النظام' 
              : 'Please enter your main branch details to get started'}
          </p>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isRTL ? 'اسم الصيدلية / الفرع' : 'Pharmacy / Branch Name'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={branchName}
              onChange={(e) => handleNameChange(e)}
              placeholder={isRTL ? 'مثال: صيدلية الأمل' : 'e.g. Hope Pharmacy'}
              style={{ '--tw-ring-color': selectedTheme.hex } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isRTL ? 'كود الفرع' : 'Branch Code'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={branchCode}
              autoCorrect="off"
              autoCapitalize="on"
              spellCheck={false}
              maxLength={6}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={isRTL ? 'مثال: HOPE01' : 'e.g. HOPE01'}
              className=""
              style={{ '--tw-ring-color': selectedTheme.hex } as React.CSSProperties}
            />
            <p className="text-xs text-zinc-500 mt-2">
              {isRTL 
                ? 'يستخدم هذا الكود في إنشاء معرفات الفواتير والموظفين (يجب أن يكون مميزاً وقصيراً).'
                : 'This code is used to generate invoice and employee IDs (should be unique and short).'}
            </p>
          </div>



          <button
            type="submit"
            disabled={isLoading || !branchName.trim() || !branchCode.trim()}
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
                <span className="ml-2 mr-2">{isRTL ? 'التالي' : 'Next'}</span>
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
