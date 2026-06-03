import React, { useState } from 'react';
import { Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { EmploymentRequest } from '../../types';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';

interface Props {
  requests: EmploymentRequest[];
  userId: string;
  username: string;
  onRefresh: () => void;
  t: any;
  language?: string;
}

export function EmploymentRequestsList({ requests, userId, username, onRefresh, t, language }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'reject' | null>(null);

  const handleAccept = async (request: EmploymentRequest) => {
    setProcessingId(request.id);
    setProcessingAction('accept');
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
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (request: EmploymentRequest) => {
    setProcessingId(request.id);
    setProcessingAction('reject');
    try {
      const success = await employmentRequestRepository.updateStatus(request.id, 'rejected');
      if (success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="p-6 sm:p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3 sm:mb-4">
          <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-(--text-tertiary)" />
        </div>
        <h4 className="text-base sm:text-lg font-medium text-(--text-primary) mb-1.5 sm:mb-2">{t.login?.noPendingRequests || (language === 'AR' ? 'لا توجد طلبات معلقة' : 'No Pending Requests')}</h4>
        <p className="text-sm sm:text-base text-(--text-tertiary) max-w-md">
          {language === 'AR'
            ? 'عندما ترسل لك أي صيدلية طلب توظيف، سيظهر هنا. يمكنك قبوله للوصول إلى نظام إدارة الصيدلية الخاص بهم.'
            : 'When a pharmacy sends you an employment request, it will appear here. You can then accept it to gain access to their Point of Sale and management systems.'}
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
                    {language === 'AR' ? 'أرسل من:' : 'Sent by:'} <span className="text-(--text-primary) font-medium">{request.sentByName}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 whitespace-nowrap text-(--text-tertiary)">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleReject(request)}
              disabled={processingId === request.id}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-secondary) hover:text-(--color-error) text-sm sm:text-base font-medium transition-colors disabled:opacity-50"
            >
              {processingId === request.id && processingAction === 'reject' ? (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-(--text-secondary)/30 border-t-(--text-secondary) rounded-full animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span>{processingId === request.id && processingAction === 'reject' ? (language === 'AR' ? 'جارٍ الرفض...' : 'Rejecting...') : t.login.reject}</span>
            </button>
            <button
              onClick={() => handleAccept(request)}
              disabled={processingId === request.id}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm sm:text-base font-semibold transition-colors disabled:opacity-50"
            >
              {processingId === request.id && processingAction === 'accept' ? (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span>{processingId === request.id && processingAction === 'accept' ? (language === 'AR' ? 'جارٍ القبول...' : 'Accepting...') : t.login.accept}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
