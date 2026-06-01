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
      <div className="p-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-zinc-500" />
        </div>
        <h4 className="text-lg font-medium text-white mb-2">{t.login.noPendingRequests}</h4>
        <p className="text-zinc-500 max-w-md">
          When a pharmacy sends you an employment request, it will appear here. You can then accept it to gain access to their Point of Sale and management systems.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => (
        <div 
          key={request.id}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Building2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                {request.orgName || 'Pharmacy Organization'}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Role: <span className="text-zinc-300 font-medium capitalize">{request.role}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:w-auto w-full">
            <button
              onClick={() => handleReject(request)}
              disabled={processingId === request.id}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>{t.login.reject}</span>
            </button>
            <button
              onClick={() => handleAccept(request)}
              disabled={processingId === request.id}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {processingId === request.id ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{t.login.accept}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
