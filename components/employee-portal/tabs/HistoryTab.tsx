import React, { useMemo } from 'react';
import { Briefcase, Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { EmploymentRequest } from '../../../types';
import { PROFILE_GLASS_CARD_BASE } from '../../../utils/themeStyles';

const statusIcon = (status: string) => {
  switch (status) {
    case 'accepted': return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'accepted': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20';
    case 'rejected': return 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20';
    default: return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20';
  }
};

interface HistoryTabProps {
  requests: EmploymentRequest[];
  isRTL: boolean;
  t: Translations;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ requests, isRTL, t }) => {
  const acceptedRequests = useMemo(
    () => requests.filter(r => r.status === 'accepted'),
    [requests]
  );

  return (
    <div className="animate-fade-in space-y-6">
      {acceptedRequests.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3">
            <Briefcase className="w-7 h-7 text-(--text-tertiary)" />
          </div>
          <h4 className="text-base font-medium text-(--text-primary) mb-1">
            {t.employeeProfile.noWorkHistory}
          </h4>
          <p className="text-sm text-(--text-tertiary) max-w-sm">
            {t.employeeProfile.noWorkHistoryDesc}
          </p>
        </div>
      ) : (
        <div className="relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4">
          {acceptedRequests.map((req) => (
            <div key={req.id} className="relative ps-8 flex items-start gap-3">
              <div className="absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-page-surface) bg-primary-500 shadow-sm" />
              <div className={`${PROFILE_GLASS_CARD_BASE} flex-1`}>
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                     <Building2 className="w-4 h-4 text-primary-500 shrink-0" />
                    <h5 className="text-xs font-bold text-(--text-primary) truncate">{req.orgName}</h5>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(req.status)}`}>
                    {statusIcon(req.status)}
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{req.role}</span>
                  {req.createdAt && (
                    <span className="text-[10px] text-(--text-tertiary)">
                      <Clock className="w-3 h-3 inline me-1" />
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {requests.filter(r => r.status === 'pending').length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {t.employeeProfile.pendingRequests}
          </h4>
          <div className="space-y-2">
            {requests.filter(r => r.status === 'pending').map((req) => (
              <div key={req.id} className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-(--text-primary) truncate">{req.orgName}</p>
                  <p className="text-[10px] text-(--text-tertiary) capitalize">{req.role}</p>
                </div>
                {req.createdAt && (
                  <span className="text-[10px] text-(--text-tertiary) whitespace-nowrap">
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
