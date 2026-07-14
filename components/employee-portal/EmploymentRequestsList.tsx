import type React from 'react';
import { useEffect, useState } from 'react';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import type { EmploymentRequest } from '../../types';

interface Props {
  requests: EmploymentRequest[];
  userId: string;
  username: string;
  onRefresh: () => void;
  t: Translations;
  language?: string;
  isLoading?: boolean;
}

const RequestTimer = ({
  expiresAt,
  t,
  className,
}: {
  expiresAt: string;
  t: Translations;
  className?: string;
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(t.employeeSetup?.expired || 'Expired');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };
    updateTimer();
    const int = setInterval(updateTimer, 1000);
    return () => clearInterval(int);
  }, [expiresAt, t]);

  return (
    <div
      className={
        className ||
        'absolute top-4 end-4 sm:static flex items-center gap-1.5 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-bold text-xs sm:text-sm tracking-wide font-mono z-20'
      }
      dir='ltr'
    >
      <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
        timer
      </span>
      <span className='mt-[1px]'>{timeLeft}</span>
    </div>
  );
};

export function EmploymentRequestsList({
  requests,
  userId,
  username,
  onRefresh,
  t,
  language,
  isLoading,
}: Props) {
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
      } else {
        setError({
          id: request.id,
          message: t.login?.errorAcceptingRequest || 'Failed to accept request',
        });
      }
    } catch (err) {
      console.error(err);
      setError({ id: request.id, message: t.login?.errorAcceptingRequest || 'An error occurred' });
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
      } else {
        setError({
          id: request.id,
          message: t.login?.errorRejectingRequest || 'Failed to reject request',
        });
      }
    } catch (err) {
      console.error(err);
      setError({
        id: request.id,
        message: t.login?.errorRejectingRequest || 'Failed to reject request',
      });
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className='grid gap-4 animate-pulse'>
        {// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
        [...Array(2)].map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className='bg-(--bg-card) border border-(--border-color) rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-[104px] sm:h-[88px]'
          >
            <div className='flex items-start gap-4 w-full'>
              <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/10 dark:bg-white/10 shrink-0'></div>
              <div className='space-y-2.5 flex-1'>
                <div className='h-5 bg-black/10 dark:bg-white/10 rounded w-1/3'></div>
                <div className='h-4 bg-black/10 dark:bg-white/10 rounded w-2/3'></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className='p-6 sm:p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center'>
        <div className='w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3 sm:mb-4'>
          <span className='material-symbols-rounded text-[24px] sm:text-[32px] text-(--text-tertiary)'>
            domain
          </span>
        </div>
        <h4 className='text-base sm:text-lg font-medium text-(--text-primary) mb-1.5 sm:mb-2'>
          {t.login?.noPendingRequests}
        </h4>
        <p className='text-sm sm:text-base text-(--text-tertiary) max-w-md'>
          {t.employeeProfile.noPendingRequestsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-4'>
      {requests.map((request) => {
        const isPremiumRole = ['pharmacist_owner', 'admin', 'pharmacist_manager'].includes(
          request.role
        );

        return (
          <div
            key={request.id}
            className='relative overflow-hidden bg-(--bg-card) border border-(--border-color) rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center sm:text-start sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 transition-colors'
          >
            <div className='flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 min-w-0 z-10'>
              <span
                className='material-symbols-rounded text-zinc-400 dark:text-zinc-500 shrink-0'
                style={{ fontSize: 'clamp(40px, 5vw, 60px)' }}
              >
                {isPremiumRole ? 'workspace_premium' : 'domain'}
              </span>
              <div className='flex flex-col items-center sm:items-start min-w-0'>
                <h4 className='text-base sm:text-lg font-bold truncate mb-1 text-(--text-primary)'>
                  {request.orgName || 'Pharmacy Organization'}
                </h4>
                {request.branchName && (
                  <p className='text-sm font-medium text-(--text-primary) mb-2 flex items-center justify-center sm:justify-start gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 w-fit px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700'>
                    <span
                      className='material-symbols-rounded text-emerald-500'
                      style={{ fontSize: '16px' }}
                    >
                      verified
                    </span>
                    {request.branchName}
                  </p>
                )}
                <div className='flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 text-xs sm:text-sm text-(--text-secondary)'>
                  <span className='inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] sm:text-xs uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'>
                    {request.role}
                  </span>
                  {request.sentByName && (
                    <span className='flex items-center gap-1'>
                      {t.employeeProfile.sentBy}{' '}
                      <span className='text-(--text-primary) font-medium'>
                        {request.sentByName}
                      </span>
                    </span>
                  )}

                  {/* Creation Date */}
                  <div
                    className='absolute top-4 start-4 sm:static flex items-center gap-1.5 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-bold text-xs sm:text-sm tracking-wide font-mono z-20'
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                      calendar_today
                    </span>
                    <span className='mt-[1px]'>
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  {request.expiresAt && <RequestTimer expiresAt={request.expiresAt} t={t} />}
                </div>
              </div>
            </div>

            <div className='flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto z-10'>
              <div className='flex items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto'>
                <ActionButton
                  action='reject'
                  onClick={() => handleReject(request)}
                  processingId={processingId}
                  requestId={request.id}
                  processingAction={processingAction}
                  icon='cancel'
                  label={t.login.reject}
                  processingLabel={t.employeeProfile.rejecting}
                  className='px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-secondary) hover:text-(--color-error)'
                  spinnerColorClass='border-(--text-secondary)/30 border-t-(--text-secondary)'
                />
                <ActionButton
                  action='accept'
                  onClick={() => handleAccept(request)}
                  processingId={processingId}
                  requestId={request.id}
                  processingAction={processingAction}
                  icon='check_circle'
                  label={t.login.accept}
                  processingLabel={t.employeeProfile.accepting}
                  className='px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-white dark:text-zinc-900 font-semibold transition-all bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white'
                  spinnerColorClass='border-current/30 border-t-current'
                />
              </div>
              {error?.id === request.id && (
                <div className='w-full text-center sm:text-end text-xs font-semibold text-(--color-error) bg-(--color-error)/10 px-3 py-1.5 rounded-lg '>
                  {error.message}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ActionButtonProps {
  action: 'accept' | 'reject';
  onClick: () => void;
  processingId: string | null;
  requestId: string;
  processingAction: 'accept' | 'reject' | null;
  icon: string;
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
  icon,
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
      type='button'
    >
      {isProcessing ? (
        <span
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 rounded-full animate-spin ${spinnerColorClass}`}
        />
      ) : (
        <span className='material-symbols-rounded text-[16px]'>{icon}</span>
      )}
      <span>{isProcessing ? processingLabel : label}</span>
    </button>
  );
};
