import React, { useState } from 'react';
import { useSettings } from '../../../../context';
import { getLocationName } from '../../../../data/locations';
import { useBranches } from '../../../../hooks/queries/useBranchesQuery';
import { useAuthStore } from '../../../../stores/authStore';

export const BranchDirectory: React.FC = () => {
  const { language } = useSettings();
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const { data: branches, isLoading } = useBranches(activeOrgId || '');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAR = language === 'AR';

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <span className="material-symbols-rounded animate-spin text-primary-500">sync</span>
      </div>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <div className="text-center p-4 text-sm text-(--text-secondary)">
        {isAR ? 'لا توجد فروع متاحة' : 'No branches available'}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
      {branches.map((branch) => {
        const isExpanded = expandedId === branch.id;

        return (
          <div
            key={branch.id}
            className={`border rounded-lg overflow-hidden transition-colors ${
              isExpanded ? 'border-primary-500/30 bg-primary-500/5' : 'border-(--border-divider) bg-black/5 dark:bg-white/5'
            }`}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : branch.id)}
              className="w-full flex items-center justify-between p-2.5 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-black/20 shadow-sm ${isExpanded ? 'text-primary-500' : 'text-(--text-secondary)'}`}>
                  <span className="material-symbols-rounded text-[18px]">store</span>
                </div>
                <div className="text-start">
                  <p className={`text-sm font-semibold leading-none mb-1 ${isExpanded ? 'text-primary-600 dark:text-primary-400' : 'text-(--text-primary)'}`}>
                    {branch.name}
                  </p>
                  <p className="text-xs text-(--text-tertiary) leading-none">
                    {branch.code}
                  </p>
                </div>
              </div>
              <span className={`material-symbols-rounded text-(--text-secondary) transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-(--border-divider) mt-1">
                {branch.phone && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-[16px] text-(--text-secondary) mt-0.5">call</span>
                    <div>
                      <p className="text-xs text-(--text-tertiary)">{isAR ? 'رقم الهاتف' : 'Phone'}</p>
                      <p className="text-sm text-(--text-primary) font-medium" dir="ltr">{branch.phone}</p>
                    </div>
                  </div>
                )}
                
                {branch.address && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-[16px] text-(--text-secondary) mt-0.5">location_on</span>
                    <div>
                      <p className="text-xs text-(--text-tertiary)">{isAR ? 'العنوان' : 'Address'}</p>
                      <p className="text-sm text-(--text-primary)">
                        {[
                          branch.address,
                          getLocationName(branch.area || '', 'area', language),
                          getLocationName(branch.city || '', 'city', language),
                          getLocationName(branch.governorate || '', 'gov', language)
                        ].filter(Boolean).join(isAR ? '، ' : ', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Adding email as a placeholder if it exists in the future */}
                {/* 
                {branch.email && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-[16px] text-(--text-secondary) mt-0.5">mail</span>
                    <div>
                      <p className="text-xs text-(--text-tertiary)">{isAR ? 'البريد الإلكتروني' : 'Email'}</p>
                      <p className="text-sm text-(--text-primary) font-medium">{branch.email}</p>
                    </div>
                  </div>
                )}
                */}

                {!branch.phone && !branch.address && (
                   <p className="text-xs text-(--text-tertiary) text-center py-2">
                     {isAR ? 'لا توجد بيانات اتصال مفصلة متاحة' : 'No contact details available'}
                   </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
