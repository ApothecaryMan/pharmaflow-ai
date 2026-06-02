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

  const handleAccept = async (request: EmploymentRequest) => {
    setProcessingId(request.id);
    try {
      const success = await employmentRequestRepository.acceptEmploymentRequest(
        request.id,
        userId,
        username
      );
      if (success) {
        onRefresh();
      } else {
        alert('Failed to accept request. Please try again.');
      }
    } catch (err) {
      console.error('Accept error:', err);
      alert('An error occurred while accepting the request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: EmploymentRequest) => {
    if (!window.confirm('Are you sure you want to reject this employment request?')) return;
    
    setProcessingId(request.id);
    try {
      const success = await employmentRequestRepository.updateStatus(request.id, 'rejected');
      if (success) {
        onRefresh();
      } else {
        alert('Failed to reject request. Please try again.');
      }
    } catch (err) {
      console.error('Reject error:', err);
      alert('An error occurred while rejecting the request.');
    } finally {
      setProcessingId(null);
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
          className="bg-(--bg-card) border border-(--border-color) rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors hover:border-(--border-primary)"
        >
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 border border-primary-500/20">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-(--text-primary) truncate mb-0.5 sm:mb-1">
                {request.orgName || 'Pharmacy Organization'}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-(--text-secondary)">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                  {language === 'AR' ? 'الدور:' : 'Role:'} <span className="text-(--text-primary) font-medium capitalize truncate">{request.role}</span>
                </span>
                {request.sentByName && (
                  <span className="flex items-center gap-1">
                    {language === 'AR' ? 'أرسل من:' : 'Sent by:'} <span className="text-(--text-primary) font-medium">{request.sentByName}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 whitespace-nowrap">
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-secondary) hover:text-(--color-error) text-sm sm:text-base font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t.login.reject}</span>
            </button>
            <button
              onClick={() => handleAccept(request)}
              disabled={processingId === request.id}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm sm:text-base font-bold transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50"
            >
              {processingId === request.id ? (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span>{t.login.accept}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
