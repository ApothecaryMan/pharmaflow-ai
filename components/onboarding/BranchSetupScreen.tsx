import React, { useState } from 'react';
import { useSettings } from '../../context';
import { SmartInput } from '../common/SmartInputs';
import { SegmentedControl } from '../common/SegmentedControl';
import { LocationSelector } from '../common/LocationSelector';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import type { AppSettings } from '../../services/settings/types';

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
  const [governorate, setGovernorate] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [area, setArea] = useState<string | undefined>();
  const [streetAddress, setStreetAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with the current theme from props or default to first available
  const [selectedTheme, setSelectedTheme] = useState(
    availableThemes.find(t => t.primary === color) || availableThemes[0]
  );

  // Auto-generate a simple code from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setBranchName(name);
    
    // Only auto-generate if the code is empty
    if (!branchCode) {
      // Get Latin characters if they exist
      const latinOnly = name.replace(/[^a-zA-Z0-9]/g, '');
      const prefix = latinOnly.substring(0, 4).toUpperCase() || 'PH';
      setBranchCode(prefix + '01');
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
      // Try to get org ID from several places
      const activeOrgId = orgService.getActiveOrgId() || 
                         storage.get<Partial<AppSettings>>(StorageKeys.SETTINGS, {}).orgId;
      
      if (!activeOrgId) {
        throw new Error(language === 'AR' 
          ? "فشل العثور على معرف المنظمة. يرجى إعادة تشغيل الخطوة الأولى." 
          : "Organization ID not found. Please restart the first step.");
      }

      const newBranch = await branchService.create({ 
        name: branchName.trim(), 
        code: branchCode.trim().toUpperCase(), 
        status: 'active',
        orgId: activeOrgId,
        governorate,
        city,
        area,
        address: streetAddress.trim()
      });
      await branchService.setActive(newBranch.id);
      await settingsService.setMultiple({ 
        activeBranchId: newBranch.id, 
        branchCode: newBranch.code
      });
      
      onComplete();
    } catch (e: any) {
      console.error("Failed to setup branch:", e);
      setError(e.message || "Failed to setup branch");
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
            className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md border border-white/20`}
            title={isRTL ? 'الرجوع' : 'Go Back'}
          >
            <span className="material-symbols-rounded text-2xl">
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </span>
          </button>
        )}

        {/* Header styling */}
        <div 
          className="p-6 relative overflow-hidden"
          style={{ 
            backgroundColor: selectedTheme.hex,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))` 
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]"></div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <span className="material-symbols-rounded text-2xl">storefront</span>
              </div>
              <h1 className="text-xl font-bold text-white flex items-center">
                {isRTL ? 'إعداد الفرع' : 'Branch Setup'}
              </h1>
            </div>
            <div className={`scale-90 ${isRTL ? 'origin-left' : 'origin-right'}`}>
              <OnboardingStepper currentStep={2} language={language} />
            </div>
          </div>
          
          <p className="text-white/80 relative z-10 text-xs font-medium bg-black/10 p-2.5 rounded-xl border border-white/10">
            {isRTL 
              ? 'الخطوة ٢: يرجى إدخال بيانات الفرع الرئيسي للبدء في استخدام النظام.' 
              : 'Step 2: Enter your main branch details to get started with the system.'}
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

          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {isRTL ? 'موقع الفرع' : 'Branch Location'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <LocationSelector
              language={language as 'EN' | 'AR'}
              selectedGovernorate={governorate}
              selectedCity={city}
              selectedArea={area}
              onGovernorateChange={setGovernorate}
              onCityChange={setCity}
              onAreaChange={setArea}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isRTL ? 'العنوان بالتفصيل' : 'Street Address'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder={isRTL ? 'رقم المبنى، اسم الشارع...' : 'e.g. 123 Nile St.'}
              style={{ '--tw-ring-color': selectedTheme.hex } as React.CSSProperties}
            />
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3">
              <span className="material-symbols-rounded">error</span>
              {error}
            </div>
          )}

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
