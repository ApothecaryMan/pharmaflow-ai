import React, { useState } from 'react';
import { SmartInput, SmartPasswordInput } from '../common/SmartInputs';
import { FilterDropdown } from '../common/FilterDropdown';
import { useSettings } from '../../context';
import { employeeService } from '../../services/hr/employeeService';
import { authService } from '../../services/auth/authService';
import { branchService } from '../../services/branchService';
import { RoleIcon } from '../hr/RoleIcon';
import { OnboardingStepper } from './OnboardingStepper';

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
}

export const EmployeeSetupScreen: React.FC<EmployeeSetupScreenProps> = ({ language, color, onBack }) => {
  const { theme } = useSettings();
  // Read active branch synchronously — this screen renders outside DataProvider
  // Read active branch synchronously — this screen renders outside DataProvider
  const activeBranch = branchService.getActive() || branchService.getAll()[0];
  const activeBranchId = activeBranch?.id || branchService.getAll()[0]?.id || '';
  
  const activeColor = theme.hex || color;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'pharmacist_manager' | 'pharmacist_owner'>('pharmacist_owner');
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedRole = ONBOARDING_ROLES.find(r => r.id === role) || ONBOARDING_ROLES[0];
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !username.trim() || !password || !confirmPassword) {
      setError(language === 'AR' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'AR' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(language === 'AR' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { hashPassword } = await import('../../services/auth/hashUtils');
      const passwordHash = await hashPassword(password);
      
      const newEmployee: any = {
        id: '', 
        branchId: activeBranchId,
        employeeCode: '', 
        name: name.trim(),
        username: username.trim(),
        password: passwordHash,
        role: role,
        orgRole: 'owner', 
        position: role === 'pharmacist_owner' ? 'Owner' : 'Admin',
        department: 'pharmacy',
        phone: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
      };
      
      const { orgService } = await import('../../services/org/orgService');
      const activeOrgId = orgService.getActiveOrgId();

      // 1. Create the employee
      const created = await employeeService.create(newEmployee, activeBranchId, activeOrgId);

      // 2. Claim the organization (Architectural Polish: Atomic-like sequencing)
      try {
        if (activeOrgId) {
          await orgService.claimOrganization(activeOrgId, created.id);
        }
      } catch (claimErr) {
        // Log but don't strictly block if org claiming fails locally, 
        // though in production this should be a transaction.
        console.warn('Organization claim failed, but employee created:', claimErr);
      }

      // 3. Auto-login (Professional touch: Login directly after registration)
      try {
        await authService.login(username.trim(), password);
      } catch (loginErr) {
        console.warn('Auto-login failed, user will need to log in manually:', loginErr);
      }

      // 4. Finalize and reload
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to setup employee:', err);
      setError(err.message || (isRTL ? 'حدث خطأ أثناء إنشاء الحساب' : 'An error occurred during account creation'));
      setIsLoading(false);
    }
  };

  const isRTL = language === 'AR';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 py-8 overflow-y-auto ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 my-auto relative">
        
        <button
          type="button"
          onClick={onBack}
          className={`absolute top-8 ${isRTL ? 'right-6' : 'left-6'} z-50 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md border border-white/20`}
          title={isRTL ? 'الرجوع' : 'Go Back'}
        >
          <span className="material-symbols-rounded text-2xl">
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </span>
        </button>

        <div 
          className="p-10 text-center relative overflow-hidden"
          style={{ 
            backgroundColor: activeColor,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1))` 
          }}
        >
          {/* Subtle pattern or glow */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent)]"></div>

          <div className="mb-6 flex justify-center relative z-10">
            <span 
              className="material-symbols-rounded text-white"
              style={{ fontSize: '72px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
            >
              manage_accounts
            </span>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 relative z-10">
            {isRTL ? 'إعداد حساب المدير' : 'Create Admin Account'}
          </h1>
          
          <OnboardingStepper currentStep={3} language={language} />
          
          <p className="text-white/80 relative z-10 text-sm">
            {isRTL 
              ? 'يرجى إنشاء حساب المدير الأول للفرع. ستستخدم هذه البيانات لتسجيل الدخول.' 
              : 'Please set up the first admin account for this branch. You will use this to sign in.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">error</span>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isRTL ? 'الاسم بالكامل' : 'Full Name'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRTL ? 'مثال: أحمد محمد' : 'e.g. Ahmed Ali'}
              style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
            />
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

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isRTL ? 'اسم المستخدم (للدخول)' : 'Username'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <SmartInput
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder={isRTL ? 'مثال: ahmed123' : 'e.g. ahmed123'}
              style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                {isRTL ? 'كلمة المرور' : 'Password'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <SmartPasswordInput
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(val) => setPassword(val)}
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
                {isRTL ? 'تأكيد كلمة المرور' : 'Confirm'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <SmartPasswordInput
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(val) => setConfirmPassword(val)}
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
              disabled={isLoading || !name.trim() || !username.trim() || !password || !confirmPassword}
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
                  <span className="ml-2 mr-2">{isRTL ? 'إنشاء الحساب و الدخول' : 'Create & Enter'}</span>
                  <span className={`material-symbols-rounded text-lg ${isRTL ? 'rotate-180' : ''}`}>
                    login
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
