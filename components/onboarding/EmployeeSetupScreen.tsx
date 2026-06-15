import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { getRoleLabel, SYSTEM_ROLES } from '../../config/employeeRoles';
import { useSettings } from '../../context';
import { usePersistedState } from '../../hooks/common/usePersistedState';
import { TRANSLATIONS } from '../../i18n/translations';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/auth/authService';
import { employeeService } from '../../services/hr/employeeService';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { branchService } from '../../services/org/branchService';
import { orgService } from '../../services/org/orgService';
import { FilterDropdown } from '../common/FilterDropdown';
import { SmartInput, SmartPasswordInput } from '../common/SmartInputs';
import { RoleIcon } from '../hr/RoleIcon';
import { OnboardingStepper } from './OnboardingStepper';

const CountdownTimer = ({ expiresAt, language }: { expiresAt: string; language: 'EN' | 'AR' }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const t = TRANSLATIONS[language].employeeSetup;

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(t.expired);
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
  }, [expiresAt, language, t.expired]);

  return (
    <div
      dir='ltr'
      className='text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg inline-block border border-zinc-200 dark:border-zinc-700/50'
    >
      {timeLeft}
    </div>
  );
};

// Roles allowed during initial setup
const ONBOARDING_ROLES = SYSTEM_ROLES.filter((r) =>
  ['pharmacist_owner', 'admin', 'pharmacist_manager'].includes(r.id)
);

interface EmployeeSetupScreenProps {
  language: 'EN' | 'AR';
  color: string;
  onBack: () => void;
  onComplete?: () => void;
}

type SetupPhase = 'invite' | 'waiting' | 'setup';

export const EmployeeSetupScreen: React.FC<EmployeeSetupScreenProps> = ({
  language,
  color,
  onBack,
  onComplete,
}) => {
  const { theme } = useSettings();
  const activeColor = theme.hex || color;
  const isRTL = language === 'AR';
  const t = TRANSLATIONS[language].employeeSetup;

  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [phase, setPhase] = usePersistedState<SetupPhase>('employee_setup_phase', 'invite');

  // Phase 1 State
  const [targetUser, setTargetUser] = usePersistedState('employee_setup_target', '');
  const [role, setRole] = useState<'admin' | 'pharmacist_manager' | 'pharmacist_owner'>(
    'pharmacist_owner'
  );
  const selectedRole = ONBOARDING_ROLES.find((r) => r.id === role) || ONBOARDING_ROLES[0];
  const [expiresIn, setExpiresIn] = useState<number | null>(null); // null = unlimited, 1 = 1 hour, 24 = 1 day

  // Phase 2 State
  const [requestId, setRequestId] = usePersistedState<string | null>(
    'employee_setup_request_id',
    null
  );
  const [requestExpiresAt, setRequestExpiresAt] = usePersistedState<string | null>(
    'employee_setup_expires_at',
    null
  );

  // Phase 3 State
  const [acceptedEmployee, setAcceptedEmployee] = usePersistedState<any | null>(
    'employee_setup_accepted_employee',
    null
  );
  const [localPassword, setLocalPassword] = useState('');
  const [confirmLocalPassword, setConfirmLocalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize: fetch branch + validate persisted waiting state against DB
  useEffect(() => {
    const initialize = async () => {
      // Fetch active branch
      let branch = await branchService.getActive();
      if (!branch) {
        const all = await branchService.getAll();
        branch = all[0];
      }
      if (branch) {
        setActiveBranchId(branch.id);
      }

      // Validate persisted waiting state:
      // If localStorage says we're waiting, verify the request still exists and is pending
      if (phase === 'waiting' && requestId) {
        const { data } = await supabase
          .from('employment_requests')
          .select('status, expires_at')
          .eq('id', requestId)
          .maybeSingle();

        if (!data || data.status !== 'pending') {
          // Request was deleted, accepted, or rejected while we were away
          setRequestId(null);
          setTargetUser('');
          setRequestExpiresAt(null);
          setPhase('invite');
        } else {
          setRequestExpiresAt(data.expires_at);
        }
      }
    };
    initialize();
  }, []);

  // Realtime Subscription + Fallback Polling for Phase 2
  useEffect(() => {
    if (phase !== 'waiting' || !requestId) return;

    const handleAccepted = async (targetUserId: string) => {
      const activeOrgId = orgService.getActiveOrgId();
      if (!activeOrgId) return;
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('auth_user_id', targetUserId)
        .maybeSingle();
      if (empData) {
        setAcceptedEmployee(empData);
        setPhase('setup');
        // Clear persisted waiting state on success
        setRequestId(null);
        setTargetUser('');
        setRequestExpiresAt(null);
      }
    };

    const handleRejected = () => {
      setRequestId(null);
      setTargetUser('');
      setRequestExpiresAt(null);
      setPhase('invite');
      setError(t.invitationRejected);
    };

    // Realtime channel (primary, instant)
    const channel = supabase
      .channel(`employment_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employment_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'accepted') handleAccepted(payload.new.target_user_id);
          else if (newStatus === 'rejected') handleRejected();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'employment_requests',
          filter: `id=eq.${requestId}`,
        },
        () => {
          setRequestId(null);
          setTargetUser('');
          setRequestExpiresAt(null);
          setPhase('invite');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase, requestId, isRTL]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetUser.trim()) {
      setError(t.pleaseEnterUsername);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Find user by username or email
      let profile = await employeeProfileRepository.getByUsername(targetUser.trim().toLowerCase());
      if (!profile) {
        const { data } = await supabase
          .from('employee_profiles')
          .select('*')
          .eq('email', targetUser.trim().toLowerCase())
          .maybeSingle();
        if (data) profile = data as any;
      }

      if (!profile) {
        setError(t.userNotFound);
        setIsLoading(false);
        return;
      }

      const currentUser = authService.getCurrentUserSync();

      // FORBID inviting the current user (Organization Owner)
      if (profile.id === currentUser?.userId) {
        setError(t.cannotInviteSelf);
        setIsLoading(false);
        return;
      }

      const activeOrgId = orgService.getActiveOrgId();
      if (!activeOrgId) throw new Error('Active organization not found');

      // 2. Get sender and org info
      const sessionUser = await authService.getCurrentUser();
      const senderName = sessionUser?.employeeName || '';
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', activeOrgId)
        .single();
      const orgName = org?.name || '';

      // 3. Send request
      const res = await employmentRequestRepository.sendRequest({
        orgId: activeOrgId,
        orgName,
        sentByName: senderName,
        branchId: activeBranchId,
        targetUsername: profile.username,
        role: role,
        expiresInHours: expiresIn || undefined,
      });

      if (!res.success) {
        setError(res.message || 'Failed to send invite');
        setIsLoading(false);
        return;
      }

      const newRequestId = res.data?.id;

      // 3. Go to waiting phase
      setRequestId(newRequestId || null);
      setRequestExpiresAt(res.data?.expiresAt || null);
      setPhase('waiting');
    } catch (err: any) {
      setError(err.message || t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!requestId) return;
    setIsLoading(true);
    try {
      const success = await employmentRequestRepository.cancelRequest(requestId);
      if (success) {
        setRequestId(null);
        setTargetUser(''); // Reset the form
        setRequestExpiresAt(null);
        setPhase('invite');
      } else {
        setError(t.failedToCancel);
      }
    } catch (err: any) {
      setError(err.message || 'Error cancelling request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupLocalCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!localPassword || !confirmLocalPassword) {
      setError(t.fillRequiredFields);
      return;
    }

    if (localPassword !== confirmLocalPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }

    if (localPassword.length < 4) {
      setError(t.passwordLength);
      return;
    }

    setIsLoading(true);
    try {
      const { hashPassword } = await import('../../services/auth/hashUtils');
      const passwordHash = await hashPassword(localPassword);

      // Update employee with password
      await employeeService.update(acceptedEmployee.id, { password: passwordHash });

      // Clear setup state
      setPhase('invite');
      setAcceptedEmployee(null);
      setLocalPassword('');
      setConfirmLocalPassword('');

      // Finalize and trigger soft transition
      if (onComplete) {
        onComplete();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Failed to setup local credentials:', err);
      setError(err.message || t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 py-8 overflow-y-auto ${isRTL ? 'font-arabic' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className='max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 my-auto relative'>
        <button
          type='button'
          onClick={onBack}
          className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md border border-white/20`}
          title={t.goBack}
        >
          <span className='material-symbols-rounded text-2xl'>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>

        <div
          className='p-6 relative overflow-hidden'
          style={{
            backgroundColor: activeColor,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))`,
          }}
        >
          <div className='absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]'></div>

          <div className='relative z-10 flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white'>
                <span className='material-symbols-rounded text-2xl'>manage_accounts</span>
              </div>
              <h2 className='text-white text-xl font-bold font-display mb-1 flex items-center gap-2'>
                {t.accountSetup}
              </h2>
            </div>
            <div className={`scale-90 ${isRTL ? 'origin-left' : 'origin-right'}`}>
              <OnboardingStepper currentStep={3} language={language} />
            </div>
          </div>

          <p className='text-white/80 relative z-10 text-xs font-medium bg-black/10 p-2.5 rounded-xl border border-white/10'>
            {t.inviteAdminInstructions}
          </p>
        </div>

        <div className='p-8 space-y-4'>
          {error && (
            <div className='p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2'>
              <span className='material-symbols-rounded text-lg'>error</span>
              {error}
            </div>
          )}

          {phase === 'invite' && (
            <form onSubmit={handleSendInvite} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                  {t.globalEmailOrUsername}
                  <span className='text-red-500 ml-1'>*</span>
                </label>
                <SmartInput
                  required
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder={t.emailExample}
                  style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                />
                <p className='text-[10px] text-zinc-500 mt-1'>{t.autoAcceptNote}</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                  {t.role}
                </label>
                <FilterDropdown
                  className='w-full'
                  variant='input'
                  floating
                  minHeight='42px'
                  items={ONBOARDING_ROLES as any}
                  selectedItem={selectedRole}
                  onSelect={(item: any) => setRole(item.id)}
                  keyExtractor={(item: any) => item.id}
                  renderSelected={(item) => (
                    <div className='flex items-center gap-3'>
                      <RoleIcon
                        role={item?.id}
                        className='material-symbols-rounded text-xl text-zinc-500 dark:text-zinc-400'
                      />
                      {getRoleLabel(item.id, TRANSLATIONS[language].employeeList.roles)}
                    </div>
                  )}
                  renderItem={(item: any) => (
                    <div className='flex items-center gap-3 py-1'>
                      <RoleIcon
                        role={item.id}
                        className='material-symbols-rounded text-xl text-zinc-400'
                      />
                      <span className='text-zinc-700 dark:text-zinc-300'>
                        {getRoleLabel(item.id, TRANSLATIONS[language].employeeList.roles)}
                      </span>
                    </div>
                  )}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                  {t.expirationTime}
                </label>
                <div className='grid grid-cols-3 gap-2'>
                  <button
                    type='button'
                    onClick={() => setExpiresIn(1)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${expiresIn === 1 ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
                  >
                    {t.oneHour}
                  </button>
                  <button
                    type='button'
                    onClick={() => setExpiresIn(24)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${expiresIn === 24 ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
                  >
                    {t.oneDay}
                  </button>
                  <button
                    type='button'
                    onClick={() => setExpiresIn(null)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${expiresIn === null ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
                  >
                    {t.noLimit}
                  </button>
                </div>
              </div>

              <div className='pt-2'>
                <button
                  type='submit'
                  disabled={isLoading || !targetUser.trim()}
                  className='w-full py-3.5 px-4 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-2'
                  style={{ backgroundColor: activeColor }}
                >
                  {isLoading ? (
                    <svg
                      className='animate-spin h-5 w-5 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                  ) : (
                    <>
                      <span className='ml-2 mr-2'>{t.sendInvitation}</span>
                      <span
                        className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}
                      >
                        send
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {phase === 'waiting' && (
            <div className='pt-2 pb-0 animate-fade-in flex flex-col items-center justify-center text-center'>
              <div className='relative mb-6 mt-4 flex items-center justify-center'>
                <span
                  className='material-symbols-rounded animate-pulse'
                  style={{ color: activeColor, fontSize: '120px' }}
                >
                  schedule_send
                </span>
              </div>

              {/* Linear Loading Bar */}
              <style>{`
                @keyframes loadingBar {
                  0% { left: -35%; width: 35%; }
                  100% { left: 100%; width: 35%; }
                }
              `}</style>
              <div className='w-48 h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 mb-4 relative'>
                <div
                  className='absolute top-0 h-full rounded-full'
                  style={{
                    backgroundColor: activeColor,
                    animation: 'loadingBar 1.5s infinite ease-in-out',
                  }}
                ></div>
              </div>

              <h3 className='font-medium text-sm text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-2 flex-wrap mb-4'>
                <span>
                  {t.waitingForAcceptance}{' '}
                  <span dir='ltr' className='inline-block mx-1 text-zinc-700 dark:text-zinc-300'>
                    {targetUser}
                  </span>
                </span>
              </h3>

              {requestExpiresAt && (
                <div className='mb-8 flex flex-row items-center justify-center gap-2'>
                  <span className='text-sm font-medium text-zinc-500'>{t.invitationExpiresIn}</span>
                  <CountdownTimer expiresAt={requestExpiresAt} language={language} />
                </div>
              )}
              {!requestExpiresAt && <div className='mb-8' />}

              <button
                type='button'
                onClick={handleCancelInvite}
                disabled={isLoading}
                className='flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 group'
              >
                {isLoading && (
                  <span className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                )}
                {t.cancelInvitation}
              </button>
            </div>
          )}

          {phase === 'setup' && acceptedEmployee && (
            <form onSubmit={handleSetupLocalCredentials} className='space-y-4 animate-fade-in'>
              <div className='p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 mb-6 flex items-center gap-4'>
                <div className='w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-lg text-zinc-500'>
                  {acceptedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className='font-bold text-zinc-900 dark:text-zinc-100'>
                    {acceptedEmployee.name}
                  </h3>
                  <p className='text-xs text-zinc-500 font-medium mt-0.5 uppercase tracking-wider'>
                    {getRoleLabel(acceptedEmployee.role, TRANSLATIONS[language].employeeList.roles)}
                  </p>
                </div>
                <div className='ml-auto mr-auto px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider'>
                  {t.accepted}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                  {t.localUsernameAuto}
                </label>
                <div className='relative'>
                  <span className='absolute top-1/2 -translate-y-1/2 left-3 material-symbols-rounded text-zinc-400'>
                    badge
                  </span>
                  <input
                    readOnly
                    value={acceptedEmployee.username || acceptedEmployee.employee_code}
                    className='w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold tracking-wider cursor-not-allowed opacity-70'
                  />
                  <p className='mt-2 text-xs text-zinc-500 flex items-start gap-1'>
                    <span className='material-symbols-rounded text-[14px]'>info</span>
                    {t.quickLoginNote}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'>
                    {t.localPassword}
                    <span className='text-red-500 ml-1'>*</span>
                  </label>
                  <div className='relative'>
                    <SmartPasswordInput
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={localPassword}
                      onChange={(val) => setLocalPassword(val)}
                      className={isRTL ? 'pl-10' : 'pr-10'}
                      style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none`}
                    >
                      <span className='material-symbols-rounded text-xl'>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 text-ellipsis overflow-hidden whitespace-nowrap'>
                    {t.confirmPassword}
                    <span className='text-red-500 ml-1'>*</span>
                  </label>
                  <div className='relative'>
                    <SmartPasswordInput
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmLocalPassword}
                      onChange={(val) => setConfirmLocalPassword(val)}
                      className={isRTL ? 'pl-10' : 'pr-10'}
                      style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none`}
                    >
                      <span className='material-symbols-rounded text-xl'>
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className='pt-2'>
                <button
                  type='submit'
                  disabled={isLoading || !localPassword || !confirmLocalPassword}
                  className='w-full py-3.5 px-4 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-2'
                  style={{ backgroundColor: activeColor }}
                >
                  {isLoading ? (
                    <svg
                      className='animate-spin h-5 w-5 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                  ) : (
                    <>
                      <span className='ml-2 mr-2'>{t.finishAndSave}</span>
                      <span
                        className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}
                      >
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
