import { Briefcase, Building2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import type { Employee, EmploymentRequest } from '../../../types';
import { PROFILE_GLASS_CARD_BASE } from '../../../utils/themeStyles';

const PROFILE_GLASS_CARD_NO_BORDER = PROFILE_GLASS_CARD_BASE
  .split(' ')
  .filter(c => c !== 'border' && !c.startsWith('border-') && !c.startsWith('dark:border-'))
  .join(' ') + ' border border-transparent';

const statusIcon = (status: string) => {
  switch (status) {
    case 'accepted':
      return <CheckCircle2 className='w-3.5 h-3.5' />;
    case 'rejected':
      return <XCircle className='w-3.5 h-3.5' />;
    default:
      return <Clock className='w-3.5 h-3.5' />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20';
    case 'rejected':
      return 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20';
    default:
      return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20';
  }
};

interface HistoryTabProps {
  requests: EmploymentRequest[];
  workspaces?: (Employee & { branches?: { name: string }; organizations?: { name: string } })[];
  isRTL: boolean;
  t: Translations;
  isLoading?: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  requests,
  workspaces = [],
  isRTL,
  t,
  isLoading,
}) => {
  return (
    <div className='animate-fade-in space-y-6'>
      {isLoading ? (
        <div className='relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4 animate-pulse'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='relative ps-8 flex items-start gap-3'>
              <div className='absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-page-surface) bg-black/10 dark:bg-white/10 shadow-sm' />
              <div className={`${PROFILE_GLASS_CARD_NO_BORDER} flex-1 h-20`}></div>
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className='p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center'>
          <div className='w-14 h-14 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3'>
            <Briefcase className='w-7 h-7 text-(--text-tertiary)' />
          </div>
          <h4 className='text-base font-medium text-(--text-primary) mb-1'>
            {t.employeeProfile.noWorkHistory}
          </h4>
          <p className='text-sm text-(--text-tertiary) max-w-sm'>
            {t.employeeProfile.noWorkHistoryDesc}
          </p>
        </div>
      ) : (
        <div className='relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4'>
          {workspaces.map((ws) => (
            <div key={ws.id} className='relative ps-8 flex items-start gap-3'>
              <div className='absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-page-surface) bg-primary-500 shadow-sm' />
              <div className={`${PROFILE_GLASS_CARD_NO_BORDER} flex-1`}>
                <div className='flex justify-between items-start flex-wrap gap-2'>
                  <div className='flex flex-col min-w-0'>
                    <div className='flex items-center gap-2'>
                      <Building2 className='w-4 h-4 text-primary-500 shrink-0' />
                      <h5 className='text-xs font-bold text-(--text-primary) truncate'>
                        {ws.orgName || (isRTL ? 'غير معروف' : 'Unknown Organization')}
                      </h5>
                    </div>
                    {ws.branchName && (
                      <span className='text-[10px] text-(--text-tertiary) ms-6'>
                        {ws.branchName}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ws.status === 'active' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20' : 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20'}`}
                  >
                    {ws.status === 'active' ? (
                      <CheckCircle2 className='w-3.5 h-3.5' />
                    ) : (
                      <XCircle className='w-3.5 h-3.5' />
                    )}
                    {ws.status === 'active'
                      ? isRTL
                        ? 'نشط'
                        : 'Active'
                      : isRTL
                        ? 'غير نشط'
                        : 'Inactive'}
                  </span>
                </div>
                <div className='flex items-center gap-3 mt-1.5 ms-6'>
                  <span className='text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize'>
                    {ws.role}
                  </span>
                  {ws.startDate && (
                    <span className='text-[10px] text-(--text-tertiary)'>
                      <Clock className='w-3 h-3 inline me-1' />
                      {new Date(ws.startDate).toLocaleDateString()}
                      {ws.status === 'inactive'
                        ? ` — ${ws.endDate ? new Date(ws.endDate).toLocaleDateString() : isRTL ? 'منتهي' : 'Ended'}`
                        : ` — ${isRTL ? 'حتى الآن' : 'Present'}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {requests.filter((r) => r.status === 'pending').length > 0 && (
        <div className='space-y-3 pt-2'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5'>
            <Clock className='w-3.5 h-3.5' />
            {t.employeeProfile.pendingRequests}
          </h4>
          <div className='space-y-2'>
            {requests
              .filter((r) => r.status === 'pending')
              .map((req) => (
                <div key={req.id} className={`${PROFILE_GLASS_CARD_NO_BORDER} flex items-center gap-3`}>
                  <div className='w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0'>
                    <Clock className='w-4 h-4 text-amber-500' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-xs font-bold text-(--text-primary) truncate'>
                      {req.orgName}
                    </p>
                    <p className='text-[10px] text-(--text-tertiary) capitalize'>{req.role}</p>
                  </div>
                  {req.createdAt && (
                    <span className='text-[10px] text-(--text-tertiary) whitespace-nowrap'>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
