import type React from 'react';
import { useState } from 'react';
import { DEPARTMENT_ROLES } from '../../config/employeeRoles';
import { TRANSLATIONS } from '../../i18n/translations';
import { supabase } from '../../lib/supabase';
import { useData } from '../../services';
import { authService } from '../../services/auth/authService';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { orgService } from '../../services/org/orgService';
import { BUTTON_BASE } from '../../utils/themeStyles';
import { FilterDropdown } from '../common/FilterDropdown';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { BUTTON_CLOSE_BASE, Modal } from '../common/Modal';
import { SmartInput } from '../common/SmartInputs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

export function HireEmployeeModal({ isOpen, onClose, language }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [department, setDepartment] = useState('pharmacy');
  const [role, setRole] = useState('pharmacist');
  const [branchId, setBranchId] = useState<string | null>(null);

  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { branches } = useData();
  const { playSuccess, playError } = usePosSounds();

  const t = TRANSLATIONS[language as 'EN' | 'AR'].employeeList as any;

  const validRoles = DEPARTMENT_ROLES[department] || [];
  const availableRoles = Object.entries(t.roles || {})
    .filter(([key]) => (validRoles as string[]).includes(key))
    .map(([key, label]) => ({ key, label: label as string }));

  const availableDepartments = Object.entries(t.departments || {}).map(([key, label]) => ({
    key,
    label: label as string,
  }));

  const query = searchQuery.trim();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
  const inputType = !query ? 'none' : isUUID ? 'id' : 'username';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    setError(null);

    try {
      let profile;

      // 1. Validate if user exists
      if (isUUID) {
        profile = await employeeProfileRepository.getById(query);
      } else {
        const formattedUsername = query.startsWith('@') ? query : `@${query}`;
        profile = await employeeProfileRepository.getByUsername(formattedUsername);
      }

      if (!profile) {
        throw new Error(language === 'AR' ? 'المستخدم غير موجود' : 'User not found');
      }

      // 2. Get current admin/sender info
      const currentUser = await authService.getCurrentUser();
      const senderName = currentUser?.employeeName || '';

      // 3. Get org name (from admin's context — has RLS access)
      const orgId = orgService.getActiveOrgId();
      if (!orgId) throw new Error('No active organization');

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();
      const orgName = org?.name || '';

      // 4. Send Employment Request
      const res = await employmentRequestRepository.sendRequest({
        orgId,
        orgName,
        targetUsername: profile.username,
        role: role,
        branchId: branchId === 'UNASSIGNED' ? undefined : branchId,
        sentByName: senderName,
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      setSuccess(true);
      playSuccess();

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setDepartment('pharmacy');
    setRole('pharmacist');
    setBranchId(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={language === 'AR' ? 'تعيين عبر المعرف أو اسم المستخدم' : 'Hire via ID or Username'}
      icon='person_add'
      size='sm'
      bodyClassName='p-1.5'
    >
      <div className='flex flex-col gap-2'>
        {success ? (
          <div className='text-center py-8'>
            <div className='w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='material-symbols-rounded text-emerald-500 text-3xl'>
                check_circle
              </span>
            </div>
            <h3 className='text-xl font-bold text-emerald-500 mb-2'>
              {language === 'AR' ? 'تم إرسال الطلب بنجاح!' : 'Request Sent Successfully!'}
            </h3>
            <p className='text-zinc-400'>
              {language === 'AR'
                ? 'لقد تم إرسال طلب التوظيف. ننتظر موافقة الموظف.'
                : 'The employment request has been sent. Waiting for employee approval.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
            {error && (
              <div className='p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg mx-1.5 mt-1.5'>
                {error}
              </div>
            )}

            <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50'>
              <div className='flex flex-col gap-1'>
                <label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors'>
                  <span
                    className={
                      inputType === 'username'
                        ? 'text-blue-500'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }
                  >
                    {language === 'AR' ? 'اسم المستخدم' : 'Username'}
                  </span>
                  <span className='text-zinc-400 dark:text-zinc-500'>
                    {language === 'AR' ? 'أو' : 'or'}
                  </span>
                  <span
                    className={
                      inputType === 'id' ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'
                    }
                  >
                    {language === 'AR' ? 'المعرف (ID)' : 'ID'}
                  </span>
                </label>
                <SmartInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                  placeholder={language === 'AR' ? '@username أو المعرف' : '@username or ID'}
                  autoFocus
                  required
                  className='!py-1.5'
                />
              </div>
            </div>

            <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-3'>
              <div className='grid grid-cols-2 gap-2'>
                <div className='flex flex-col gap-1'>
                  <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                    {t.department}
                  </label>
                  <FilterDropdown
                    className='w-full z-30'
                    minHeight={34}
                    items={availableDepartments}
                    selectedItem={availableDepartments.find((d) => d.key === department)}
                    isOpen={isDepartmentOpen}
                    onToggle={() => {
                      setIsDepartmentOpen(!isDepartmentOpen);
                      setIsRoleOpen(false);
                      setIsBranchOpen(false);
                    }}
                    onSelect={(item) => {
                      setDepartment(item.key);
                      setIsDepartmentOpen(false);
                    }}
                    renderItem={(item) => <span>{item.label}</span>}
                    renderSelected={(item) => <span>{item?.label || t.department}</span>}
                    keyExtractor={(item) => item.key}
                    variant='input'
                    dense={true}
                    onBackground={true}
                  />
                </div>

                <div className='flex flex-col gap-1'>
                  <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                    {t.role}
                  </label>
                  <FilterDropdown
                    className='w-full z-20'
                    minHeight={34}
                    items={availableRoles}
                    selectedItem={availableRoles.find((r) => r.key === role)}
                    isOpen={isRoleOpen}
                    onToggle={() => {
                      setIsRoleOpen(!isRoleOpen);
                      setIsDepartmentOpen(false);
                      setIsBranchOpen(false);
                    }}
                    onSelect={(item) => {
                      setRole(item.key);
                      setIsRoleOpen(false);
                    }}
                    renderItem={(item) => <span>{item.label}</span>}
                    renderSelected={(item) => <span>{item?.label || t.role}</span>}
                    keyExtractor={(item) => item.key}
                    variant='input'
                    dense={true}
                    onBackground={true}
                  />
                </div>
              </div>

              <div className='w-full h-px bg-zinc-200 dark:bg-zinc-800/50' />

              <div className='flex flex-col gap-1'>
                <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                  {t.branch}
                </label>
                <FilterDropdown
                  className='w-full z-10'
                  minHeight={34}
                  items={[
                    { key: 'UNASSIGNED', label: t.unassigned },
                    ...branches.map((b) => ({ key: b.id, label: b.name })),
                  ]}
                  selectedItem={
                    [
                      { key: 'UNASSIGNED', label: t.unassigned },
                      ...branches.map((b) => ({ key: b.id, label: b.name })),
                    ].find((b) => b.key === branchId) || { key: 'UNASSIGNED', label: t.unassigned }
                  }
                  isOpen={isBranchOpen}
                  onToggle={() => {
                    setIsBranchOpen(!isBranchOpen);
                    setIsDepartmentOpen(false);
                    setIsRoleOpen(false);
                  }}
                  onSelect={(item) => {
                    setBranchId(item.key);
                    setIsBranchOpen(false);
                  }}
                  renderItem={(item) => <span>{item.label}</span>}
                  renderSelected={(item) => <span>{item?.label || t.branch}</span>}
                  keyExtractor={(item) => item.key}
                  variant='input'
                  dense={true}
                  onBackground={true}
                />
              </div>
            </div>

            <div className='bg-blue-500 rounded-lg p-2.5 flex items-start gap-2 mt-1 shadow-sm'>
              <span className='material-symbols-rounded text-white text-[16px] shrink-0 mt-0.5'>
                info
              </span>
              <p className='text-white text-[11px] leading-relaxed font-medium'>
                {language === 'AR'
                  ? 'بمجرد إرسال الطلب، سيظهر للموظف في حسابه الشخصي. لن يتم إضافته فعلياً للفرع إلا بعد قبوله للدعوة.'
                  : 'Once sent, the employee will see this request in their dashboard. They will not be officially added until they accept the invitation.'}
              </p>
            </div>

            <div className='flex gap-1.5 mt-2'>
              <button
                type='submit'
                disabled={isLoading || !searchQuery.trim()}
                className='flex-1 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-lg transition-all uppercase tracking-widest hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed cursor-pointer flex items-center justify-center'
              >
                {isLoading ? (
                  <span className='animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mx-auto block' />
                ) : language === 'AR' ? (
                  'إرسال الطلب'
                ) : (
                  'Send Request'
                )}
              </button>
              <button
                type='button'
                onClick={handleClose}
                className='px-4 py-1.5 bg-transparent text-zinc-500 dark:text-zinc-400 text-xs font-black rounded-lg transition-all uppercase tracking-widest border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer'
              >
                {language === 'AR' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
