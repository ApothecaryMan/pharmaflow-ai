import React, { useState } from 'react';
import { Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { EmploymentRequest } from '../../types';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';

interface Props {
  requests: EmploymentRequest[];
  userId: string;
  username: string;
  onRefresh: () => void;
  t: Translations;
  language?: string;
  isLoading?: boolean;
}

export function EmploymentRequestsList({ requests, userId, username, onRefresh, t, language, isLoading }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const handleAccept = async (request: EmploymentRequest) => {
    setProcessingId(request.id);
    setProcessingAction('accept');
    setError(null);
    try {
      const success = await employmentRequestRepository.acceptEmploymentRequest(
        request.id,
        userId,
        username
      );
      if (success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Accept error:', err);
      setError({ id: request.id, message: t.employeeProfile.operationFailed });
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (request: EmploymentRequest) => {
    setProcessingId(request.id);
    setProcessingAction('reject');
    setError(null);
    try {
      const success = await employmentRequestRepository.updateStatus(request.id, 'rejected');
      if (success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Reject error:', err);
      setError({ id: request.id, message: t.employeeProfile.operationFailed });
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-(--bg-card) border border-(--border-color) rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-[104px] sm:h-[88px]">
            <div className="flex items-start gap-4 w-full">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/10 dark:bg-white/10 shrink-0"></div>
               <div className="space-y-2.5 flex-1">
                 <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                 <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-2/3"></div>
               </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-6 sm:p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3 sm:mb-4">
          <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-(--text-tertiary)" />
        </div>
        <h4 className="text-base sm:text-lg font-medium text-(--text-primary) mb-1.5 sm:mb-2">{t.login?.noPendingRequests}</h4>
        <p className="text-sm sm:text-base text-(--text-tertiary) max-w-md">
          {t.employeeProfile.noPendingRequestsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="relative overflow-hidden bg-(--bg-card) border border-(--border-color) rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 transition-colors"
        >
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center shrink-0 ring-1 ring-primary-500/20">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-(--text-primary) truncate mb-1">
                {request.orgName || 'Pharmacy Organization'}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-(--text-secondary)">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-500/8 text-primary-500 font-semibold text-[11px] sm:text-xs uppercase tracking-wide">
                  {request.role}
                </span>
                {request.sentByName && (
                  <span className="flex items-center gap-1">
                    {t.employeeProfile.sentBy} <span className="text-(--text-primary) font-medium">{request.sentByName}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 whitespace-nowrap text-(--text-tertiary)">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <ActionButton
                action="reject"
                onClick={() => handleReject(request)}
                processingId={processingId}
                requestId={request.id}
                processingAction={processingAction}
                icon={XCircle}
                label={t.login.reject}
                processingLabel={t.employeeProfile.rejecting}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-secondary) hover:text-(--color-error)"
                spinnerColorClass="border-(--text-secondary)/30 border-t-(--text-secondary)"
              />
              <ActionButton
                action="accept"
                onClick={() => handleAccept(request)}
                processingId={processingId}
                requestId={request.id}
                processingAction={processingAction}
                icon={CheckCircle2}
                label={t.login.accept}
                processingLabel={t.employeeProfile.accepting}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold"
                spinnerColorClass="border-white/30 border-t-white"
              />
            </div>
            {error?.id === request.id && (
              <div className="w-full text-center sm:text-end text-xs font-semibold text-(--color-error) bg-(--color-error)/10 px-3 py-1.5 rounded-lg animate-fade-in">
                {error.message}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ActionButtonProps {
  action: 'accept' | 'reject';
  onClick: () => void;
  processingId: string | null;
  requestId: string;
  processingAction: 'accept' | 'reject' | null;
  icon: React.ElementType;
  label: string;
  processingLabel: string;
  className: string;
  spinnerColorClass: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  onClick,
  processingId,
  requestId,
  processingAction,
  icon: Icon,
  label,
  processingLabel,
  className,
  spinnerColorClass,
}) => {
  const isProcessing = processingId === requestId && processingAction === action;
  const disabled = processingId === requestId;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base transition-colors disabled:opacity-50 ${className}`}
    >
      {isProcessing ? (
        <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 rounded-full animate-spin ${spinnerColorClass}`} />
      ) : (
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      )}
      <span>{isProcessing ? processingLabel : label}</span>
    </button>
  );
};
