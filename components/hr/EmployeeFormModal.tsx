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
import { BUTTON_BASE, INPUT_BASE } from '../../utils/themeStyles';
import type { Branch, Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';

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
  // eslint-disable-next-line @typescript-eslint-no-unused-vars
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);

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
    setGeneratedTempPassword(null);
    setIsResetting(false);
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
        opt.value !== 'credentials' || (formData.role || 'pharmacist') !== 'officeboy'
    );
  }, [t.tabs, formData.role]);

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
    setGeneratedTempPassword(null);
    setIsResetting(false);
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

    // Secure Password Hashing
    let hashedPassword = employee?.password; // Default: keep existing password

    // Only process password if user explicitly wants to change it
    if (wantsToChangePassword && formData.password && formData.password.trim().length > 0) {
      const { hashPassword } = await import('../../services/auth/hashUtils');

      // Safety check: must have verified old password first
      if (employee && employee.password && !isOldPasswordVerified) {
        playError();
        return; // Should not happen if UI is followed correctly
      }

      hashedPassword = await hashPassword(formData.password);
    } else if (!employee && formData.password && formData.password.trim().length > 0) {
      // New employee: hash the password directly
      const { hashPassword } = await import('../../services/auth/hashUtils');
      hashedPassword = await hashPassword(formData.password);
    }

    const finalFormData = {
      ...formData,
      password: hashedPassword,
    };

    try {
      await onSave(finalFormData);
      playSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to save employee', error);
      playError();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={employee ? t.editEmployee : t.addEmployee}
      tabs={employeeTabOptions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      icon='badge'
      size='4xl'
      height='80vh'
      hideCloseButton={true}
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
            className={`${BUTTON_BASE} px-8 py-2.5 text-(--text-primary) font-bold`}
          >
            {t.modal.save}
          </button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Top Section - Profile Picture & Identity */}
        <div className='flex flex-col items-center justify-center gap-4 pb-6'>
          <div className='relative group'>
            <div className='relative'>
              {formData.image ? (
                <img
                  src={formData.image}
                  alt='Employee'
                  className='w-32 h-32 rounded-[2rem] object-cover shadow-xl border-4 border-white dark:border-(--bg-card) ring-1 ring-(--border-divider)'
                />
              ) : (
                <div
                  className='w-32 h-32 rounded-[2rem] bg-gray-200 dark:bg-zinc-900/50 flex items-center justify-center text-gray-500 dark:text-gray-400 text-4xl font-bold border border-(--border-divider) shadow-inner animate-in fade-in zoom-in duration-500'
                >
                  {getInitials(formData.name || '') === '?' || !formData.name?.trim() ? (
                    <span className='material-symbols-rounded' style={{ fontSize: '3rem' }}>photo_camera</span>
                  ) : (
                    getInitials(formData.name)
                  )}
                </div>
              )}
              
              <label
                className='absolute inset-0 flex items-center justify-center bg-black/60 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-[4px] border-2 border-white/10 overflow-hidden'
                title={t.changePhoto}
              >
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
                            ? 'حجم الصورة كبير جداً (الحد الأقصى 500KB)'
                            : 'Image too large (max 500KB)'
                        );
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            {formData.image ? (
              <button
                type='button'
                onClick={() => setFormData({ ...formData, image: undefined })}
                className={`absolute -top-1 ${language === 'AR' ? '-right-1' : '-left-1'} w-8 h-8 bg-white dark:bg-(--bg-card) ${BUTTON_CLOSE_BASE} rounded-xl text-gray-400 hover:text-red-500 shadow-lg hover:shadow-red-500/10 flex items-center justify-center z-10`}
                title={t.removePhoto}
              >
                <span
                  className='material-symbols-rounded'
                  style={{ 
                    fontSize: 'var(--icon-lg)',
                    fontVariationSettings: "'wght' 700" 
                  }}
                >
                  close
                </span>
              </button>
            ) : null}
          </div>
          
          <div className='text-center space-y-1'>
            <h3 className='text-lg font-bold text-(--text-primary)'>
              {formData.name || t.newEmployee}
            </h3>
            <div className='flex items-center gap-2 justify-center'>
              <span className='px-2 py-0.5 rounded-full bg-(--bg-surface-neutral) text-(--text-tertiary) text-[10px] font-bold uppercase tracking-wider border border-(--border-divider)'>
                {availableRoles.find(r => r.key === (formData.role || 'pharmacist'))?.label}
              </span>
              <span className='w-1 h-1 rounded-full bg-(--border-divider)' />
              <span className='text-[10px] text-gray-400 font-medium uppercase tracking-tight'>
                Maximum 500KB
              </span>
            </div>
          </div>
        </div>

        {/* Main Form Area */}
        <div className='space-y-6'>
          {activeTab === 'general' ? (
            <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
              {/* General Info Card */}
              <div className='bg-(--bg-surface-neutral)/50 rounded-2xl p-5 border border-(--border-divider) space-y-5'>
                <div className='grid grid-cols-12 gap-x-4 gap-y-5'>
                  {/* Row 1: Names (EN + AR) */}
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
                    />
                  </div>
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
                    />
                  </div>

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
                          setFormData({ ...formData, status: item.key as any });
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

                  {/* Row 3: Position + Phone + Email */}
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
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.phone}
                    </label>
                    <SmartPhoneInput
                      value={formData.phone || ''}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                      placeholder={t.phone}
                      className={INPUT_BASE}
                    />
                  </div>
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.email}
                    </label>
                    <SmartEmailInput
                      value={formData.email || ''}
                      onChange={(val) => setFormData({ ...formData, email: val })}
                      placeholder={t.email}
                      className={INPUT_BASE}
                    />
                  </div>

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
              <div className='bg-(--bg-surface-neutral)/50 rounded-2xl p-5 border border-(--border-divider) space-y-4'>
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
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${
                        formData.biometricCredentialId
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

                {/* Password field for NEW employees */}
                {!employee && (
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
              <div className='bg-(--bg-surface-neutral)/50 rounded-2xl p-5 border border-(--border-divider) space-y-4'>
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
                  {(formData.role || 'pharmacist') === 'pharmacist' && (
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
    </div>
  </Modal>
  );
};
