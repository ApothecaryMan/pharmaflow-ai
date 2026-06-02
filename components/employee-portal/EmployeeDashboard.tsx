import React, { useEffect, useState, useCallback } from 'react';
import { UserCircle, LogOut, Clock } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { supabase } from '../../lib/supabase';
import type { UserProfile, EmploymentRequest } from '../../types';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { EmploymentRequestsList } from './EmploymentRequestsList';
import { EmployeeMobileDock } from './EmployeeMobileDock';
import { EmployeePortalProfile } from './EmployeePortalProfile';

type EmployeeView = 'profile' | 'requests';

interface Props {
  t: any;
  language?: string;
}

export function EmployeeDashboard({ t, language }: Props) {
  const session = authService.getCurrentUserSync();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<EmployeeView>('requests');

  const sessionUsername = session?.username;
  const sessionName = session?.employeeName || profile?.fullName;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refreshSession = false) => {
    setIsLoading(true);
    try {
      if (refreshSession) {
        await authService.refreshSession();
        window.location.reload();
        return;
      }
      
      const s = await authService.getCurrentUser();
      if (s?.userId) {
        let userProfile = await employeeProfileRepository.getById(s.userId);

        // Backfill email from auth.users if missing in user_profiles
        if (userProfile && !userProfile.email) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.email) {
            userProfile = { ...userProfile, email: authUser.email };
          }
        }

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

  const handleSignOut = useCallback(async () => {
    await authService.logout();
    window.location.href = '/login';
  }, []);

  const handleViewChange = useCallback((v: EmployeeView) => {
    setView(v);
  }, []);

  const handleUpdateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const s = await authService.getCurrentUser();
    if (!s?.userId) throw new Error('No user session');
    const updated = await employeeProfileRepository.update(s.userId, updates);
    if (updated) setProfile(updated);
  }, []);

  return (
    <div className="h-dvh bg-(--bg-page-surface) text-(--text-primary) flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-(--bg-navbar) border-b border-(--border-divider) px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shrink-0">
            <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-(--text-primary) truncate">{t.login.employeePortal}</h1>
            <p className="text-[11px] sm:text-xs text-(--text-tertiary) font-medium truncate">{t.login.manageEmployment}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-(--text-primary)">{sessionName}</p>
            <p className="text-xs text-primary-500">{sessionUsername}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 rounded-lg bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-tertiary) hover:text-(--color-error) transition-colors flex items-center gap-2 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:group-hover:translate-x-1" />
            <span className="text-sm font-medium hidden sm:block">{t.profile?.signOut || 'Sign Out'}</span>
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 pb-28 md:pb-6">
          {view === 'profile' && (
            <EmployeePortalProfile
              profile={profile}
              sessionName={sessionName}
              sessionUsername={sessionUsername}
              requests={requests}
              language={language}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {view === 'requests' && (
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-(--text-primary) flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                  <span className="truncate">Pending Employment Requests</span>
                </h3>
                {isLoading ? (
                  <span className="text-xs text-(--text-tertiary)">Loading...</span>
                ) : (
                  <span className="px-2.5 sm:px-3 py-1 bg-(--bg-secondary) rounded-full text-[11px] sm:text-xs font-medium text-(--text-tertiary) shrink-0">
                    {requests.length}
                  </span>
                )}
              </div>

              <EmploymentRequestsList 
                requests={requests}
                userId={session?.userId || ''}
                username={profile?.username || sessionUsername || ''}
                onRefresh={() => loadData(true)}
                t={t}
                language={language}
              />
            </section>
          )}
        </div>
      </main>

      {/* Mobile Dock */}
      <EmployeeMobileDock
        activeView={view}
        onViewChange={handleViewChange}
        onSignOut={handleSignOut}
        language={language}
      />
    </div>
  );
}
