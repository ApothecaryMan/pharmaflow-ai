import { Clock, Menu } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/auth/authService';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { employeeRepository } from '../../services/hr/repositories/employeeRepository';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { startRegistration } from '@simplewebauthn/browser';
import type { Employee, EmploymentRequest, UserProfile } from '../../types';
import { EmployeeMobileDock } from './EmployeeMobileDock';
import { EmployeePortalProfile } from './EmployeePortalProfile';
import { EmployeeSideDrawer } from './EmployeeSideDrawer';
import { EmploymentRequestsList } from './EmploymentRequestsList';

type EmployeeView = 'profile' | 'requests';

interface Props {
  t: Translations;
  language?: string;
}

export function EmployeeDashboard({ t, language }: Props) {
  const session = authService.getCurrentUserSync();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<EmployeeView>('requests');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<(Employee & { branches?: { name: string }; organizations?: { name: string } })[]>([]);

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
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (authUser?.email) {
            userProfile = { ...userProfile, email: authUser.email };
          }
        }

        setProfile(userProfile);

        if (userProfile?.id) {
          const pendingRequests = await employmentRequestRepository.getByUserId(
            userProfile.id
          );
          setRequests(pendingRequests);
        }

        // Fetch workspaces via RPC (bypasses RLS circular dependency)
        const { data: empData, error: empError } = await supabase.rpc('get_my_workspaces');
        if (empError) {
          console.error('get_my_workspaces RPC error:', empError);
        }
        if (empData) {
          // RPC returns flat rows with org_name/branch_name already joined
          const mappedWorkspaces = empData.map((row: any) => ({
            ...employeeRepository.mapFromDb(row),
            orgName: row.org_name,
            branchName: row.branch_name,
          }));
          setWorkspaces(mappedWorkspaces);
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

  // Realtime subscription for incoming employment requests
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('public:employment_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employment_requests',
          filter: `target_user_id=eq.${profile.id}`,
        },
        () => {
          // Re-fetch requests when a change happens
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.username, loadData]);

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

  const handleUpdateWorkspacePassword = useCallback(async (employeeId: string, newPassword: string) => {
    try {
      await employeeRepository.update(employeeId, { password: newPassword });
      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === employeeId ? { ...ws, password: newPassword } : ws))
      );
    } catch (err) {
      console.error('Failed to update workspace password', err);
      throw err;
    }
  }, []);

  const handleRegisterWorkspaceFingerprint = useCallback(async (employeeId: string, username: string) => {
    try {
      if (!window.isSecureContext) {
        alert(language === 'AR' ? 'لأسباب أمنية، لا يمكن تسجيل البصمة إلا في بيئة آمنة (HTTPS أو Localhost).' : 'For security reasons, fingerprints can only be registered in a secure context (HTTPS or Localhost).');
        return;
      }

      if (!window.PublicKeyCredential) {
        alert(language === 'AR' ? 'جهازك أو متصفحك لا يدعم المصادقة البيومترية.' : 'Your device or browser does not support biometric authentication.');
        return;
      }

      const challengeStr = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const challengeBase64 = btoa(challengeStr)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const attResp = await startRegistration({
        optionsJSON: {
          challenge: challengeBase64,
          rp: { name: 'ZINC', id: window.location.hostname },
          user: {
            id: employeeId,
            name: username || 'user',
            displayName: username || 'User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        } as any,
      });

      if (attResp) {
        await employeeRepository.update(employeeId, {
          biometricCredentialId: attResp.id,
          biometricPublicKey: 'MOCKED_PASSKEY_PILOT',
        });
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === employeeId
              ? { ...ws, biometricCredentialId: attResp.id, biometricPublicKey: 'MOCKED_PASSKEY_PILOT' }
              : ws
          )
        );
        
        // Success feedback
        if (typeof window !== 'undefined') {
           const audio = new Audio('/sounds/success.mp3');
           audio.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Failed to register fingerprint', err);
      const { parseWebAuthnError } = await import('../../utils/webAuthnUtils');
      alert(parseWebAuthnError(err, language as any));
    }
  }, [language]);

  return (
    <div className='h-dvh bg-(--bg-page-surface) text-(--text-primary) flex flex-col overflow-hidden select-none'>
      {/* Header */}
      <header
        className='h-12 flex items-center justify-between w-full px-4 sticky top-0 z-50'
        style={{ backgroundColor: 'var(--bg-navbar)' }}
      >
        <div className='min-w-0'>
          <h1 className='text-sm font-bold text-(--text-primary) truncate leading-tight'>
            {t.login.employeePortal}
          </h1>
          <p className='text-[10px] text-(--text-tertiary) font-medium truncate leading-tight'>
            {t.login.manageEmployment}
          </p>
        </div>

        <div className='flex items-center gap-1'>
          <div className='hidden sm:flex flex-col items-end leading-tight'>
            <p className='text-xs font-semibold text-(--text-primary)'>{sessionName}</p>
            <p className='text-[10px] text-primary-500'>{sessionUsername}</p>
          </div>
          <button
            type='button'
            onClick={() => setDrawerOpen((prev) => !prev)}
            className='flex items-center justify-center w-10 h-10 text-(--text-tertiary) hover:text-(--text-primary) transition-colors'
          >
            <Menu size='var(--icon-navbar-mobile)' />
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className='flex-1 min-h-0 overflow-y-auto overscroll-contain'>
        <div className='p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 pb-28 md:pb-6'>
          {view === 'profile' && (
            <EmployeePortalProfile
              profile={profile}
              sessionName={sessionName}
              sessionUsername={sessionUsername}
              requests={requests}
              workspaces={workspaces}
              language={language}
              t={t}
              isLoading={isLoading}
              onUpdateProfile={handleUpdateProfile}
              onUpdateWorkspacePassword={handleUpdateWorkspacePassword}
              onRegisterWorkspaceFingerprint={handleRegisterWorkspaceFingerprint}
            />
          )}

          {view === 'requests' && (
            <section className='space-y-3 sm:space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg sm:text-xl font-semibold text-(--text-primary) flex items-center gap-2'>
                  <Clock className='w-4 h-4 sm:w-5 sm:h-5 text-primary-500' />
                  <span className='truncate'>
                    {t.login?.pendingRequests || 'Pending Employment Requests'}
                  </span>
                </h3>
                {isLoading ? (
                  <span className='text-xs text-(--text-tertiary)'>{t.common.loading}</span>
                ) : (
                  <span
                    className='px-2.5 sm:px-3 py-0.5 bg-(--bg-secondary) rounded-full text-base sm:text-lg font-medium text-(--text-tertiary) shrink-0 leading-none'
                    style={{ fontFamily: 'GraphicSansFont, sans-serif' }}
                  >
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
                isLoading={isLoading}
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
        onOpenDrawer={() => setDrawerOpen((prev) => !prev)}
        language={language}
        t={t}
      />
    </div>
  );
}
