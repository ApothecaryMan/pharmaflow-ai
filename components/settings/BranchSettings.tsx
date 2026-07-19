import type React from 'react';
import { useState } from 'react';
import { PERMISSIONS_MAPPING } from '../../config/permissionsMapping';
import { useAlert, useSettings } from '../../context';
import { getLocationName } from '../../data/locations';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAllEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useBranches } from '../../hooks/queries/useBranchesQuery';
import { queryClient } from '../../context/QueryProvider';
import { queryKeys } from '../../lib/queryKeys';
import { permissionsService } from '../../services/auth/permissionsService';
import { attendanceService } from '../../services/hr/attendanceService';
import { branchService } from '../../services/org/branchService';
import { orgService } from '../../services/org/orgService';
import { useAuthStore } from '../../stores/authStore';
import type { Branch, Employee } from '../../types';
import { MODAL_FOOTER_BTN_CANCEL, MODAL_FOOTER_BTN_PRIMARY } from '../../utils/themeStyles';
import { FilterDropdown } from '../common/FilterDropdown';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SecureGate } from '../common/SecureGate';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput, SmartPhoneInput } from '../common/SmartInputs';
import { Tooltip } from '../common/Tooltip';

interface BranchSettingsProps {
  language: 'EN' | 'AR';
  color?: string;
  onViewChange?: (view: string) => void;
}

// --- Internal Helper Components ---

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, children, className = '', id }) => (
  <div className={className}>
    <span
      htmlFor={id}
      className='block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5'
    >
      {label}
    </span>
    {children}
  </div>
);

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
interface BranchCardProps {
  branch?: Branch;
  employees: Employee[];
  language: 'EN' | 'AR';
  onEdit: (branch: Branch) => void;
  onDelete: (id: string, name: string) => void;
  isSubmitting: boolean;
  isLoading?: boolean;
}

const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  employees,
  language,
  onEdit,
  onDelete,
  isSubmitting,
  isLoading,
}) => {
  const t = TRANSLATIONS[language];
  const maxAvatars = 9;
  const displayEmployees = employees.slice(0, maxAvatars);
  const remainingCount = employees.length - maxAvatars;

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2 shadow-sm min-h-[220px] ${isLoading ? 'animate-pulse' : ''}`}
    >
      <div>
        <div className='flex justify-between items-start mb-3'>
          <div className='flex flex-col min-w-0 space-y-1.5'>
            {isLoading ? (
              <>
                <div className='h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded' />
                <div className='h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded' />
              </>
            ) : (
              <>
                <h3 className='text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate'>
                  {branch?.name}
                </h3>
                <span className='text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5'>
                  CODE: {branch?.code}
                </span>
              </>
            )}
          </div>
          {isLoading ? (
            <div className='h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-full' />
          ) : (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tight shrink-0 ${
                branch?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20'
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full ${branch?.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`}
              />
              {branch?.status === 'active' ? t.settings.active : t.settings.inactive}
            </div>
          )}
        </div>

        {/* Avatar Stack */}
        <div className='flex items-center -space-x-2 mb-4'>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={`avatar-sk-${i}`}
                className='w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900'
              />
            ))
          ) : (
            <>
              {displayEmployees.map((emp, idx) => (
                <Tooltip
                  key={emp.id}
                  delay={0}
                  content={
                    <div className='flex flex-col items-center'>
                      <span className='font-bold'>{emp.name}</span>
                      <span className='text-[8px] uppercase tracking-tighter opacity-70 mt-0.5'>
                        {emp.position || emp.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                  }
                >
                  <div
                    className='w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400 shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden'
                    style={{ zIndex: 10 - idx }}
                  >
                    {emp.image ? (
                      <img
                        src={emp.image}
                        alt={emp.name}
                        className='w-full h-full rounded-full object-cover'
                      />
                    ) : (
                      getInitials(emp.name)
                    )}
                  </div>
                </Tooltip>
              ))}
              {remainingCount > 0 && (
                <div
                  className='w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 shadow-sm'
                  style={{ zIndex: 0 }}
                >
                  +{remainingCount}
                </div>
              )}
              {employees.length === 0 && (
                <div className='w-8 h-8 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-zinc-300 dark:text-zinc-700'>
                  <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
                    group
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className='space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/50'>
          {isLoading ? (
            <>
              <div className='h-3 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded' />
              <div className='h-3 w-2/3 bg-zinc-50 dark:bg-zinc-800/50 rounded' />
            </>
          ) : (
            <>
              <div className='flex items-start gap-2'>
                <span
                  className='material-symbols-rounded text-zinc-400 shrink-0'
                  style={{ fontSize: '16px' }}
                >
                  location_on
                </span>
                <div className='flex flex-col min-w-0'>
                  <span className='text-[11px] text-zinc-950 dark:text-zinc-50 font-bold leading-normal truncate'>
                    {branch?.address || t.settings.noStreetAddress}
                  </span>
                  <span className='text-[10px] text-zinc-500 dark:text-zinc-500 leading-normal truncate'>
                    {[
                      getLocationName(branch?.governorate || '', 'gov', language),
                      getLocationName(branch?.city || '', 'city', language),
                      getLocationName(branch?.area || '', 'area', language),
                    ]
                      .filter(Boolean)
                      .join(language === 'AR' ? '، ' : ', ') || t.settings.noLocationSet}
                  </span>
                </div>
              </div>

              {branch?.phone && (
                <div className='flex items-start gap-2'>
                  <span
                    className='material-symbols-rounded text-zinc-400 shrink-0'
                    style={{ fontSize: '16px' }}
                  >
                    call
                  </span>
                  <span className='text-[11px] text-zinc-950 dark:text-zinc-50 leading-normal font-bold font-mono pt-0.5'>
                    {branch.phone}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className='flex items-center gap-2 mt-auto pt-3'>
        {isLoading ? (
          <>
            <div className='h-8 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg' />
            <div className='h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg' />
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(branch!)}
              className='flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-none'
              type='button'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                edit
              </span>
              {t.common.edit}
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => onDelete(branch?.id, branch?.name)}
              className='p-1.5 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 disabled:opacity-50 cursor-pointer flex items-center justify-center transition-none'
              aria-label='Delete branch'
              type='button'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '22px' }}>
                delete
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const BranchSettings: React.FC<BranchSettingsProps> = ({
  language,
  color = 'primary',
  onViewChange,
}) => {
  const t = TRANSLATIONS[language];
  const refreshAll = useAuthStore((s) => s.refreshAll);
  const { activeBranchId } = useSettings();

  const activeOrgId = orgService.getActiveOrgId();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches(activeOrgId ?? '');
  const { data: employees = [], isLoading: isEmployeesLoading } = useAllEmployees(activeOrgId ?? undefined);
  const isLoading = isBranchesLoading || isEmployeesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeView, setEmployeeView] = useState<'all' | 'selected'>('all');
  const [modalView, setModalView] = useState<'general' | 'employees' | 'attendance'>('general');
  const [error, setError] = useState<string | null>(null);
  const { success, error: showAlertError } = useAlert();

  // ─── Attendance Token State ───
  const [terminalToken, setTerminalToken] = useState<string | null>(null);
  const [isTokenRevealed, setIsTokenRevealed] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const canGenerateToken = permissionsService.can('attendance.generate_token');

  const handleOpenModal = async (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      const branchEmployees = employees.filter((e) => e.branchId === branch.id).map((e) => e.id);
      setSelectedEmployees(branchEmployees);
    } else {
      const newCode = await branchService.generateCode();
      setEditingBranch({
        name: '',
        code: newCode,
        status: 'active',
        governorate: '',
        city: '',
        area: '',
        address: '',
        shiftStartTime: '09:00',
      });
      setSelectedEmployees([]);
    }
    setModalView('general');
    setEmployeeView('all');
    setEmployeeSearchTerm('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingBranch?.name || !editingBranch?.code || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let savedBranch: Branch;
      if (editingBranch.id) {
        if (editingBranch.id === activeBranchId && editingBranch.status === 'inactive') {
          showAlertError(t.settings.cannotDeactivateActive);
          setIsSubmitting(false);
          return;
        }
        savedBranch = await branchService.update(editingBranch.id, editingBranch);
      } else {
        const activeOrgId = orgService.getActiveOrgId();
        if (!activeOrgId) throw new Error('No active organization found');

        savedBranch = await branchService.create({
          ...editingBranch,
          orgId: activeOrgId,
        } as Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>);
      }

      // Move employee assignment logic to service
      await branchService.assignEmployees(savedBranch.id, selectedEmployees);

      success(t.settings.saveSuccess);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.branches });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees });
      await refreshAll();
    } catch (err: any) {
      console.error('Failed to save branch:', err);
      setError(err.message || 'Failed to save branch');
      showAlertError(err.message || 'Failed to save branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deleted duplicate getInitials

  const handleDelete = async (id: string, name: string) => {
    if (id === activeBranchId) {
      showAlertError(t.settings.cannotDeactivateActive);
      return;
    }

    if (window.confirm(`${t.settings.deleteBranchConfirm || 'Are you sure?'} (${name})`)) {
      setIsSubmitting(true);
      try {
        await branchService.update(id, { status: 'inactive' });
        success(t.settings.deactivated);
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.branches });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees });
        await refreshAll();
      } catch (err: any) {
        showAlertError(err.message || 'Failed to delete branch');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- Modal View Components ---

  const renderGeneralView = () => (
    <div className='grid grid-cols-2 gap-5'>
      <FormField label={t.settings.branchName} className='col-span-2' id='branch-name'>
        <SmartInput
          id='branch-name'
          type='text'
          value={editingBranch?.name || ''}
          onChange={(e) => setEditingBranch((prev) => ({ ...prev!, name: e.target.value }))}
          placeholder={t.settings.branchName}
        />
      </FormField>

      <FormField label={t.settings.branchCode} id='branch-code'>
        <SmartInput
          id='branch-code'
          type='text'
          dir='ltr'
          readOnly={!!editingBranch?.id}
          value={editingBranch?.code || ''}
          onChange={(e) =>
            setEditingBranch((prev) => ({
              ...prev!,
              code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
            }))
          }
          placeholder='CODE-000'
          className={editingBranch?.id ? 'opacity-60 cursor-not-allowed' : ''}
        />
      </FormField>

      <FormField label={t.settings.branchStatus}>
        <FilterDropdown<'active' | 'inactive'>
          variant='input'
          items={['active', 'inactive']}
          selectedItem={editingBranch?.status || 'active'}
          onSelect={(status) => setEditingBranch((prev) => ({ ...prev!, status }))}
          keyExtractor={(s) => s}
          renderSelected={(s) => (
            <div className='flex items-center gap-2'>
              <div
                className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`}
              />
              <span className='text-sm font-medium'>
                {s === 'active' ? t.settings.active : t.settings.inactive}
              </span>
            </div>
          )}
          renderItem={(s) => (
            <div className='flex items-center gap-2 py-1'>
              <div
                className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`}
              />
              <span className='text-sm font-medium'>
                {s === 'active' ? t.settings.active : t.settings.inactive}
              </span>
            </div>
          )}
        />
      </FormField>

      <FormField label={t.settings.streetAddress} className='col-span-2' id='branch-address'>
        <SmartInput
          id='branch-address'
          type='text'
          placeholder={t.settings.streetAddressPlaceholder}
          value={editingBranch?.address || ''}
          onChange={(e) => setEditingBranch((prev) => ({ ...prev!, address: e.target.value }))}
        />
      </FormField>

      <FormField label={t.settings.branchPhone} className='col-span-2' id='branch-phone'>
        <SmartPhoneInput
          id='branch-phone'
          placeholder='+20...'
          value={editingBranch?.phone || ''}
          onChange={(val) => setEditingBranch((prev) => ({ ...prev!, phone: val }))}
        />
      </FormField>
    </div>
  );

  const renderEmployeesView = () => {
    const filteredList = employees
      .filter((emp) => employeeView === 'all' || selectedEmployees.includes(emp.id))
      .filter((emp) => {
        const search = employeeSearchTerm.toLowerCase();
        return (
          emp.name.toLowerCase().includes(search) ||
          emp.employeeCode.toLowerCase().includes(search) ||
          emp.nameArabic?.includes(search)
        );
      });

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-zinc-500 uppercase tracking-wider'>
            {t.settings.assignEmployees}
          </span>
          <SegmentedControl
            size='xs'
            value={employeeView}
            onChange={(val) => setEmployeeView(val as 'all' | 'selected')}
            options={[
              { label: t.settings.all, value: 'all', count: employees.length },
              { label: t.settings.selected, value: 'selected', count: selectedEmployees.length },
            ]}
            className='w-44'
          />
        </div>

        <div className='relative'>
          <span
            className='absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-zinc-400'
            style={{ fontSize: '20px' }}
          >
            search
          </span>
          <SmartInput
            type='text'
            value={employeeSearchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmployeeSearchTerm(e.target.value)
            }
            placeholder={t.settings.searchEmployee}
            className='ps-10'
          />
        </div>

        <div className='max-h-[350px] overflow-y-auto pe-1 custom-scrollbar grid grid-cols-1 gap-1'>
          {filteredList.length === 0 ? (
            <div className='py-12 flex flex-col items-center justify-center text-center opacity-40'>
              <span className='material-symbols-rounded text-zinc-400' style={{ fontSize: '40px' }}>
                {employeeView === 'selected' ? 'bookmark_outline' : 'person_search'}
              </span>
              <p className='text-xs text-zinc-500 mt-2 font-medium'>
                {employeeView === 'selected'
                  ? t.settings.noSelectedEmployees
                  : t.settings.noResults}
              </p>
            </div>
          ) : (
            filteredList.map((emp, idx) => {
              const isSelected = selectedEmployees.includes(emp.id);
              const currentBranch = branches.find((b) => b.id === emp.branchId);
              return (
                <MaterialTabs
                  key={emp.id}
                  index={idx}
                  total={filteredList.length}
                  isSelected={isSelected}
                  onClick={() =>
                    isSelected
                      ? setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id))
                      : setSelectedEmployees([...selectedEmployees, emp.id])
                  }
                  className='!h-[54px] !px-3 border border-transparent'
                >
                  <div className='flex items-center w-full gap-3'>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-none shrink-0 ${isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                    >
                      {isSelected ? (
                        <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                          check
                        </span>
                      ) : (
                        getInitials(emp.name)
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-xs font-bold truncate text-zinc-900 dark:text-zinc-100'>
                        {emp.name}
                      </div>
                      <div className='flex items-center gap-1.5 mt-0.5 opacity-60'>
                        <span className='text-[9px] font-bold uppercase tracking-tight text-zinc-500 dark:text-zinc-400'>
                          {emp.role.replace('_', ' ')}
                        </span>
                        {currentBranch && (
                          <>
                            <span className='w-0.5 h-0.5 rounded-full bg-current opacity-30' />
                            <span className='text-[9px] font-bold opacity-70 truncate max-w-[100px] text-zinc-500 dark:text-zinc-400'>
                              {currentBranch.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={isSelected ? 'opacity-100' : 'opacity-20'}>
                      <span
                        className='material-symbols-rounded text-zinc-400'
                        style={{ fontSize: '20px' }}
                      >
                        {isSelected ? 'task_alt' : 'circle'}
                      </span>
                    </div>
                  </div>
                </MaterialTabs>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ─── Attendance Token View ───
  const renderAttendanceView = () => {
    if (!editingBranch?.id) {
      return (
        <div className='py-12 flex flex-col items-center justify-center text-center opacity-40'>
          <span className='material-symbols-rounded text-zinc-400' style={{ fontSize: '40px' }}>
            save
          </span>
          <p className='text-xs text-zinc-500 mt-2 font-medium'>{t.settings.saveFirstForToken}</p>
        </div>
      );
    }

    const handleGenerate = async () => {
      setIsGeneratingToken(true);
      try {
        const token = await attendanceService.generateTerminalToken(editingBranch.id!);
        setTerminalToken(token);
        setIsTokenRevealed(true);
        success(language === 'AR' ? t.attendance.tokenGenerated : t.attendance.tokenGenerated);
      } catch (err: any) {
        showAlertError(err.message || 'Failed to generate token');
      } finally {
        setIsGeneratingToken(false);
      }
    };

    const handleCopy = async () => {
      if (!terminalToken) return;
      try {
        await navigator.clipboard.writeText(terminalToken);
        success(language === 'AR' ? t.attendance.tokenCopied : t.attendance.tokenCopied);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = terminalToken;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success(language === 'AR' ? t.attendance.tokenCopied : t.attendance.tokenCopied);
      }
    };

    return (
      <div className='flex flex-col gap-5'>
        {/* Shift Start Time */}
        <div className='p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center'>
              <span
                className='material-symbols-rounded text-amber-600 dark:text-amber-400'
                style={{ fontSize: '18px' }}
              >
                schedule
              </span>
            </div>
            <div>
              <h4 className='text-xs font-bold text-zinc-900 dark:text-zinc-100'>
                {t.attendance.shiftStartTime}
              </h4>
              <p className='text-[10px] text-zinc-500 dark:text-zinc-400'>
                {t.attendance.shiftStartDesc}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            <input
              type='time'
              value={editingBranch?.shiftStartTime || '09:00'}
              onChange={(e) =>
                setEditingBranch((prev) => ({ ...prev!, shiftStartTime: e.target.value }))
              }
              className='flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold focus:ring-2 focus:ring-(--color-primary) transition-all outline-none'
            />
            <div className='flex flex-col'>
              <span className='text-[10px] font-bold text-zinc-400 uppercase tracking-tighter'>
                {t.settings.current}
              </span>
              <span className='text-xs font-black text-zinc-900 dark:text-zinc-100'>
                {editingBranch?.shiftStartTime || '09:00'}
              </span>
            </div>
            {editingBranch?.id && (
              <button
                onClick={handleSave}
                className='px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all'
                type='button'
              >
                {isSubmitting ? '...' : t.attendance.saveTime}
              </button>
            )}
          </div>
        </div>

        <div className='h-px bg-zinc-100 dark:bg-zinc-800/50' />

        {/* Title */}
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center'>
            <span
              className='material-symbols-rounded text-blue-600 dark:text-blue-400'
              style={{ fontSize: '22px' }}
            >
              fingerprint
            </span>
          </div>
          <div>
            <h3 className='text-sm font-bold text-zinc-900 dark:text-zinc-100'>
              {t.attendance.terminalToken}
            </h3>
            <p className='text-[10px] text-zinc-500 dark:text-zinc-400'>
              {t.attendance.terminalTokenDesc}
            </p>
          </div>
        </div>

        {/* Token Display */}
        {terminalToken ? (
          <div className='space-y-3'>
            {/* Token Value */}
            <div className='relative'>
              <div
                className='w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-sm text-center tracking-wider select-all'
                dir='ltr'
              >
                {isTokenRevealed ? terminalToken : '••••••••-••••-••••-••••-••••••••••••'}
              </div>
              {/* Reveal Toggle */}
              <button
                onClick={() => setIsTokenRevealed(!isTokenRevealed)}
                className='absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer'
                title={isTokenRevealed ? 'Hide' : 'Reveal'}
                type='button'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  {isTokenRevealed ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Copy + Regenerate Buttons */}
            <div className='flex gap-2'>
              <button
                onClick={handleCopy}
                className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer transition-none'
                type='button'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                  content_copy
                </span>
                {t.attendance.copyToken}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGeneratingToken}
                className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50 transition-none'
                type='button'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                  refresh
                </span>
                {t.attendance.regenerateToken}
              </button>
            </div>

            {/* Warning */}
            <p className='text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg px-3 py-2'>
              <span className='material-symbols-rounded shrink-0' style={{ fontSize: '14px' }}>
                warning
              </span>
              {t.attendance.tokenWarning}
            </p>
          </div>
        ) : (
          /* No Token Yet — Generate Button */
          <div className='flex flex-col items-center py-8'>
            <button
              onClick={handleGenerate}
              disabled={isGeneratingToken}
              className='flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50 transition-none shadow-sm'
              type='button'
            >
              {isGeneratingToken ? (
                <span
                  className='material-symbols-rounded animate-spin'
                  style={{ fontSize: '18px' }}
                >
                  progress_activity
                </span>
              ) : (
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  vpn_key
                </span>
              )}
              {t.attendance.generateToken}
            </button>
            <p className='text-[10px] text-zinc-400 mt-3 text-center max-w-xs'>
              {t.attendance.generateTokenHint}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Permission-based Tab Configuration
  const availableTabs = [
    {
      value: 'org-management',
      label: language === 'AR' ? 'إدارة المنظمة' : 'Organization',
      icon: 'corporate_fare',
      permission: PERMISSIONS_MAPPING['org-management'],
    },
    {
      value: 'branch-management',
      label: language === 'AR' ? 'إدارة الفروع' : 'Branches',
      icon: 'domain',
      permission: PERMISSIONS_MAPPING['branch-management'],
    },
  ].filter((tab) => !tab.permission || permissionsService.can(tab.permission));

  // Modal Tabs — add Attendance tab if user can generate tokens
  const modalTabs = [
    { label: t.settings.tabGeneral, value: 'general' },
    { label: t.settings.tabEmployees, value: 'employees' },
    ...(canGenerateToken ? [{ label: t.settings.tabAttendance, value: 'attendance' }] : []),
  ];

  return (
    <SecureGate language={language} storageKey='branch_settings_unlocked'>
      <div className='flex flex-col h-full overflow-hidden'>
        <PageHeader
          centerContent={
            availableTabs.length > 1 ? (
              <SegmentedControl
                options={availableTabs}
                value='branch-management'
                onChange={(val) => onViewChange?.(val as any)}
                size='md'
                iconSize='--icon-lg'
                shape='pill'
                className='w-full sm:w-[480px]'
                useGraphicFont={true}
              />
            ) : null
          }
          rightContent={
            <button
              onClick={() => handleOpenModal()}
              className='flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-none bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer shadow-sm'
              type='button'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                add
              </span>
              {t.settings.addBranch}
            </button>
          }
          dir={language === 'AR' ? 'rtl' : 'ltr'}
          mb='mb-0'
        />

        <div className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <BranchCard
                  key={`branch-card-sk-${i}`}
                  employees={[]}
                  language={language}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isSubmitting={false}
                  isLoading={true}
                />
              ))
            ) : branches.length === 0 ? (
              <div className='col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40'>
                <span
                  className='material-symbols-rounded text-zinc-400'
                  style={{ fontSize: '64px' }}
                >
                  domain_disabled
                </span>
                <h3 className='text-lg font-bold mt-4'>{t.settings.noBranchesYet}</h3>
                <p className='text-sm mt-1'>{t.settings.startAddingFirst}</p>
              </div>
            ) : (
              branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  employees={employees.filter((e) => e.branchId === branch.id)}
                  language={language}
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                  isSubmitting={isSubmitting}
                />
              ))
            )}
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingBranch?.id ? t.settings.branchManagement : t.settings.addBranch}
          className='max-w-xl'
          hideCloseButton={true}
          tabs={modalTabs}
          activeTab={modalView}
          onTabChange={(val) => setModalView(val as 'general' | 'employees' | 'attendance')}
          disabled={isSubmitting}
        >
          <div className='space-y-6 min-h-[400px] py-2'>
            {modalView === 'general'
              ? renderGeneralView()
              : modalView === 'employees'
                ? renderEmployeesView()
                : renderAttendanceView()}

            {error && (
              <div className='p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 mt-4 animate-shake'>
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  error
                </span>
                {error}
              </div>
            )}

            {modalView !== 'attendance' && (
              <div className='flex gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/50 mt-6'>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={MODAL_FOOTER_BTN_CANCEL}
                  type='button'
                >
                  {language === 'AR' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  className={MODAL_FOOTER_BTN_PRIMARY}
                  style={{ backgroundColor: color }}
                  type='button'
                >
                  {isSubmitting ? (
                    <span className='text-[10px] font-bold'>
                      {language === 'AR' ? 'جاري الحفظ...' : 'SAVING...'}
                    </span>
                  ) : (
                    t.settings.saveBranch
                  )}
                </button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </SecureGate>
  );
};
