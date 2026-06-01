import React, { useEffect, useState } from 'react';
import { Building2, UserCircle, LogOut, CheckCircle2, Clock } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import type { UserProfile, EmploymentRequest } from '../../types';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { EmploymentRequestsList } from './EmploymentRequestsList';

interface Props {
  t: any;
  language?: string;
}

export function EmployeeDashboard({ t, language }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const session = await authService.getCurrentUser();
      if (session?.userId) {
        const userProfile = await employeeProfileRepository.getById(session.userId);
        setProfile(userProfile);
        
        if (userProfile?.username) {
          const pendingRequests = await employmentRequestRepository.getByUsername(userProfile.username);
          setRequests(pendingRequests);
        }
      }
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <UserCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t.login.employeePortal}</h1>
            <p className="text-xs text-zinc-400 font-medium">{t.login.manageEmployment}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{profile?.fullName}</p>
            <p className="text-xs text-emerald-400">{profile?.username}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-2 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1" />
            <span className="text-sm font-medium hidden sm:block">{t.profile?.signOut || 'Sign Out'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Welcome Banner */}
        <section className="p-8 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-zinc-900 border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Building2 className="w-48 h-48" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-3">
              Welcome, {profile?.fullName?.split(' ')[0]}!
            </h2>
            <p className="text-zinc-300 text-lg leading-relaxed mb-6">
              You are currently registered as an independent employee. Share your unique username <strong className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">{profile?.username}</strong> with pharmacy organizations to receive employment invitations.
            </p>
          </div>
        </section>

        {/* Requests Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Pending Employment Requests
            </h3>
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400">
              {requests.length} pending
            </span>
          </div>

          <EmploymentRequestsList 
            requests={requests}
            userId={profile?.id || ''}
            username={profile?.username || ''}
            onRefresh={loadData}
            t={t}
            language={language}
          />
        </section>
      </main>
    </div>
  );
}
