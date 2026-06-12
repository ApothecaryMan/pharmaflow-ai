import React, { useState, useEffect, useCallback } from 'react';
import { SmartInput, SmartPasswordInput } from '../common/SmartInputs';
import { FilterDropdown } from '../common/FilterDropdown';
import { useSettings } from '../../context';
import { employeeService } from '../../services/hr/employeeService';
import { authService } from '../../services/auth/authService';
import { branchService } from '../../services/org/branchService';
import { orgService } from '../../services/org/orgService';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { RoleIcon } from '../hr/RoleIcon';
import { OnboardingStepper } from './OnboardingStepper';
import { supabase } from '../../lib/supabase';

import { SYSTEM_ROLES, getRoleLabel } from '../../config/employeeRoles';
import { TRANSLATIONS } from '../../i18n/translations';

// Roles allowed during initial setup
const ONBOARDING_ROLES = SYSTEM_ROLES.filter(r =>
  ['pharmacist_owner', 'admin', 'pharmacist_manager'].includes(r.id)
);

interface EmployeeSetupScreenProps {
  language: 'EN' | 'AR';
  color: string;
  onBack: () => void;
  onComplete?: () => void;
}

type SetupPhase = 'invite' | 'waiting' | 'setup';

export const EmployeeSetupScreen: React.FC<EmployeeSetupScreenProps> = ({ language, color, onBack, onComplete }) => {
  const { theme } = useSettings();
  const activeColor = theme.hex || color;
  const isRTL = language === 'AR';

  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [phase, setPhase] = useState<SetupPhase>('invite');

  // Phase 1 State
  const [targetUser, setTargetUser] = useState('');
  const [role, setRole] = useState<'admin' | 'pharmacist_manager' | 'pharmacist_owner'>('pharmacist_owner');
  const selectedRole = ONBOARDING_ROLES.find(r => r.id === role) || ONBOARDING_ROLES[0];

  // Phase 2 State
  const [requestId, setRequestId] = useState<string | null>(null);

  // Phase 3 State
  const [acceptedEmployee, setAcceptedEmployee] = useState<any | null>(null);
  const [localPassword, setLocalPassword] = useState('');
  const [confirmLocalPassword, setConfirmLocalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch active branch on mount
  useEffect(() => {
    const fetchBranch = async () => {
      let branch = await branchService.getActive();
      if (!branch) {
        const all = await branchService.getAll();
        branch = all[0];
      }
      if (branch) {
        setActiveBranchId(branch.id);
      }
    };
    fetchBranch();
  }, []);

  // Polling for Phase 2
  useEffect(() => {
    if (phase !== 'waiting' || !requestId) return;
    let failCount = 0;

    const checkStatus = async () => {
      try {
        const { data } = await supabase.from('employment_requests').select('*').eq('id', requestId).maybeSingle();
        if (data && data.status === 'accepted') {
          const activeOrgId = orgService.getActiveOrgId();
          if (!activeOrgId) return;
          
          const { data: empData } = await supabase.from('employees').select('*').eq('org_id', activeOrgId).eq('auth_user_id', data.target_user_id).maybeSingle();
          if (empData) {
            setAcceptedEmployee(empData);
            setPhase('setup');
          }
        }
        failCount = 0;
      } catch (err) {
        failCount++;
        console.error(`Failed to poll request status (attempt ${failCount})`, err);
        if (failCount >= 20) {
          setError(isRTL ? 'حدث خطأ في الاتصال. يرجى تحديث الصفحة.' : 'Connection error. Please refresh the page.');
        }
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [phase, requestId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetUser.trim()) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم' : 'Please enter Email or Username');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Find user by username or email
      let profile = await employeeProfileRepository.getByUsername(targetUser.trim().toLowerCase());
      if (!profile) {
        const { data } = await supabase.from('employee_profiles').select('*').eq('email', targetUser.trim().toLowerCase()).maybeSingle();
        if (data) profile = data as any;
      }

      if (!profile) {
        setError(isRTL ? 'المستخدم غير موجود. يجب عليه إنشاء حساب أولاً.' : 'User not found. They must create an account first.');
        setIsLoading(false);
        return;
      }

      const currentUser = authService.getCurrentUserSync();

      // FORBID inviting the current user (Organization Owner)
      if (profile.id === currentUser?.userId) {
        setError(isRTL
          ? 'لا يمكنك دعوة حساب الإدارة. يرجى إرسال الدعوة إلى حساب موظف منفصل.'
          : 'Cannot invite the admin account. Please invite a separate employee account.'
        );
        setIsLoading(false);
        return;
      }

      const activeOrgId = orgService.getActiveOrgId();
      if (!activeOrgId) throw new Error('Active organization not found');

      // 2. Send request
      const res = await employmentRequestRepository.sendRequest({
        orgId: activeOrgId,
        branchId: activeBranchId,
        targetUsername: profile.username,
        role: role
      });

      if (!res.success) {
        setError(res.message || 'Failed to send invite');
        setIsLoading(false);
        return;
      }

      const newRequestId = res.data?.id;

      // 3. Go to waiting phase
      setRequestId(newRequestId || null);
      setPhase('waiting');
    } catch (err: any) {
      setError(err.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupLocalCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!localPassword || !confirmLocalPassword) {
      setError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (localPassword !== confirmLocalPassword) {
      setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (localPassword.length < 4) {
      setError(isRTL ? 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل' : 'Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { hashPassword } = await import('../../services/auth/hashUtils');
      const passwordHash = await hashPassword(localPassword);

      // Update employee with password
      await employeeService.update(acceptedEmployee.id, { password: passwordHash });

      // Finalize and trigger soft transition
      if (onComplete) {
        onComplete();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Failed to setup local credentials:', err);
      setError(err.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 py-8 overflow-y-auto ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 my-auto relative">

        <button
          type="button"
          onClick={onBack}
          className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md border border-white/20`}
          title={isRTL ? 'الرجوع' : 'Go Back'}
        >
          <span className="material-symbols-rounded text-2xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>

        <div
          className="p-6 relative overflow-hidden"
          style={{
            backgroundColor: activeColor,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))`
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]"></div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <span className="material-symbols-rounded text-2xl">manage_accounts</span>
              </div>
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'إعداد الحساب' : 'Account Setup'}
              </h1>
            </div>
            <div className={`scale-90 ${isRTL ? 'origin-left' : 'origin-right'}`}>
              <OnboardingStepper currentStep={3} language={language} />
            </div>
          </div>

          <p className="text-white/80 relative z-10 text-xs font-medium bg-black/10 p-2.5 rounded-xl border border-white/10">
            {isRTL
              ? 'الخطوة ٣: قم بدعوة مدير الفرع للبدء في استخدام النظام.'
              : 'Step 3: Invite the first admin for this branch to start using the system.'}
          </p>
        </div>

        <div className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">error</span>
              {error}
            </div>
          )}

          {phase === 'invite' && (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRTL ? 'البريد الإلكتروني أو اسم المستخدم العالمي' : 'Global Email or Username'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <SmartInput
                  required
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder={isRTL ? 'مثال: ahmed@email.com' : 'e.g. ahmed@email.com'}
                  style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {isRTL ? 'إذا قمت بإدخال بريدك الحالي، سيتم قبول الدعوة تلقائياً.' : 'If you enter your current email, the invite will auto-accept.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRTL ? 'الصلاحية' : 'Role'}
                </label>
                <FilterDropdown
                  className="w-full"
                  variant="input"
                  floating
                  minHeight="42px"
                  items={ONBOARDING_ROLES as any}
                  selectedItem={selectedRole}
                  onSelect={(item: any) => setRole(item.id)}
                  keyExtractor={(item: any) => item.id}
                  renderSelected={(item) => (
                    <div className="flex items-center gap-3">
                      <RoleIcon
                        role={item?.id}
                        className="material-symbols-rounded text-xl text-zinc-500 dark:text-zinc-400"
                      />
                      {getRoleLabel(item.id, TRANSLATIONS[language].employeeList.roles)}
                    </div>
                  )}
                  renderItem={(item: any) => (
                    <div className="flex items-center gap-3 py-1">
                      <RoleIcon
                        role={item.id}
                        className="material-symbols-rounded text-xl text-zinc-400"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {getRoleLabel(item.id, TRANSLATIONS[language].employeeList.roles)}
                      </span>
                    </div>
                  )}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !targetUser.trim()}
                  className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-2"
                  style={{ backgroundColor: activeColor }}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <span className="ml-2 mr-2">{isRTL ? 'إرسال الدعوة' : 'Send Invitation'}</span>
                      <span className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}>
                        send
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {phase === 'waiting' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-zinc-100 dark:border-zinc-800" />
                <span className="material-symbols-rounded absolute inset-0 flex items-center justify-center text-2xl text-zinc-400">mail</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                  {isRTL ? 'في انتظار القبول...' : 'Waiting for acceptance...'}
                </h3>
                <p className="text-sm text-zinc-500 mt-1 max-w-[250px] mx-auto">
                  {isRTL ? 'تم إرسال الدعوة. يرجى الانتظار حتى يقوم المستخدم بقبولها من حسابه.' : 'Invitation sent. Please wait until the user accepts it from their account.'}
                </p>
              </div>
            </div>
          )}

          {phase === 'setup' && acceptedEmployee && (
            <form onSubmit={handleSetupLocalCredentials} className="space-y-4 animate-fade-in">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-lg text-zinc-500">
                  {acceptedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{acceptedEmployee.name}</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5 uppercase tracking-wider">{getRoleLabel(acceptedEmployee.role, TRANSLATIONS[language].employeeList.roles)}</p>
                </div>
                <div className="ml-auto mr-auto px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                  {isRTL ? 'تم القبول' : 'Accepted'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRTL ? 'اسم المستخدم المحلي (تلقائي)' : 'Local Username (Auto)'}
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 left-3 material-symbols-rounded text-zinc-400">badge</span>
                  <input
                    readOnly
                    value={acceptedEmployee.username || acceptedEmployee.employee_code}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold tracking-wider cursor-not-allowed opacity-70"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                  {isRTL ? 'هذا هو الرمز الموحد للدخول السريع الخاص بالفرع. لا يمكن تغييره.' : 'This is the unified quick login code for the branch. It cannot be changed.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isRTL ? 'كلمة المرور المحلية' : 'Local Password'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <SmartPasswordInput
                      type={showPassword ? "text" : "password"}
                      required
                      value={localPassword}
                      onChange={(val) => setLocalPassword(val)}
                      className={isRTL ? "pl-10" : "pr-10"}
                      style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none`}
                    >
                      <span className="material-symbols-rounded text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 text-ellipsis overflow-hidden whitespace-nowrap">
                    {isRTL ? 'تأكيد المرور' : 'Confirm'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <SmartPasswordInput
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmLocalPassword}
                      onChange={(val) => setConfirmLocalPassword(val)}
                      className={isRTL ? "pl-10" : "pr-10"}
                      style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none`}
                    >
                      <span className="material-symbols-rounded text-xl">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !localPassword || !confirmLocalPassword}
                  className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-2"
                  style={{ backgroundColor: activeColor }}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <span className="ml-2 mr-2">{isRTL ? 'إنهاء وحفظ' : 'Finish & Save'}</span>
                      <span className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}>
                        check_circle
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
