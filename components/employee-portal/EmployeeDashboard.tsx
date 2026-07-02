import { startRegistration } from '@simplewebauthn/browser';
import { Clock, Download, Menu } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useUpdateCheck } from '../../hooks/infrastructure/useUpdateCheck';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import { employeeRepository } from '../../services/hr/repositories/employeeRepository';
import { useSettings } from '../../context';
import type { UserProfile } from '../../types';
import { ContextMenuProvider } from '../common/ContextMenu';
import { EmployeeMobileDock } from './EmployeeMobileDock';
import { EmployeeSideDrawer } from './EmployeeSideDrawer';
import { useEmployeeDashboardData } from './hooks/useEmployeeDashboardData';
import { lazy, Suspense } from 'react';
import { PageLoader } from '../common/PageLoader';

const EmployeePortalProfile = lazy(() => import('./EmployeePortalProfile').then(m => ({ default: m.EmployeePortalProfile })));
const EmploymentRequestsList = lazy(() => import('./EmploymentRequestsList').then(m => ({ default: m.EmploymentRequestsList })));
const PrescriptionPricing = lazy(() => import('./PrescriptionPricing').then(m => ({ default: m.default })));

type EmployeeView = 'profile' | 'requests' | 'pricing';

interface Props {
  view?: EmployeeView;
  onViewChange?: (view: EmployeeView) => void;
  onLogout?: () => void;
}

export function EmployeeDashboard({
  view = 'requests',
  onViewChange,
  onLogout,
}: Props) {
  const { language } = useSettings();
  const t = TRANSLATIONS[language];
  const session = authService.getCurrentUserSync();
  const { profile, requests, workspaces, isLoading, loadData, updateProfile, actionRequest } =
    useEmployeeDashboardData();
  const { hasUpdate, updateInfo, performUpdate } = useUpdateCheck();

  // Clean fallback for view if it's not profile/requests (e.g. from appState 'landing')
  const activeView =
    view === 'profile' || view === 'requests' || view === 'pricing' ? view : 'requests';

  const [drawerOpen, setDrawerOpen] = useState(false);

  const sessionUsername = session?.username;
  const sessionName = session?.employeeName || profile?.fullName;


  // Always delegate to the centralized logout handler (useAuth.handleLogout)
  // to ensure React state, storage, and Supabase session are all properly cleaned up
  const handleSignOut = useCallback(async () => {
    if (onLogout) {
      await onLogout();
    }
  }, [onLogout]);

  const handleViewChange = useCallback(
    (v: EmployeeView) => {
      if (onViewChange) {
        onViewChange(v as any);
      }
    },
    [onViewChange]
  );

  const handleUpdateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        await updateProfile(updates);
      } catch (err) {
        console.error(err);
      }
    },
    [updateProfile]
  );

  const handleActionRequest = useCallback(
    async (id: string, action: 'accepted' | 'rejected') => {
      try {
        await actionRequest(id, action);
      } catch (error) {
        console.error('Failed to action request:', error);
        throw error;
      }
    },
    [actionRequest]
  );

  const handleUpdateWorkspacePassword = useCallback(
    async (employeeId: string, newPassword: string) => {
      try {
        const { hashPassword } = await import('../../services/auth/hashUtils');
        const passwordHash = await hashPassword(newPassword);
        await employeeRepository.update(employeeId, { password: passwordHash });
        loadData(true);
      } catch (err) {
        console.error('Failed to update workspace password', err);
        throw err;
      }
    },
    [loadData]
  );

  const handleRegisterWorkspaceFingerprint = useCallback(
    async (employeeId: string, username: string) => {
      try {
        if (!window.isSecureContext) {
          alert(
            language === 'AR'
              ? 'لأسباب أمنية، لا يمكن تسجيل البصمة إلا في بيئة آمنة (HTTPS أو Localhost).'
              : 'For security reasons, fingerprints can only be registered in a secure context (HTTPS or Localhost).'
          );
          return;
        }

        if (!window.PublicKeyCredential) {
          alert(
            language === 'AR'
              ? 'جهازك أو متصفحك لا يدعم المصادقة البيومترية.'
              : 'Your device or browser does not support biometric authentication.'
          );
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
          loadData(true);

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
    },
    [language, loadData]
  );

  return (
    <ContextMenuProvider enableGlassEffect={false}>
      <div className='h-dvh bg-(--bg-page-surface) text-(--text-primary) flex flex-col overflow-hidden select-none'>
        {/* Header */}
        <header
          className={`h-12 flex items-center justify-between w-full px-4 sticky top-0 z-50 ${activeView === 'pricing' ? 'max-lg:hidden' : ''}`}
          style={{ backgroundColor: 'var(--bg-navbar)' }}
        >
          <div className='flex items-center gap-2.5 min-w-0'>
            <img
              src='/app_icon_black.svg'
              className='block dark:hidden w-8 h-8 object-contain shrink-0'
              alt='Zinc'
            />
            <img
              src='/app_icon.svg'
              className='hidden dark:block w-8 h-8 object-contain shrink-0'
              alt='Zinc'
            />
            <div>
              <h1 className='text-sm font-bold text-(--text-primary) truncate leading-tight'>
                {t.login.employeePortal}
              </h1>
              <p className='text-[10px] text-(--text-tertiary) font-medium truncate leading-tight'>
                {t.login.manageEmployment}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1'>
            <div className='hidden sm:flex flex-col items-end leading-tight'>
              <p className='text-xs font-semibold text-(--text-primary)'>{sessionName}</p>
              <p className='text-[10px] text-primary-500'>{sessionUsername}</p>
            </div>
            {hasUpdate && (
              <button
                type='button'
                onClick={performUpdate}
                className='flex items-center justify-center w-10 h-10 text-primary-500 hover:text-primary-400 animate-pulse transition-colors'
                title={
                  updateInfo?.version ? `Update to v${updateInfo.version}` : 'Update available'
                }
              >
                <Download size='var(--icon-navbar-mobile)' />
              </button>
            )}
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
          <div className='p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 pb-28 md:pb-6 relative min-h-[200px]'>
            <Suspense fallback={<PageLoader />}>
              {activeView === 'pricing' && <PrescriptionPricing />}

              {activeView === 'profile' && (
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

              {activeView === 'requests' && (
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
            </Suspense>
          </div>
        </main>

        {/* Side Drawer */}
        <EmployeeSideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeView={activeView}
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
          activeView={activeView}
          onViewChange={handleViewChange}
          onOpenDrawer={() => setDrawerOpen((prev) => !prev)}
          language={language}
          t={t}
        />
      </div>
    </ContextMenuProvider>
  );
}
