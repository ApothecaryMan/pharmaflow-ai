import React from 'react';
import type { OrgMetrics } from '../../services/org/orgAggregationService';
import { CARD_BASE } from '../../utils/themeStyles';
import { ProgressBarSkeleton } from '../skeletons/ManagementHubSkeletons';

interface QuotaMonitorProps {
  metrics: OrgMetrics;
  color?: string;
  language: 'en' | 'ar';
  isLoading?: boolean;
}


const ProgressBar: React.FC<{ 
  label: string; 
  value: number; 
  max: number; 
  icon: string; 
  colorClass: string;
  unit?: string;
}> = ({ label, value, max, icon, colorClass, unit }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500`}>
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-base)' }}>{icon}</span>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
        </div>
        <div className="text-xs font-bold font-mono tracking-tighter">
          <span className={isNearLimit ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}>
            {value}
          </span>
          <span className="text-zinc-400 mx-1">/</span>
          <span className="text-zinc-500">{max}{unit}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${isNearLimit ? 'bg-red-500' : colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const QuotaMonitor: React.FC<QuotaMonitorProps> = ({ metrics, color = 'primary', language, isLoading }) => {
  const quotaLimits = {
    branches: 15,
    staff: 50,
    storageGB: 5
  };

  const mockStorageUsage = parseFloat(((metrics?.totalBranches || 0) * 0.25).toFixed(1));

  return (
    <div className={`p-6 rounded-3xl ${CARD_BASE} flex flex-col group h-full`}>
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <span className="material-symbols-rounded text-amber-500" style={{ fontSize: 'var(--icon-lg)' }}>bolt</span>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          {language === 'ar' ? 'استهلاك الباقة والحصص' : 'Subscription & Quota'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <>
            <ProgressBarSkeleton />
            <ProgressBarSkeleton />
            <ProgressBarSkeleton />
          </>
        ) : (
          <>
            <ProgressBar 
              label={language === 'ar' ? 'الفروع المسجلة' : 'Registered Branches'}
              value={metrics?.totalBranches || 0}
              max={quotaLimits.branches}
              icon="store"
              colorClass="bg-primary-500"
            />
            
            <ProgressBar 
              label={language === 'ar' ? 'طاقم العمل' : 'Staff Members'}
              value={metrics?.activeStaffCount || 0}
              max={quotaLimits.staff}
              icon="group"
              colorClass="bg-violet-500"
            />

            <ProgressBar 
              label={language === 'ar' ? 'مساحة التخزين' : 'Storage Space'}
              value={mockStorageUsage}
              max={quotaLimits.storageGB}
              unit="GB"
              icon="database"
              colorClass="bg-orange-500"
            />
          </>
        )}
      </div>
      
      <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center bg-zinc-50 dark:bg-zinc-800/30 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl gap-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {language === 'ar' 
            ? 'هل تحتاج إلى حصص أكبر لعملك؟' 
            : 'Need more capacity for your business?'}
        </p>
        <button 
          className="text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 transition-transform shadow-lg active:scale-95"
        >
          {language === 'ar' ? 'ترقية الباقة' : 'Upgrade Plan'}
        </button>
      </div>
    </div>
  );
};
