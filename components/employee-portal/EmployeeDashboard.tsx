import React, { useEffect, useState, useCallback } from 'react';
import { UserCircle, Clock, Menu } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { supabase } from '../../lib/supabase';
import type { UserProfile, EmploymentRequest } from '../../types';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { EmploymentRequestsList } from './EmploymentRequestsList';
import { EmployeeMobileDock } from './EmployeeMobileDock';
import { EmployeePortalProfile } from './EmployeePortalProfile';
import { EmployeeSideDrawer } from './EmployeeSideDrawer';

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sessionUsername = session?.username;
  const sessionName = session?.employeeName || profile?.fullName;

  const loadData = useCallback(async (refreshSession = false) => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="h-dvh bg-(--bg-page-surface) text-(--text-primary) flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header
        className="h-12 flex items-center justify-between w-full px-4 sticky top-0 z-50"
        style={{ backgroundColor: 'var(--bg-navbar)' }}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-(--text-primary) truncate leading-tight">{t.login.employeePortal}</h1>
          <p className="text-[10px] text-(--text-tertiary) font-medium truncate leading-tight">{t.login.manageEmployment}</p>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <p className="text-xs font-semibold text-(--text-primary)">{sessionName}</p>
            <p className="text-[10px] text-primary-500">{sessionUsername}</p>
          </div>
          <button
            onClick={() => setDrawerOpen(prev => !prev)}
            className="flex items-center justify-center w-10 h-10 text-(--text-tertiary) hover:text-(--text-primary) transition-colors"
          >
            <Menu size="var(--icon-navbar-mobile)" />
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
              t={t}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {view === 'requests' && (
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-(--text-primary) flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                  <span className="truncate">{t.login?.pendingRequests || 'Pending Employment Requests'}</span>
                </h3>
                {isLoading ? (
                  <span className="text-xs text-(--text-tertiary)">{t.common.loading}</span>
                ) : (
                  <span className="px-2.5 sm:px-3 py-0.5 bg-(--bg-secondary) rounded-full text-base sm:text-lg font-medium text-(--text-tertiary) shrink-0 leading-none" style={{ fontFamily: "GraphicSansFont, sans-serif" }}>
                    {requests.length}
                  </span>
                )}
              </div>

              <EmploymentRequestsList
                requests={requests}
                userId={session?.userId || ''}
                username={profile?.username || sessionUsername || ''}
                onRefresh={() => loadData()}
                t={t}
                language={language}
              />
            </section>
          )}
        </div>
      </main>

      {/* Side Drawer */}
      <EmployeeSideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeView={view}
        onViewChange={handleViewChange}
        onSignOut={handleSignOut}
        sessionName={sessionName}
        sessionUsername={sessionUsername}
        language={language}
        profileImage={profile?.image}
        t={t}
      />

      {/* Mobile Dock */}
      <EmployeeMobileDock
        activeView={view}
        onViewChange={handleViewChange}
        onOpenDrawer={() => setDrawerOpen(prev => !prev)}
        language={language}
        t={t}
      />
    </div>
  );
}
