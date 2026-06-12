import React, { useState, useEffect, useMemo } from 'react';
import { Modal, BUTTON_CLOSE_BASE } from '../common/Modal';
import { FilterDropdown } from '../common/FilterDropdown';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { SmartEmailInput, SmartInput, SmartPhoneInput } from '../common/SmartInputs';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { permissionsService } from '../../services/auth/permissionsService';
import { authService } from '../../services/auth/authService';
import { idGenerator } from '../../utils/idGenerator';
import { DEPARTMENT_ROLES } from '../../config/employeeRoles';
import { BUTTON_BASE, INPUT_BASE, PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import type { Branch, Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { renderBanner, BANNER_STYLES } from '../../utils/banners';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (finalData: Partial<Employee>) => Promise<void>;
  employeesListToCheck: Employee[];
  branches: Branch[];
  availableDepartments: { key: string; label: string }[];
  language: string;
  color: string;
  t: typeof TRANSLATIONS.EN.employeeList;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  employeesListToCheck,
  branches,
  availableDepartments,
  language,
  color,
  t,
}) => {
  // Sounds
  const { playSuccess, playError, playBeep } = usePosSounds();

  // --- States ---
  const [formData, setFormData] = useState<Partial<Employee> & { oldPassword?: string }>({});

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'documents'>('general');

  // Dropdown open states
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Password & Reset States
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [wantsToChangePassword, setWantsToChangePassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Link Global Account States
  const [linkUsername, setLinkUsername] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Initialize form data when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
    } else {
      setFormData({
        department: 'pharmacy',
        role: 'pharmacist',
        status: 'active',
      });
    }
    setActiveTab('general');
    setIsOldPasswordVerified(false);
    setPasswordError('');
    setWantsToChangePassword(false);
    setIsResetting(false);
    setIsSaving(false);
  }, [employee, isOpen]);

  // Dependency Matrix: Filter Roles based on Selected Department
  const availableRoles = useMemo(() => {
    const selectedDept = formData.department || 'pharmacy';
    const validRoles = DEPARTMENT_ROLES[selectedDept] || [];

    return Object.entries(t.roles)
      .filter(([key]) => (validRoles as string[]).includes(key))
      .map(([key, label]) => ({ key, label: label as string }));
  }, [t.roles, formData.department]);

  // Auto-Correction: Clear invalid role when department changes
  useEffect(() => {
    if (!formData.department) return;

    const validRoles = DEPARTMENT_ROLES[formData.department] || [];
    if (formData.role && !validRoles.includes(formData.role)) {
      setFormData((prev) => ({ ...prev, role: undefined }));
    }
  }, [formData.department]);

  // Tab Options for Modal Header
  const employeeTabOptions = useMemo(() => {
    return [
      {
        value: 'general',
        label: t.tabs.general,
        icon: 'person',
      },
      {
        value: 'credentials',
        label: t.tabs.credentials,
        icon: 'lock',
      },
      {
        value: 'documents',
        label: t.tabs.documents,
        icon: 'description',
      },
    ].filter(
      (opt) =>
        (opt.value !== 'credentials' || (formData.role || 'pharmacist') !== 'officeboy') &&
        (opt.value !== 'documents' || !formData.userId)
    );
  }, [t.tabs, formData.role, formData.userId]);

  const handleClose = () => {
    onClose();
    setFormData({});
    setIsDepartmentOpen(false);
    setIsRoleOpen(false);
    setIsStatusOpen(false);
    setIsBranchOpen(false);
    setActiveTab('general');
    setIsOldPasswordVerified(false);
    setPasswordError('');
    setWantsToChangePassword(false);
    setIsResetting(false);
    setIsSaving(false);
    setLinkUsername('');
    setLinkError('');
    setIsLinking(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      playError();
      return; // Validation failed
    }

    // Check for duplicate username
    if (formData.username && formData.username.trim().length > 0) {
      const username = formData.username.trim().toLowerCase();
      const isDuplicate = employeesListToCheck.some(
        (emp) =>
          emp.id !== employee?.id && emp.username && emp.username.toLowerCase() === username
      );

      if (isDuplicate) {
        playError();
        alert(t.usernameTaken);
        return;
      }
    }

    // Validate endDate is not before startDate
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      playError();
      alert(language === 'AR' ? 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البداية' : 'End date cannot be before start date');
      return;
    }

    // Secure Password Hashing
    let hashedPassword = employee?.password; // Default: keep existing password

    const hasNoPassword = employee && !employee.password;

    // Only process password if user explicitly wants to change it
    if (wantsToChangePassword && formData.password && formData.password.trim().length > 0) {
      const { hashPassword } = await import('../../services/auth/hashUtils');

      // Safety check: must have verified old password first
      if (employee && employee.password && !isOldPasswordVerified) {
        playError();
        return; // Should not happen if UI is followed correctly
      }

      hashedPassword = await hashPassword(formData.password);
    } else if ((!employee || hasNoPassword) && formData.password && formData.password.trim().length > 0) {
      // New employee or existing employee with no password: hash the password directly
      const { hashPassword } = await import('../../services/auth/hashUtils');
      hashedPassword = await hashPassword(formData.password);
    }

    const finalFormData = {
      ...formData,
      password: hashedPassword,
    };

    setIsSaving(true);
    try {
      await onSave(finalFormData);
      playSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to save employee', error);
      playError();
    } finally {
      setIsSaving(false);
    }
  };
  const handleLinkAccount = async () => {
    if (!employee?.id || !linkUsername.trim()) return;
    setIsLinking(true);
    setLinkError('');
    try {
      const { employeeRepository } = await import('../../services/hr/repositories/employeeRepository');
      const updatedEmployee = await employeeRepository.linkGlobalAccount(employee.id, linkUsername.trim());
      setFormData((prev) => ({
        ...prev,
        userId: updatedEmployee.userId,
        username: updatedEmployee.username,
      }));
      setLinkUsername('');
      playSuccess();
    } catch (err: any) {
      console.error('Failed to link account', err);
      setLinkError(err.message || (language === 'AR' ? 'فشل الربط. تأكد من صحة الحساب.' : 'Failed to link account. Verify username/ID.'));
      playError();
    } finally {
      setIsLinking(false);
    }
  };

  const getBannerStyleByDepartment = (dept: string) => {
    switch (dept) {
      case 'pharmacy': return 'pharma';
      case 'it': return 'cyberhex';
      case 'hr': return 'abstract';
      case 'sales': return 'synthwave';
      case 'logistics': return 'chaos';
      case 'marketing': return 'floral';
      default: return 'pattern';
    }
  };

  const bannerStyle = getBannerStyleByDepartment(formData.department || 'pharmacy');
  const activeBanner = BANNER_STYLES.find((b) => b.id === bannerStyle);
  const bannerAccent = activeBanner?.accentColor || 'var(--primary-500)';

  const isInvited = !!formData.userId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={employee ? t.editEmployee : t.addEmployee}
      tabs={employeeTabOptions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      icon='badge'
      size='2xl'
      height='80vh'
      hideCloseButton={true}
      bodyClassName="p-0 bg-(--bg-card)"
      style={
        {
          '--bg-card': `color-mix(in srgb, ${bannerAccent} 12%, var(--bg-card-base))`,
          border: '4px solid transparent',
          backgroundImage: `linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, ${bannerAccent}, var(--modal-border-gradient-end))`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
          boxShadow: 'none',
          '--primary-500': bannerAccent,
          '--primary-600': `color-mix(in srgb, ${bannerAccent} 85%, black)`,
          '--primary-400': `color-mix(in srgb, ${bannerAccent} 85%, white)`,
          '--primary-300': `color-mix(in srgb, ${bannerAccent} 60%, white)`,
        } as React.CSSProperties
      }
      footer={
        <div className='flex items-center justify-end gap-3'>
          <button
            onClick={handleClose}
            className={`${BUTTON_CLOSE_BASE} px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg font-medium`}
          >
            {t.modal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${BUTTON_BASE} px-8 py-2.5 text-(--text-primary) font-bold flex items-center justify-center gap-2 min-w-[120px]`}
          >
            {isSaving ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-(--text-primary) border-t-transparent" />
                {language === 'AR' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              t.modal.save
            )}
          </button>
        </div>
      }
    >
      <>
        <div className="animate-fade-in text-(--text-primary)">
          {/* Banner Graphic with Selectable Cover styles */}
          <div className="relative w-full aspect-[9/3] bg-(--bg-secondary) overflow-hidden select-none group/cover">
            {renderBanner(bannerStyle, { x: 0, y: 0 }, 1.2)}

            {/* Dynamic Cover Customizer Buttons */}
            <div className="absolute top-3 end-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 z-20">
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider select-none pe-1">
                {language === 'AR' ? 'نمط الغلاف:' : 'Cover Style:'}
              </span>
              {[
                { dept: 'pharmacy', color: '#0d9488', label: language === 'AR' ? 'صيدلي' : 'Pharma' },
                { dept: 'sales', color: '#ec4899', label: language === 'AR' ? 'نيون' : 'Synthwave' },
                { dept: 'hr', color: '#8b5cf6', label: language === 'AR' ? 'تجريدي' : 'Abstract' },
                { dept: 'it', color: '#10b981', label: language === 'AR' ? 'سيبر شبكي' : 'Cyberhex' },
                { dept: 'logistics', color: '#f97316', label: language === 'AR' ? 'تموجات' : 'Chaos' },
                { dept: 'marketing', color: '#f43f5e', label: language === 'AR' ? 'ورود' : 'Floral' },
              ].map((opt) => (
                <button
                  key={opt.dept}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, department: opt.dept as any }));
                    playBeep();
                  }}
                  className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-125 ${formData.department === opt.dept
                      ? 'border-white scale-110 shadow-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  style={{ backgroundColor: opt.color }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Content Section below banner */}
          <div className="relative px-6 pb-6 pt-20">
            {/* Overlapping Avatar */}
            <div className="absolute -top-16 start-6 z-10">
              <div className="relative group/avatar">
                <div className="w-32 h-32 rounded-full border-4 border-(--bg-card) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center relative">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt={formData.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-900/50 text-gray-500 dark:bg-zinc-900/50 text-4xl font-bold">
                      {getInitials(formData.name || '') === '?' || !formData.name?.trim() ? (
                        <span className="material-symbols-rounded text-3xl">photo_camera</span>
                      ) : (
                        getInitials(formData.name)
                      )}
                    </div>
                  )}

                  {/* Upload Image Overlay */}
                  {!isInvited && (
                    <label
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-[2px] border border-white/10"
                      title={t.changePhoto}
                    >
                      <span className="material-symbols-rounded text-white text-xl">photo_camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              playError();
                              alert(
                                language === 'AR'
                                  ? 'حجم الصورة كبير جداً (الحد الأقصى 500KB)'
                                  : 'Image too large (max 500KB)'
                              );
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData((prev) => ({ ...prev, image: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Remove Image Button */}
                {!isInvited && formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: undefined }))}
                    className={`absolute -top-1 -end-1 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 text-gray-400 hover:text-red-500 shadow-md flex items-center justify-center z-20`}
                    title={t.removePhoto}
                  >
                    <span className="material-symbols-rounded text-[14px] font-bold">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Identity Live Preview Section next to avatar */}
          </div>
        </div>

        {/* Main Form Area */}
        <div className="px-6 pb-6 space-y-6">
          {activeTab === 'general' ? (
            <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
              {/* General Info Card */}
              <div className={`${PROFILE_GLASS_CARD_BASE} p-5 space-y-5`}>
                <div className='grid grid-cols-12 gap-x-4 gap-y-5'>
                  {/* Row 1: Names (EN + AR) */}
                  {!isInvited && (
                    <div className='col-span-6 space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.name}
                      </label>
                      <SmartInput
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t.name}
                        autoFocus
                        className={INPUT_BASE}
                        required
                        disabled={isInvited}
                      />
                    </div>
                  )}
                  {!isInvited && (
                    <div className='col-span-6 space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.nameArabicLabel}
                      </label>
                      <SmartInput
                        value={formData.nameArabic || ''}
                        onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                        placeholder={t.nameArabicPlaceholder}
                        className={INPUT_BASE}
                        dir='rtl'
                        disabled={isInvited}
                      />
                    </div>
                  )}

                  {/* Row 2: Branch + Dept + Role + Status */}
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.branch}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={branches.map(b => ({ key: b.id, label: b.name }))}
                        selectedItem={branches.map(b => ({ key: b.id, label: b.name })).find(b => b.key === formData.branchId) || { key: 'UNASSIGNED', label: t.unassigned }}
                        isOpen={isBranchOpen}
                        onToggle={() => {
                          setIsBranchOpen(!isBranchOpen);
                          setIsDepartmentOpen(false);
                          setIsRoleOpen(false);
                          setIsStatusOpen(false);
                        }}
                        onSelect={(item) => {
                          setFormData({ ...formData, branchId: item.key as any });
                          setIsBranchOpen(false);
                        }}
                        renderItem={(item) => <span className='text-sm'>{item.label}</span>}
                        renderSelected={(item) => (
                          <span className='text-sm'>
                            {item?.label || t.branch}
                          </span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.department}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={availableDepartments}
                        selectedItem={availableDepartments.find(
                          (d) => d.key === (formData.department || 'pharmacy')
                        )}
                        isOpen={isDepartmentOpen}
                        onToggle={() => {
                          setIsDepartmentOpen(!isDepartmentOpen);
                          setIsBranchOpen(false);
                          setIsRoleOpen(false);
                          setIsStatusOpen(false);
                        }}
                        onSelect={(item) => {
                          setFormData({ ...formData, department: item.key as any });
                          setIsDepartmentOpen(false);
                        }}
                        renderItem={(item) => <span className='text-sm'>{item.label}</span>}
                        renderSelected={(item) => (
                          <span className='text-sm'>
                            {item?.label || t.department}
                          </span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.role}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={availableRoles}
                        selectedItem={availableRoles.find(
                          (r) => r.key === (formData.role || 'pharmacist')
                        )}
                        isOpen={isRoleOpen}
                        onToggle={() => {
                          setIsRoleOpen(!isRoleOpen);
                          setIsBranchOpen(false);
                          setIsDepartmentOpen(false);
                          setIsStatusOpen(false);
                        }}
                        onSelect={(item) => {
                          const newRole = item.key as any;
                          setFormData({ ...formData, role: newRole });
                          setIsRoleOpen(false);
                        }}
                        renderItem={(item) => <span className='text-sm'>{item.label}</span>}
                        renderSelected={(item) => (
                          <span className='text-sm'>{item?.label || t.role}</span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.status}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={Object.entries(t.statusOptions)
                          .filter(([key]) => key !== 'all')
                          .map(([key, label]) => ({ key, label: label as string }))}
                        selectedItem={Object.entries(t.statusOptions)
                          .map(([key, label]) => ({ key, label: label as string }))
                          .find((s) => s.key === (formData.status || 'active'))}
                        isOpen={isStatusOpen}
                        onToggle={() => {
                          setIsStatusOpen(!isStatusOpen);
                          setIsBranchOpen(false);
                          setIsDepartmentOpen(false);
                          setIsRoleOpen(false);
                        }}
                        onSelect={(item) => {
                          const newStatus = item.key as Employee['status'];
                          const updates: Partial<Employee> = { status: newStatus };
                          if (newStatus === 'inactive' && formData.status !== 'inactive') {
                            updates.endDate = new Date().toISOString().split('T')[0];
                          }
                          if (formData.status === 'inactive' && newStatus !== 'inactive') {
                            updates.endDate = undefined;
                          }
                          setFormData({ ...formData, ...updates });
                          setIsStatusOpen(false);
                        }}
                        renderItem={(item) => <span className='text-sm'>{item.label}</span>}
                        renderSelected={(item) => (
                          <span className='text-sm'>{item?.label || t.status}</span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>

                  {/* Row 3: End Date (shown when status is inactive) */}
                  {formData.status === 'inactive' && (
                    <div className='col-span-12'>
                      <div className='grid grid-cols-6 gap-x-4'>
                        <div className='col-span-2 space-y-1.5'>
                          <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                            {t.endDate || (language === 'AR' ? 'تاريخ الانتهاء' : 'End Date')}
                          </label>
                          <SmartInput
                            type='date'
                            value={formData.endDate || ''}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className={INPUT_BASE}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 4: Position + Phone + Email */}
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.position}
                    </label>
                    <SmartInput
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder={t.position}
                      className={INPUT_BASE}
                    />
                  </div>
                  {!isInvited && (
                    <div className='col-span-4 space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.phone}
                      </label>
                      <SmartPhoneInput
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        placeholder={t.phone}
                        className={INPUT_BASE}
                        disabled={isInvited}
                      />
                    </div>
                  )}
                  {!isInvited && (
                    <div className='col-span-4 space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.email}
                      </label>
                      <SmartEmailInput
                        value={formData.email || ''}
                        onChange={(val) => setFormData({ ...formData, email: val })}
                        placeholder={t.email}
                        className={INPUT_BASE}
                        disabled={isInvited}
                      />
                    </div>
                  )}

                  {/* Row 4: Salary + Notes */}
                  {(permissionsService.can('reports.view_financial') || permissionsService.can('users.manage')) && (
                    <div className='col-span-4 space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.salary}
                      </label>
                      <div className='relative'>
                        <SmartInput
                          value={formData.salary || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, salary: Number(e.target.value) })
                          }
                          placeholder='0.00'
                          type='number'
                          className={`${INPUT_BASE} uppercase font-bold tracking-widest pl-9`}
                        />
                        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium'>
                          $
                        </span>
                      </div>
                    </div>
                  )}
                  <div className={(permissionsService.can('reports.view_financial') || permissionsService.can('users.manage')) ? 'col-span-8 space-y-1.5' : 'col-span-12 space-y-1.5'}>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.notes}
                    </label>
                    <SmartInput
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t.notesPlaceholder}
                      className={INPUT_BASE}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'credentials' ? (
            <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
              {/* Credentials Card */}
              <div className={`${PROFILE_GLASS_CARD_BASE} p-5 space-y-4`}>
                <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                  <span
                    className='material-symbols-rounded text-primary-500'
                    style={{ fontSize: 'var(--icon-base)' }}
                  >
                    lock
                  </span>
                  <h3 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                    {t.username || 'Login Credentials'}
                  </h3>
                </div>

                <div className='grid grid-cols-2 gap-4 pt-4'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.username}
                    </label>
                    <SmartInput
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder={t.usernamePlaceholder}
                      className={INPUT_BASE}
                      disabled={isInvited}
                    />
                  </div>
                  {/* Biometric Setup Section */}
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.passkey}
                    </label>
                    <button
                      type='button'
                      onClick={async () => {
                        try {
                          // SECURITY CHECK: If passkey exists, verify identity first
                          if (formData.biometricCredentialId) {
                            let isVerified = false;

                            // 1. Try Biometric Verification first
                            try {
                              const { startAuthentication } = await import('@simplewebauthn/browser');
                              const { generateChallenge, bufferToBase64 } = await import('../../utils/webAuthnUtils');
                              const challengeBase64 = bufferToBase64(generateChallenge());

                              const asseResp = await startAuthentication({
                                optionsJSON: {
                                  challenge: challengeBase64,
                                  rpId: window.location.hostname,
                                  allowCredentials: [{
                                    id: formData.biometricCredentialId,
                                    type: 'public-key',
                                    transports: ['internal'],
                                  }],
                                  userVerification: 'required',
                                } as any,
                              });
                              if (asseResp) isVerified = true;
                            } catch (authErr) {
                              console.log('Biometric verification skipped or failed, falling back to password');
                            }

                            // 2. Fallback to Password
                            if (!isVerified) {
                              const pass = prompt(t.confirmPasswordPrompt);
                              if (!pass) return;

                              const { verifyPassword } = await import('../../services/auth/hashUtils');
                              const currentHashedPassword = employee?.password || formData.password;

                              if (currentHashedPassword) {
                                const isValid = await verifyPassword(pass, currentHashedPassword);
                                if (!isValid) {
                                  playError();
                                  alert(t.incorrectPassword);
                                  return;
                                }
                                isVerified = true;
                              } else {
                                isVerified = true;
                              }
                            }

                            if (isVerified) {
                              if (confirm(t.deletePasskeyConfirm)) {
                                setFormData({
                                  ...formData,
                                  biometricCredentialId: undefined,
                                  biometricPublicKey: undefined
                                });
                                playSuccess();
                                return;
                              }
                            }
                            return;
                          }

                          // WebAuthn Setup for NEW registration
                          const { startRegistration } = await import('@simplewebauthn/browser');
                          const {
                            generateChallenge,
                            bufferToBase64,
                            isWebAuthnSupported,
                          } = await import('../../utils/webAuthnUtils');

                          if (!(await isWebAuthnSupported())) {
                            alert(t.passkeyUnsupported);
                            return;
                          }

                          const challengeBuffer = generateChallenge();
                          const challengeBase64 = bufferToBase64(challengeBuffer);
                          const employeeId = formData.id || idGenerator.uuid();

                          const publicKeyCredentialCreationOptions = {
                            challenge: challengeBase64,
                            rp: { name: 'ZINC', id: window.location.hostname },
                            user: {
                              id: employeeId,
                              name: formData.username || formData.name || 'user',
                              displayName: formData.name || 'User',
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
                          };

                          const registrationOptions: any = {
                            ...publicKeyCredentialCreationOptions,
                          };

                          const attResp = await startRegistration({
                            optionsJSON: {
                              ...registrationOptions,
                              challenge: challengeBase64,
                              user: { ...registrationOptions.user, id: employeeId },
                            } as any,
                          });

                          if (attResp) {
                            setFormData({
                              ...formData,
                              id: employeeId,
                              biometricCredentialId: attResp.id,
                              biometricPublicKey: 'MOCKED_PASSKEY_PILOT',
                            });
                            playSuccess();
                          }
                        } catch (err: any) {
                          console.error('Passkey registration failed', err);
                          const { parseWebAuthnError } = await import('../../utils/webAuthnUtils');
                          playError();
                          alert(parseWebAuthnError(err, language as any));
                        }
                      }}
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${formData.biometricCredentialId
                          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800/30 dark:text-green-400'
                          : 'border-(--border-divider) text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-neutral)'
                        }`}
                    >
                      <span
                        className={`material-symbols-rounded ${formData.biometricCredentialId ? 'text-green-500' : ''}`}
                        style={{ fontSize: 'var(--icon-lg)' }}
                      >
                        {formData.biometricCredentialId ? 'fingerprint_check' : 'fingerprint'}
                      </span>
                      {formData.biometricCredentialId ? t.passkeySet : t.setupPasskey}
                    </button>
                  </div>
                </div>

                {/* Link Global Account Section */}
                {employee && !formData.userId && (
                  <div className='mt-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3'>
                    <div className='flex items-center gap-2'>
                      <span className='material-symbols-rounded text-blue-500'>link</span>
                      <h4 className='text-sm font-bold text-blue-500'>
                        {language === 'AR' ? 'ربط بحساب عالمي' : 'Link Global Account'}
                      </h4>
                    </div>
                    <p className='text-xs text-blue-600/80 leading-relaxed font-medium'>
                      {language === 'AR' 
                        ? 'هذا الموظف ليس لديه حساب عالمي. أدخل اسم المستخدم (@username) أو المعرف (ID) الخاص به لربط مبيعاته وسجلاته بحسابه الجديد.'
                        : "This employee doesn't have a global account. Enter their Global @Username or ID to link their legacy records to their new account."}
                    </p>
                    <div className='flex items-center gap-2 mt-2'>
                       <SmartInput
                         value={linkUsername}
                         onChange={(e) => setLinkUsername(e.target.value)}
                         placeholder={language === 'AR' ? '@username أو المعرف' : '@username or ID'}
                         className="flex-1 !py-2 bg-white dark:bg-zinc-900 border-blue-500/20 focus-within:border-blue-500/50"
                       />
                       <button
                         type="button"
                         onClick={handleLinkAccount}
                         disabled={isLinking || !linkUsername.trim()}
                         className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors hover:bg-blue-600 active:scale-95"
                       >
                         {isLinking ? (
                            <span className="animate-spin material-symbols-rounded text-[16px]">sync</span>
                         ) : (
                           language === 'AR' ? 'ربط الحساب' : 'Link Account'
                         )}
                       </button>
                    </div>
                    {linkError && <p className="text-red-500 text-xs font-medium animate-in fade-in">{linkError}</p>}
                  </div>
                )}

                {/* Password field for NEW employees or EDITING employees with no password */}
                {(!employee || !employee.password) && (
                  <div className='space-y-1.5 pt-2'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.password}
                    </label>
                    <SmartInput
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t.passwordPlaceholder}
                      type='password'
                      className={INPUT_BASE}
                    />
                  </div>
                )}

                {/* Password Change Section - EDITING */}
                {employee && employee.password && (
                  <div className='pt-4 border-t border-(--border-divider)'>
                    {!wantsToChangePassword ? (
                      <button
                        type='button'
                        onClick={() => setWantsToChangePassword(true)}
                        className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
                      >
                        <span
                          className='material-symbols-rounded'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          key
                        </span>
                        {t.changePassword}
                        <span
                          className='material-symbols-rounded'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          chevron_right
                        </span>
                      </button>
                    ) : (
                      /* Password change form */
                      <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <span
                              className='material-symbols-rounded text-primary-500'
                              style={{ fontSize: 'var(--icon-base)' }}
                            >
                              key
                            </span>
                            <h4 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                              {t.changePassword}
                            </h4>
                            {isOldPasswordVerified ? (
                              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
                                <span
                                  className='material-symbols-rounded'
                                  style={{ fontSize: 'var(--icon-md)' }}
                                >
                                  check_circle
                                </span>
                                {t.verified}
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50'>
                                <span
                                  className='material-symbols-rounded'
                                  style={{ fontSize: 'var(--icon-md)' }}
                                >
                                  info
                                </span>
                                {t.verifyIdentity}
                              </span>
                            )}
                          </div>
                          <button
                            type='button'
                            onClick={() => {
                              setWantsToChangePassword(false);
                              setIsOldPasswordVerified(false);
                              setPasswordError('');
                              setFormData({ ...formData, oldPassword: '', password: '' });
                            }}
                            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                          >
                            <span
                              className='material-symbols-rounded'
                              style={{ fontSize: 'var(--icon-lg)' }}
                            >
                              close
                            </span>
                          </button>
                        </div>

                        {!isOldPasswordVerified ? (
                          /* Step 1: Verify Old Password */
                          <div className='space-y-3'>
                            <div className='flex gap-3'>
                              <div className='flex-1 space-y-1.5'>
                                <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                                  {t.currentPassword}
                                </label>
                                <SmartInput
                                  value={formData.oldPassword || ''}
                                  onChange={(e) => {
                                    setFormData({ ...formData, oldPassword: e.target.value });
                                    setPasswordError('');
                                  }}
                                  placeholder={t.enterCurrentPassword}
                                  type='password'
                                  className={passwordError ? `${INPUT_BASE} border-red-400 dark:border-red-500` : INPUT_BASE}
                                />
                              </div>
                              <div className='flex items-end'>
                                <button
                                  type='button'
                                  onClick={async () => {
                                    setPasswordError('');
                                    if (
                                      !formData.oldPassword ||
                                      formData.oldPassword.trim().length === 0
                                    ) {
                                      playError();
                                      setPasswordError(t.enterPassword);
                                      return;
                                    }
                                    const { verifyPassword } = await import(
                                      '../../services/auth/hashUtils'
                                    );
                                    const isValid = await verifyPassword(
                                      formData.oldPassword,
                                      employee.password!
                                    );
                                    if (isValid) {
                                      playSuccess();
                                      setIsOldPasswordVerified(true);
                                      setPasswordError('');
                                      setFormData({ ...formData, password: '' });
                                    } else {
                                      playError();
                                      setPasswordError(t.incorrectPassword);
                                    }
                                  }}
                                  className='h-[42px] px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all active:scale-95 font-medium flex items-center gap-2'
                                >
                                  <span
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-lg)' }}
                                  >
                                    verified_user
                                  </span>
                                  {t.verify}
                                </button>
                              </div>
                            </div>
                            {passwordError && (
                              <div className='flex items-center justify-between mt-1 px-1 animate-in fade-in slide-in-from-top-1'>
                                <p className='text-xs text-red-500 dark:text-red-400 flex items-center gap-1'>
                                  <span
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-md)' }}
                                  >
                                    error
                                  </span>
                                  {passwordError}
                                </p>
                                <button
                                  type='button'
                                  disabled={isResetting}
                                  onClick={async () => {
                                    if (!employee.email) {
                                      alert(t.emailRequiredForReset);
                                      return;
                                    }
                                    if (!confirm(t.modal.confirmReset)) return;

                                    setIsResetting(true);
                                    try {
                                      const res = await authService.handleForgotPassword(employee.email);
                                      if (res.success) {
                                        alert(t.modal.resetLinkSent);
                                      } else {
                                        alert(res.message);
                                      }
                                    } finally {
                                      setIsResetting(false);
                                    }
                                  }}
                                  className='text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 disabled:opacity-50 transition-colors'
                                >
                                  <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>mark_email_read</span>
                                  {t.resetViaEmail}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Step 2: Enter New Password */
                          <div className='space-y-3'>
                            <div className='border border-(--border-divider) rounded-xl p-3'>
                              <p className='text-xs text-green-800 dark:text-green-200 flex items-center gap-2'>
                                <span
                                  className='material-symbols-rounded'
                                  style={{ fontSize: 'var(--icon-md)' }}
                                >
                                  check_circle
                                </span>
                                {t.verifiedSuccess}
                              </p>
                            </div>
                            <div className='space-y-1.5'>
                              <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                                {t.newPassword}
                              </label>
                              <SmartInput
                                value={formData.password || ''}
                                onChange={(e) =>
                                  setFormData({ ...formData, password: e.target.value })
                                }
                                placeholder={t.enterNewPassword}
                                type='password'
                                className={INPUT_BASE}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {employee && !employee.password && (
                  <div className='border border-(--border-divider) rounded-xl p-3 mt-4'>
                    <p className='text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2'>
                      <span
                        className='material-symbols-rounded'
                        style={{ fontSize: 'var(--icon-md)' }}
                      >
                        warning
                      </span>
                      {t.noPasswordWarning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'documents' ? (
            <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
              {/* Documents Card */}
              <div className={`${PROFILE_GLASS_CARD_BASE} p-5 space-y-4`}>
                <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                  <span
                    className='material-symbols-rounded text-primary-500'
                    style={{ fontSize: 'var(--icon-base)' }}
                  >
                    description
                  </span>
                  <h3 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                    {t.officialDocuments}
                  </h3>
                </div>

                <div className='space-y-6 pt-4'>
                  {/* National ID Card - Both Faces */}
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1 flex items-center gap-2'>
                      <span
                        className='material-symbols-rounded'
                        style={{ fontSize: 'var(--icon-md)' }}
                      >
                        badge
                      </span>
                      {t.nationalIdCard}
                    </label>
                    <div className='flex items-center gap-4'>
                      {/* Front Face */}
                      {formData.nationalIdCard ? (
                        <div className='relative group'>
                          <img
                            src={formData.nationalIdCard}
                            alt='National ID Front'
                            className='h-24 w-auto rounded-xl object-contain'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setFormData({ ...formData, nationalIdCard: undefined })
                            }
                            className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                          >
                            <span
                              className='material-symbols-rounded'
                              style={{
                                fontSize: 'var(--icon-md)',
                                fontVariationSettings: "'wght' 700"
                              }}
                            >
                              close
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className='flex-1'>
                          <label className='flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                            <span
                              className='material-symbols-rounded text-gray-400'
                              style={{ fontSize: 'var(--icon-base)' }}
                            >
                              upload
                            </span>
                            <span className='text-sm text-gray-600 dark:text-gray-300'>
                              {t.uploadFront}
                            </span>
                            <input
                              type='file'
                              accept='image/*'
                              className='hidden'
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 500 * 1024) {
                                    playError();
                                    alert(
                                      language === 'AR'
                                        ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)'
                                        : 'File too large (max 500KB)'
                                    );
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData({
                                      ...formData,
                                      nationalIdCard: reader.result as string,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}

                      {/* Plus Icon / Back Face */}
                      {formData.nationalIdCard && (
                        <>
                          {formData.nationalIdCardBack ? (
                            <div className='relative group'>
                              <img
                                src={formData.nationalIdCardBack}
                                alt='National ID Back'
                                className='h-24 w-auto rounded-xl object-contain'
                              />
                              <button
                                type='button'
                                onClick={() =>
                                  setFormData({ ...formData, nationalIdCardBack: undefined })
                                }
                                className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                              >
                                <span
                                  className='material-symbols-rounded'
                                  style={{
                                    fontSize: 'var(--icon-md)',
                                    fontVariationSettings: "'wght' 700"
                                  }}
                                >
                                  close
                                </span>
                              </button>
                            </div>
                          ) : (
                            <label
                              className='flex items-center justify-center w-24 h-24 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'
                            >
                              <span
                                className='material-symbols-rounded text-primary-500'
                                style={{ fontSize: 'var(--icon-lg)' }}
                              >
                                add
                              </span>
                              <input
                                type='file'
                                accept='image/*'
                                className='hidden'
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 500 * 1024) {
                                      playError();
                                      alert(
                                        language === 'AR'
                                          ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)'
                                          : 'File too large (max 500KB)'
                                      );
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setFormData({
                                        ...formData,
                                        nationalIdCardBack: reader.result as string,
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Syndicate Cards - Side by Side - Only for Pharmacists */}
                  {((formData.role || 'pharmacist').includes('pharmacist')) && (
                    <div className='space-y-2'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1 flex items-center gap-2'>
                        <span
                          className='material-symbols-rounded'
                          style={{ fontSize: 'var(--icon-md)' }}
                        >
                          card_membership
                        </span>
                        {t.syndicateCards}
                      </label>
                      <div className='flex items-center gap-4'>
                        {/* Main Syndicate Card */}
                        {formData.mainSyndicateCard ? (
                          <div className='relative group'>
                            <img
                              src={formData.mainSyndicateCard}
                              alt='Main Syndicate Card'
                              className='h-24 w-auto rounded-xl object-contain'
                            />
                            <button
                              type='button'
                              onClick={() =>
                                setFormData({ ...formData, mainSyndicateCard: undefined })
                              }
                              className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{
                                  fontSize: 'var(--icon-md)',
                                  fontVariationSettings: "'wght' 700"
                                }}
                              >
                                close
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className='flex-1'>
                            <label className='flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                              <span
                                className='material-symbols-rounded text-gray-400'
                                style={{ fontSize: 'var(--icon-base)' }}
                              >
                                upload
                              </span>
                              <span className='text-sm text-gray-600 dark:text-gray-300'>
                                {t.mainSyndicateCard}
                              </span>
                              <input
                                type='file'
                                accept='image/*'
                                className='hidden'
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 500 * 1024) {
                                      playError();
                                      alert(
                                        language === 'AR'
                                          ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)'
                                          : 'File too large (max 500KB)'
                                      );
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setFormData({
                                        ...formData,
                                        mainSyndicateCard: reader.result as string,
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}

                        {/* Sub Syndicate Card - Appears when Main is uploaded */}
                        {formData.mainSyndicateCard && (
                          <>
                            {formData.subSyndicateCard ? (
                              <div className='relative group'>
                                <img
                                  src={formData.subSyndicateCard}
                                  alt='Sub Syndicate Card'
                                  className='h-24 w-auto rounded-xl object-contain'
                                />
                                <button
                                  type='button'
                                  onClick={() =>
                                    setFormData({ ...formData, subSyndicateCard: undefined })
                                  }
                                  className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                                >
                                  <span
                                    className='material-symbols-rounded'
                                    style={{
                                      fontSize: 'var(--icon-md)',
                                      fontVariationSettings: "'wght' 700"
                                    }}
                                  >
                                    close
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <label
                                className='flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50 gap-1'
                              >
                                <span
                                  className='material-symbols-rounded text-primary-500'
                                  style={{ fontSize: 'var(--icon-base)' }}
                                >
                                  add
                                </span>
                                <span className='text-[10px] font-bold text-gray-400 uppercase'>
                                  {t.sub}
                                </span>
                                <input
                                  type='file'
                                  accept='image/*'
                                  className='hidden'
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 500 * 1024) {
                                        playError();
                                        alert(
                                          language === 'AR'
                                            ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)'
                                            : 'File too large (max 500KB)'
                                        );
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setFormData({
                                          ...formData,
                                          subSyndicateCard: reader.result as string,
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </>
    </Modal>
  );
};
