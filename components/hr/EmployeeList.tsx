import {
  type ColumnDef,
} from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { type UserRole } from '../../config/permissions';
import { permissionsService } from '../../services/auth/permissions';
import { useData } from '../../services';
import { authService } from '../../services/auth/authService';
import { branchService } from '../../services/branchService';
import type { Branch, Employee, UserSession } from '../../types';
import { FilterDropdown } from '../common/FilterDropdown';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { Modal, BUTTON_CLOSE_BASE } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { BUTTON_BASE } from '../../utils/themeStyles';
import { FilterPill, type FilterConfig } from '../common/FilterPill';
import { SmartEmailInput, SmartInput, SmartPhoneInput } from '../common/SmartInputs';
import { TanStackTable } from '../common/TanStackTable';
import { Switch } from '../common/Switch';
import { employeeService } from '../../services/hr/employeeService';
import { orgService } from '../../services/org/orgService';
import { INPUT_BASE } from '../../utils/themeStyles';

import { 
  DEPARTMENT_ROLES, 
  getRolesForDepartment,
  getRoleLabel 
} from '../../config/employeeRoles';
import { RoleIcon } from './RoleIcon';

interface EmployeeListProps {
  color: string;
  t: any;
  language: string;
  onUpdateEmployees?: (employees: Employee[]) => void;
  employees: Employee[];
  onAddEmployee: (employee: Employee) => Promise<void>;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  color,
  t,
  language,
  onUpdateEmployees,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  // --- Data Context ---
  const { branches } = useData();

  // --- State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Form State (extends Employee with form-only fields like oldPassword for verification)
  const [formData, setFormData] = useState<Partial<Employee> & { oldPassword?: string }>({});

  // Dropdown open states for FilterDropdown
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // --- Smart Roles Logic ---
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isBranchOpen, setIsBranchOpen] = useState(false);

  // Global View State
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [allEmployeesFetched, setAllEmployeesFetched] = useState<Employee[]>([]);
  const [isFetchingGlobal, setIsFetchingGlobal] = useState(false);

  const isSuperAdmin = permissionsService.isOrgAdmin();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch all employees when "Global View" is toggled
  useEffect(() => {
    if (showAllBranches && allEmployeesFetched.length === 0 && !isFetchingGlobal) {
      const fetchAll = async () => {
        setIsFetchingGlobal(true);
        try {
          const activeOrgId = orgService.getActiveOrgId();
          const all = await employeeService.getAll('ALL', activeOrgId);
          setAllEmployeesFetched(all);
        } catch (err) {
          console.error('Failed to fetch all employees', err);
        } finally {
          setIsFetchingGlobal(false);
        }
      };
      fetchAll();
    }
  }, [showAllBranches, allEmployeesFetched.length, isFetchingGlobal]);

  // 1. Access Matrix: Filter Departments based on User Role
  const availableDepartments = useMemo(() => {
    const allDepts = Object.entries(t.employeeList.departments).map(([key, label]) => ({
      key,
      label: label as string,
    }));

    if (!currentUser) return [];

    // Admin / Owner / HR -> See ALL
    if (permissionsService.can('users.manage')) {
      // Logic for IT visibility: check specific permission
      if (!permissionsService.can('users.view_it')) {
        return allDepts.filter((d) => d.key !== 'it');
      }
      return allDepts;
    }

    // Manager / Pharmacist Manager -> See Operations (Pharmacy, Sales, Logistics, Marketing)
    if (permissionsService.isManager()) {
      return allDepts.filter((d) =>
        ['pharmacy', 'sales', 'logistics', 'marketing'].includes(d.key)
      );
    }

    // Fallback: If logic fails or other roles (restricted), ideally they shouldn't see this modal at all,
    // but if they do, show only their OWN department to be safe.
    return allDepts.filter((d) => d.key === currentUser.department);
  }, [t.employeeList.departments, currentUser]);

  // 2. Dependency Matrix: Filter Roles based on Selected Department
  const availableRoles = useMemo(() => {
    const selectedDept = formData.department || 'pharmacy';
    const validRoles = DEPARTMENT_ROLES[selectedDept] || [];

    return Object.entries(t.employeeList.roles)
      .filter(([key]) => (validRoles as string[]).includes(key))
      .map(([key, label]) => ({ key, label: label as string }));
  }, [t.employeeList.roles, formData.department]);

  // 3. Auto-Correction: Clear invalid role when department changes
  useEffect(() => {
    if (!formData.department) return;

    const validRoles = DEPARTMENT_ROLES[formData.department] || [];
    if (formData.role && !validRoles.includes(formData.role)) {
      // Reset role if invalid for new department
      setFormData((prev) => ({ ...prev, role: undefined }));
    }
  }, [formData.department]); // Only run when dept changes

  // Tab state for modal
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'documents'>('general');
  const [activeViewTab, setActiveViewTab] = useState<'general' | 'credentials' | 'documents'>(
    'general'
  );
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [wantsToChangePassword, setWantsToChangePassword] = useState(false);

  // Tab Options for Modal Header (Centered)
  const employeeTabOptions = useMemo(() => {
    return [
      {
        value: 'general',
        label: language === 'AR' ? 'معلومات عامة' : 'General',
        icon: 'person',
      },
      {
        value: 'credentials',
        label: language === 'AR' ? 'بيانات الدخول' : 'Credentials',
        icon: 'lock',
      },
      {
        value: 'documents',
        label: language === 'AR' ? 'المستندات' : 'Documents',
        icon: 'description',
      },
    ].filter(
      (opt) =>
        opt.value !== 'credentials' || (formData.role || 'pharmacist') !== 'officeboy'
    );
  }, [language, formData.role]);

  // Sounds
  const { playSuccess, playError, playBeep } = usePosSounds();

  // --- Actions ---
  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ ...emp });
    setIsModalOpen(true);
  };

  const handleDelete = async (emp: Employee) => {
    if (confirm(t.employeeList.deleteConfirm)) {
      await onDeleteEmployee(emp.id);
      playBeep();
      
      // Refresh global list if in global view
      if (showAllBranches) {
        try {
          const all = await employeeService.getAll('ALL');
          setAllEmployeesFetched(all);
        } catch (err) {}
      }
    }
  };

  const handleView = (emp: Employee) => {
    setViewingEmployee(emp);
  };

  // --- Derived Data ---
  const counts = useMemo(() => {
    return {
      all: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      inactive: employees.filter((e) => e.status === 'inactive').length,
      holiday: employees.filter((e) => e.status === 'holiday').length,
    };
  }, [employees]);

  // --- Filter Configs ---
  const employeeFilterConfigs = useMemo<FilterConfig[]>(() => [
    {
      id: 'status',
      label: t.employeeList.status,
      icon: 'rule',
      mode: 'multiple',
      options: Object.entries(t.employeeList.statusOptions)
        .filter(([key]) => key !== 'all')
        .map(([key, label]) => ({
          label: label as string,
          value: key,
          icon: key === 'active' ? 'check_circle' : key === 'holiday' ? 'beach_access' : 'cancel',
          color: key === 'active' ? 'emerald' : key === 'holiday' ? 'amber' : 'gray'
        }))
    },
    {
      id: 'department',
      label: t.employeeList.department,
      icon: 'business',
      mode: 'multiple',
      options: availableDepartments.map(d => ({
        label: d.label,
        value: d.key,
        icon: 'folder'
      }))
    }
  ], [t, availableDepartments]);

  const filteredEmployees = useMemo(() => {
    const list = showAllBranches ? allEmployeesFetched : employees;
    return list.filter((e) => (e.role as any));
  }, [employees, allEmployeesFetched, showAllBranches]);

  // --- Columns ---
  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'employeeCode',
        header: t.employeeList.table.code,
        meta: { align: 'start' },
      },
      {
        accessorKey: 'name',
        header: t.employeeList.table.name,
      },
      {
        accessorKey: 'position',
        header: t.employeeList.table.position,
      },
      {
        accessorKey: 'department',
        header: t.employeeList.table.department,
        cell: ({ row }) => (
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            {t.employeeList.departments[row.original.department] || row.original.department}
          </span>
        ),
      },
      {
        accessorKey: 'phone',
        header: t.employeeList.table.phone,
      },
      {
        accessorKey: 'status',
        header: t.employeeList.table.status,
        cell: ({ row }) => {
          const status = row.original.status;
          let config = {
            color: 'gray',
            icon: 'cancel',
          };

          if (status === 'active') config = { color: 'emerald', icon: 'check_circle' };
          if (status === 'holiday') config = { color: 'amber', icon: 'beach_access' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
            >
              <span 
                className='material-symbols-rounded'
                style={{ fontSize: 'var(--icon-lg)' }}
              >
                {config.icon}
              </span>
              {t.employeeList.statusOptions[status] || status}
            </span>
          );
        },
      },
      {
        accessorKey: 'branchId',
        header: t.employeeList.table.branch,
        cell: ({ row }) => {
          const branch = branches.find(b => b.id === row.original.branchId);
          return (
            <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-current text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
              {branch?.name || t.employeeList.unassigned}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-2 w-full'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleView(row.original);
              }}
              className='p-1 text-gray-400 hover:text-emerald-600 transition-colors'
            >
              <span 
                className='material-symbols-rounded'
                style={{ fontSize: 'var(--icon-lg)' }}
              >
                visibility
              </span>
            </button>
            {permissionsService.can('users.manage') && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(row.original);
                  }}
                  className='p-1 text-gray-400 hover:text-primary-600 transition-colors'
                >
                  <span 
                    className='material-symbols-rounded'
                    style={{ fontSize: 'var(--icon-lg)' }}
                  >
                    edit
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.original);
                  }}
                  className='p-1 text-gray-400 hover:text-red-600 transition-colors'
                >
                  <span 
                    className='material-symbols-rounded'
                    style={{ fontSize: 'var(--icon-lg)' }}
                  >
                    delete
                  </span>
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [t, employees, handleView, handleEdit, handleDelete]
  );

  // Removed local generateUUID and code generation in favor of centralized idGenerator
  
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // --- Form Logic ---
  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      playError();
      return; // Validation failed
    }

    // Check for duplicate username
    if (formData.username && formData.username.trim().length > 0) {
      const username = formData.username.trim().toLowerCase();
      // Check for global duplicate if in global view, otherwise check branch-local
      const listToCheck = showAllBranches ? allEmployeesFetched : employees;
      const isDuplicate = listToCheck.some(
        (emp) =>
          emp.id !== editingEmployee?.id && emp.username && emp.username.toLowerCase() === username
      );

      if (isDuplicate) {
        playError();
        alert(
          language === 'AR'
            ? 'اسم المستخدم هذا مسجل مسبقاً لموظف آخر. يرجى اختيار اسم مختلف.'
            : 'This username is already taken by another employee. Please choose a different one.'
        );
        return;
      }
    }

    // Secure Password Hashing
    let hashedPassword = editingEmployee?.password; // Default: keep existing password

    // Only process password if user explicitly wants to change it
    if (wantsToChangePassword && formData.password && formData.password.trim().length > 0) {
      const { hashPassword } = await import('../../services/auth/hashUtils');

      // Safety check: must have verified old password first
      if (editingEmployee && editingEmployee.password && !isOldPasswordVerified) {
        playError();
        return; // Should not happen if UI is followed correctly
      }

      hashedPassword = await hashPassword(formData.password);
    } else if (!editingEmployee && formData.password && formData.password.trim().length > 0) {
      // New employee: hash the password directly
      const { hashPassword } = await import('../../services/auth/hashUtils');
      hashedPassword = await hashPassword(formData.password);
    }

    const finalFormData = {
      ...formData,
      password: hashedPassword,
    };

    const isEdit = !!editingEmployee;

    try {
      if (isEdit) {
        await onUpdateEmployee(editingEmployee.id, finalFormData);
      } else {
        // ID and Code generation is now handled by idGenerator inside the handler/service
        // but we pass a skeleton to satisfy types if needed.
        const newEmp: Employee = {
          id: '', // Will be generated by idGenerator
          employeeCode: '', // Will be generated by idGenerator
          startDate: new Date().toISOString().split('T')[0],
          status: 'active',
          department: 'pharmacy',
          role: 'pharmacist',
          ...(finalFormData as any),
        };
        await onAddEmployee(newEmp);
      }

      // Refresh global list if in global view to ensure local state parity
      if (showAllBranches) {
        try {
          const all = await employeeService.getAll('ALL');
          setAllEmployeesFetched(all);
        } catch (err) {}
      }

      playSuccess();
      setIsModalOpen(false);
      setEditingEmployee(null);
      setFormData({});

      // Legacy callback support if needed
      if (onUpdateEmployees) onUpdateEmployees(employees); // Note: this might pass old state, but context listeners should update
    } catch (error) {
      console.error('Failed to save employee', error);
      playError();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({});
    setIsDepartmentOpen(false);
    setIsRoleOpen(false);
    setIsStatusOpen(false);
    setActiveTab('general');
    setIsOldPasswordVerified(false);
    setPasswordError('');
    setWantsToChangePassword(false);
    setGeneratedTempPassword(null);
    setIsResetting(false);
  };

  // --- Render ---
  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in overflow-hidden'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>
            {t.employeeList.title}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t.employeeList.subtitle}</p>
        </div>

        <div className='flex flex-col md:flex-row gap-3 w-full md:w-auto items-center'>
          {isSuperAdmin && (
            <label className='flex items-center gap-3 px-3 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors mr-1'>
              <span className='text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none shrink-0'>
                {t.employeeList.globalView}
              </span>
              <Switch
                checked={showAllBranches}
                onChange={setShowAllBranches}
                activeColor={color}
              />
            </label>
          )}

          {permissionsService.can('users.manage') && (
            <button
              onClick={() => {
                setFormData({});
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
              className={`flex items-center justify-center gap-2 px-5 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl shadow-lg shadow-zinc-900/10 dark:shadow-white/5 transition-all active:scale-95 whitespace-nowrap font-bold`}
            >
              <span 
                className='material-symbols-rounded'
                style={{ 
                  fontSize: 'var(--icon-base)',
                  fontVariationSettings: "'wght' 700" 
                }}
              >
                add
              </span>
              <span>{t.employeeList.addEmployee}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Table */}
      <div className='flex-1 min-h-0 flex flex-col'>
        <TanStackTable
          data={filteredEmployees}
          columns={columns}
          tableId='employee-list'
          color={color}
          emptyMessage='No employees found'
          onRowClick={handleView}
          enableSearch={true}
          enableTopToolbar={true}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
          filterableColumns={employeeFilterConfigs}
        />
      </div>

      {/* Add/Edit Modal - Wide Layout with Tabs */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEmployee ? t.employeeList.editEmployee : t.employeeList.addEmployee}
        tabs={employeeTabOptions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        icon='badge'
        size='4xl'
        height='80vh'
        // Hide header close button when using tabs; ensure a cancel button exists in footer
        hideCloseButton={true}
        footer={
          <div className='flex items-center justify-end gap-3'>
            <button
              onClick={closeModal}
              className={`${BUTTON_CLOSE_BASE} px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg font-medium`}
            >
              {t.employeeList.modal.cancel}
            </button>
            <button
              onClick={handleSave}
              className={`${BUTTON_BASE} px-8 py-2.5 text-(--text-primary) font-bold`}
            >
              {t.employeeList.modal.save}
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
                    className={`w-32 h-32 rounded-[2rem] bg-gray-200 dark:bg-zinc-900/50 flex items-center justify-center text-gray-500 dark:text-gray-400 text-4xl font-bold border border-(--border-divider) shadow-inner animate-in fade-in zoom-in duration-500`}
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
                  title={language === 'AR' ? 'تغيير الصورة' : 'Change Image'}
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
                  title={language === 'AR' ? 'إزالة الصورة' : 'Remove Image'}
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
                {formData.name || (language === 'AR' ? 'موظف جديد' : 'New Employee')}
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
                      {t.employeeList.name}
                    </label>
                    <SmartInput
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.employeeList.name}
                      autoFocus
                      className={INPUT_BASE}
                      required
                    />
                  </div>
                  <div className='col-span-6 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {language === 'AR' ? 'الاسم بالكامل (عربي)' : 'Full Name (Arabic)'}
                    </label>
                    <SmartInput
                      value={formData.nameArabic || ''}
                      onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                      placeholder={t.employeeList.nameArabic || (language === 'AR' ? 'الاسم بالكامل...' : 'Full Name in Arabic...')}
                      className={INPUT_BASE}
                      dir='rtl'
                    />
                  </div>

                  {/* Row 2: Branch (3) + Dept (3) + Role (3) + Status (3) */}
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.branch}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={branches.map(b => ({ key: b.id, label: b.name }))}
                        selectedItem={branches.map(b => ({ key: b.id, label: b.name })).find(b => b.key === formData.branchId) || { key: 'UNASSIGNED', label: t.employeeList.unassigned }}
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
                            {item?.label || t.employeeList.branch}
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
                      {t.employeeList.department}
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
                            {item?.label || t.employeeList.department}
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
                      {t.employeeList.role}
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
                          <span className='text-sm'>{item?.label || t.employeeList.role}</span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>
                  <div className='col-span-3 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.status}
                    </label>
                    <div className='relative h-[42px]'>
                      <FilterDropdown
                        className='absolute top-0 left-0 w-full z-30'
                        minHeight='42px'
                        items={Object.entries(t.employeeList.statusOptions)
                          .filter(([key]) => key !== 'all')
                          .map(([key, label]) => ({ key, label: label as string }))}
                        selectedItem={Object.entries(t.employeeList.statusOptions)
                          .map(([key, label]) => ({ key, label: label as string }))
                          .find((s) => s.key === (formData.status || 'active'))}
                        isOpen={isStatusOpen}
                        onToggle={() => {
                          setIsStatusOpen(!isStatusOpen);
                          setIsDepartmentOpen(false);
                          setIsRoleOpen(false);
                        }}
                        onSelect={(item) => {
                          setFormData({ ...formData, status: item.key as any });
                          setIsStatusOpen(false);
                        }}
                        renderItem={(item) => <span className='text-sm'>{item.label}</span>}
                        renderSelected={(item) => (
                          <span className='text-sm'>{item?.label || t.employeeList.status}</span>
                        )}
                        keyExtractor={(item) => item.key}
                        variant='input'
                        color={color}
                      />
                    </div>
                  </div>

                  {/* Row 3: Position (4) + Phone (4) + Email (4) */}
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.position}
                    </label>
                    <SmartInput
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder={t.employeeList.position}
                      className={INPUT_BASE}
                    />
                  </div>
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.phone}
                    </label>
                    <SmartPhoneInput
                      value={formData.phone || ''}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                      placeholder={t.employeeList.phone}
                      className={INPUT_BASE}
                    />
                  </div>
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.email}
                    </label>
                    <SmartEmailInput
                      value={formData.email || ''}
                      onChange={(val) => setFormData({ ...formData, email: val })}
                      placeholder={t.employeeList.email}
                      className={INPUT_BASE}
                    />
                  </div>

                  {/* Row 4: Salary (4) + Notes (8) */}
                  <div className='col-span-4 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.salary}
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
                  <div className='col-span-8 space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                      {t.employeeList.notes}
                    </label>
                    <SmartInput
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={language === 'AR' ? 'ملاحظات إضافية...' : 'Additional notes...'}
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
                      className={`material-symbols-rounded text-primary-500`}
                      style={{ fontSize: 'var(--icon-base)' }}
                    >
                      lock
                    </span>
                    <h3 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                      {t.employeeList.credentials || 'Login Credentials'}
                    </h3>
                  </div>


                  <div className='grid grid-cols-2 gap-4 pt-4'>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.username || 'Username'}
                      </label>
                      <SmartInput
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder={t.employeeList.usernamePlaceholder || 'Login Username'}
                        className={INPUT_BASE}
                      />
                    </div>
                    {/* Biometric Setup Section */}
                    <div className='space-y-1.5'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {language === 'AR' ? 'مفتاح المرور (Passkey)' : 'Passkey'}
                      </label>
                      <button
                        type='button'
                        onClick={async () => {
                          try {
                            // Dynamic import for SimpleWebAuthn
                            const { startRegistration } = await import('@simplewebauthn/browser');
                            const {
                              generateChallenge,
                              bufferToBase64,
                              isWebAuthnSupported,
                              parseWebAuthnError,
                            } = await import('../../utils/webAuthnUtils');

                            // Check if browser supports WebAuthn
                            if (!(await isWebAuthnSupported())) {
                              const msg =
                                language === 'AR'
                                  ? 'هذا المتصفح لا يدعم مفاتيح المرور (Passkeys). تأكد من استخدام HTTPS أو Localhost.'
                                  : 'Browser does not support Passkeys. Ensure you are on HTTPS or Localhost.';
                              alert(msg);
                              return;
                            }

                            // 1. Get Challenge from "Backend" (Mocked)
                            const challengeBuffer = generateChallenge();
                            const challengeBase64 = bufferToBase64(challengeBuffer);
                            const employeeId = formData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));

                            // 2. Options for Creation (Usually comes from backend)
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

                            // 3. Start Registration via Library
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
                              // Success!
                              setFormData({
                                ...formData,
                                id: employeeId, // CRITICAL: Save the ID so it matches during final form save
                                biometricCredentialId: attResp.id,
                                biometricPublicKey: 'MOCKED_PASSKEY_PILOT',
                              });
                              playSuccess();
                            }
                          } catch (err: any) {
                            console.error('Passkey registration failed', err);
                            const { parseWebAuthnError } = await import(
                              '../../utils/webAuthnUtils'
                            );
                            playError();
                            alert(parseWebAuthnError(err, language as any));
                          }
                        }}
                        className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${
                          formData.biometricCredentialId
                            ? `bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800/30 dark:text-green-400`
                            : `border-(--border-divider) text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-neutral) transition-all`
                        }`}
                      >
                        <span
                          className={`material-symbols-rounded ${formData.biometricCredentialId ? 'text-green-500' : ''}`}
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          {formData.biometricCredentialId ? 'fingerprint_check' : 'fingerprint'}
                        </span>
                        {formData.biometricCredentialId
                          ? language === 'AR'
                            ? 'تم ضبط المفتاح'
                            : 'Passkey Set'
                          : language === 'AR'
                            ? 'إعداد مفتاح المرور'
                            : 'Setup Passkey'}
                      </button>
                    </div>
                  </div>

                  {/* Password field for NEW employees */}
                  {!editingEmployee && (
                    <div className='space-y-1.5 pt-2'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.password || 'Password'}
                      </label>
                      <SmartInput
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={t.employeeList.passwordPlaceholder || 'Login Password'}
                        type='password'
                        className={INPUT_BASE}
                      />
                    </div>
                  )}

                  {/* Password Change Section - Only when EDITING and user WANTS to change */}
                  {editingEmployee && editingEmployee.password && (
                    <div className='pt-4 border-t border-(--border-divider)'>
                      {!wantsToChangePassword ? (
                        <>
                          {/* Button to initiate password change */}
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
                            {language === 'AR' ? 'تغيير كلمة المرور' : 'Change Password'}
                            <span 
                              className='material-symbols-rounded'
                              style={{ fontSize: 'var(--icon-lg)' }}
                            >
                              chevron_right
                            </span>
                          </button>


                        </>
                      ) : (
                        /* Password change form */
                        <div className='space-y-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <span
                                className={`material-symbols-rounded text-primary-500`}
                                style={{ fontSize: 'var(--icon-base)' }}
                              >
                                key
                              </span>
                              <h4 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                                {language === 'AR' ? 'تغيير كلمة المرور' : 'Change Password'}
                              </h4>
                              {isOldPasswordVerified ? (
                                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
                                  <span 
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-md)' }}
                                  >
                                    check_circle
                                  </span>
                                  {language === 'AR' ? 'تم التحقق' : 'Verified'}
                                </span>
                              ) : (
                                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50'>
                                  <span 
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-md)' }}
                                  >
                                    info
                                  </span>
                                  {language === 'AR'
                                    ? 'أدخل كلمة المرور الحالية للتحقق من هويتك'
                                    : 'Enter current password to verify your identity'}
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
                                    {language === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}
                                  </label>
                                  <SmartInput
                                    value={formData.oldPassword || ''}
                                    onChange={(e) => {
                                      setFormData({ ...formData, oldPassword: e.target.value });
                                      setPasswordError('');
                                    }}
                                    placeholder={
                                      language === 'AR'
                                        ? 'أدخل كلمة المرور الحالية'
                                        : 'Enter current password'
                                    }
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
                                        setPasswordError(
                                          language === 'AR' ? 'أدخل كلمة المرور' : 'Enter password'
                                        );
                                        return;
                                      }
                                      const { verifyPassword } = await import(
                                        '../../services/auth/hashUtils'
                                      );
                                      const isValid = await verifyPassword(
                                        formData.oldPassword,
                                        editingEmployee.password!
                                      );
                                      if (isValid) {
                                        playSuccess();
                                        setIsOldPasswordVerified(true);
                                        setPasswordError('');
                                        setFormData({ ...formData, password: '' });
                                      } else {
                                        playError();
                                        setPasswordError(
                                          language === 'AR'
                                            ? 'كلمة المرور غير صحيحة'
                                            : 'Incorrect password'
                                        );
                                      }
                                    }}
                                    className={`h-[42px] px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all active:scale-95 font-medium flex items-center gap-2`}
                                  >
                                    <span 
                                      className='material-symbols-rounded'
                                      style={{ fontSize: 'var(--icon-lg)' }}
                                    >
                                      verified_user
                                    </span>
                                    {language === 'AR' ? 'تحقق' : 'Verify'}
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
                                      if (!editingEmployee.email) {
                                        alert(language === 'AR' ? 'يجب إضافة بريد إلكتروني للموظف أولاً للاستعادة' : 'Employee must have an email address first to reset');
                                        return;
                                      }
                                      if (!confirm(t.employeeList.confirmReset)) return;
                                      
                                      setIsResetting(true);
                                      try {
                                        const res = await authService.handleForgotPassword(editingEmployee.email);
                                        if (res.success) {
                                          alert(t.employeeList.resetLinkSent);
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
                                    {language === 'AR' ? 'استعادة بالإيميل؟' : 'Reset via Email?'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Step 2: Enter New Password (only after verification) */
                            <div className='space-y-3'>
                              <div className='border border-(--border-divider) rounded-xl p-3'>
                                <p className='text-xs text-green-800 dark:text-green-200 flex items-center gap-2'>
                                  <span 
                                    className='material-symbols-rounded'
                                    style={{ fontSize: 'var(--icon-md)' }}
                                  >
                                    check_circle
                                  </span>
                                  {language === 'AR'
                                    ? 'تم التحقق! يمكنك الآن إدخال كلمة المرور الجديدة'
                                    : 'Verified! You can now enter the new password'}
                                </p>
                              </div>
                              <div className='space-y-1.5'>
                                <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                                  {language === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}
                                </label>
                                <SmartInput
                                  value={formData.password || ''}
                                  onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                  }
                                  placeholder={
                                    language === 'AR'
                                      ? 'أدخل كلمة المرور الجديدة'
                                      : 'Enter new password'
                                  }
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

                  {editingEmployee && !editingEmployee.password && (
                    <div className='border border-(--border-divider) rounded-xl p-3 mt-4'>
                      <p className='text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2'>
                        <span 
                          className='material-symbols-rounded'
                          style={{ fontSize: 'var(--icon-md)' }}
                        >
                          warning
                        </span>
                        {language === 'AR'
                          ? 'هذا الموظف ليس لديه كلمة مرور. أضف كلمة مرور جديدة من الأعلى.'
                          : 'This employee has no password. Add a new password above.'}
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
                      className={`material-symbols-rounded text-primary-500`}
                      style={{ fontSize: 'var(--icon-base)' }}
                    >
                      description
                    </span>
                    <h3 className='text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider'>
                      {language === 'AR' ? 'المستندات الرسمية' : 'Official Documents'}
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
                        {language === 'AR' ? 'البطاقة الشخصية' : 'National ID Card'}
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
                                  {language === 'AR' ? 'اضغط لرفع الوجه الأمامي' : 'Upload Front'}
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
                                  className={`flex items-center justify-center w-24 h-24 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50`}
                                >
                                  <span
                                    className={`material-symbols-rounded text-primary-500`}
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
                            {language === 'AR' ? 'كارنيهات النقابة' : 'Syndicate Cards'}
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
                                    {language === 'AR' ? 'كارنية النقابة الرئيسية' : 'Main Syndicate Card'}
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
                                  className={`flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50 gap-1`}
                                >
                                  <span
                                    className={`material-symbols-rounded text-primary-500`}
                                    style={{ fontSize: 'var(--icon-base)' }}
                                  >
                                    add
                                  </span>
                                  <span className='text-[10px] font-bold text-gray-400 uppercase'>
                                    {language === 'AR' ? 'الفرعية' : 'Sub'}
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

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => {
          setViewingEmployee(null);
          setActiveViewTab('general');
        }}
        title={t.employeeList.viewDetails}
        size='3xl'
        height='80vh'
        hideCloseButton={true}
        footer={
          <div className='flex items-center justify-end gap-3'>
            <button
              onClick={() => {
                setViewingEmployee(null);
                setActiveViewTab('general');
              }}
              className={`${BUTTON_CLOSE_BASE} px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg font-medium`}
            >
              {t.employeeList.modal.cancel}
            </button>
          </div>
        }
        headerActions={
          <SegmentedControl
            options={[
              {
                value: 'general',
                label: language === 'AR' ? 'معلومات عامة' : 'General',
                icon: 'person',
              },
              {
                value: 'credentials',
                label: language === 'AR' ? 'بيانات الدخول' : 'Credentials',
                icon: 'lock',
              },
              {
                value: 'documents',
                label: language === 'AR' ? 'المستندات' : 'Documents',
                icon: 'description',
              },
            ].filter(
              (opt) => opt.value !== 'credentials' || viewingEmployee?.role === 'pharmacist'
            )}
            value={activeViewTab}
            onChange={(value) => setActiveViewTab(value as 'general' | 'credentials' | 'documents')}
            color={color}
            iconSize='--icon-lg'
          />
        }
      >
        <div className='space-y-5'>
          {viewingEmployee && (
            <>
              {activeViewTab === 'general' ? (
                <>
                  <div className='flex items-center gap-4 p-4 bg-(--bg-surface-neutral) rounded-xl border border-transparent dark:border-(--border-divider)'>
                    {viewingEmployee.image ? (
                      <img
                        src={viewingEmployee.image}
                        alt={viewingEmployee.name}
                        className='w-16 h-16 rounded-full object-cover border-2 border-white dark:border-(--bg-card) ring-1 ring-(--border-divider)'
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 dark:bg-zinc-900/50 text-gray-500 dark:text-gray-400 text-2xl font-bold border border-(--border-divider)`}
                      >
                        {getInitials(viewingEmployee.name || '') === '?' || !viewingEmployee.name?.trim() ? (
                          <span className='material-symbols-rounded block' style={{ fontSize: '2rem' }}>person</span>
                        ) : (
                          getInitials(viewingEmployee.name)
                        )}
                      </div>
                    )}
                    <div className='flex-1'>
                      <h3 className='text-base font-bold text-gray-900 dark:text-white leading-tight'>
                        {viewingEmployee.name}
                        {viewingEmployee.biometricCredentialId && (
                          <span
                            className='material-symbols-rounded text-green-500 align-middle ml-2'
                            style={{ fontSize: 'var(--icon-lg)' }}
                            title={language === 'AR' ? 'البصمة مفعلة' : 'Fingerprint Enabled'}
                          >
                            fingerprint
                          </span>
                        )}
                      </h3>
                      <div className='flex items-center gap-2 text-xs text-gray-500 mt-0.5'>
                        <span>{viewingEmployee.employeeCode}</span>
                        <span>•</span>
                        <span>{t.employeeList.departments[viewingEmployee.department]}</span>
                      </div>
                    </div>
                    <div className='ml-auto'>
                      {(() => {
                        const status = viewingEmployee.status;
                        let config = { color: 'gray', icon: 'cancel' };
                        if (status === 'active')
                          config = { color: 'emerald', icon: 'check_circle' };
                        if (status === 'holiday') config = { color: 'amber', icon: 'beach_access' };

                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                          >
                            <span 
                              className='material-symbols-rounded'
                              style={{ fontSize: 'var(--icon-md)' }}
                            >
                              {config.icon}
                            </span>
                            {t.employeeList.statusOptions[status]}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-x-6 gap-y-4 pt-2'>
                    <div className='space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.position}
                      </div>
                      <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                        {viewingEmployee.position || '-'}
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.role}
                      </div>
                      <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                        {getRoleLabel(viewingEmployee.role, t.employeeList.roles)}
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.phone}
                      </div>
                      <div
                        className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'
                        dir='ltr'
                      >
                        {viewingEmployee.phone || '-'}
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.email}
                      </div>
                      <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs truncate min-h-[42px] flex items-center'>
                        {viewingEmployee.email || '-'}
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.salary}
                      </div>
                      <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                        {viewingEmployee.salary ? viewingEmployee.salary.toLocaleString() : '-'}
                      </div>
                    </div>
                    <div className='col-span-2 space-y-1.5'>
                      <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.employeeList.notes}
                      </div>
                      <div className='text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-(--bg-card) p-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[5rem] whitespace-pre-wrap leading-relaxed space-y-0'>
                        {viewingEmployee.notes || '-'}
                      </div>
                    </div>
                  </div>
                </>
              ) : activeViewTab === 'credentials' ? (
                <div className='space-y-4'>
                  <div className='bg-primary-50/50 dark:bg-primary-900/10 border border-(--border-divider) rounded-xl p-4'>
                    <div className='flex items-start gap-3'>
                      <span 
                        className='material-symbols-rounded text-primary-600 dark:text-primary-400 mt-0.5'
                        style={{ fontSize: 'var(--icon-lg)' }}
                      >
                        lock_person
                      </span>
                      <div className='flex-1'>
                        <p className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-1'>
                          {language === 'AR'
                            ? 'بيانات الدخول المسجلة'
                            : 'Registered Login Credentials'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4 pt-2'>
                    <div className='bg-(--bg-card) p-3 rounded-xl border border-(--border-divider) shadow-sm'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1 block mb-1'>
                        {t.employeeList.username || 'Username'}
                      </label>
                      <p className='text-sm font-medium text-gray-900 dark:text-white px-1'>
                        {viewingEmployee.username || '-'}
                      </p>
                    </div>
                    <div className='bg-(--bg-card) p-3 rounded-xl border border-(--border-divider) shadow-sm'>
                      <label className='text-xs font-semibold text-gray-500 uppercase px-1 block mb-1'>
                        {t.employeeList.password || 'Password'}
                      </label>
                      <p className='text-sm font-medium text-gray-900 dark:text-white px-1'>
                        ••••••••
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-6'>
                  {/* National ID Section */}
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                      <span 
                        className='material-symbols-rounded text-gray-400'
                        style={{ fontSize: 'var(--icon-base)' }}
                      >
                        badge
                      </span>
                      <h3 className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {language === 'AR' ? 'البطاقة الشخصية' : 'National ID Card'}
                      </h3>
                    </div>
                    {viewingEmployee.nationalIdCard || viewingEmployee.nationalIdCardBack ? (
                      <div className='grid grid-cols-1 gap-4'>
                        {viewingEmployee.nationalIdCard && (
                          <div className='space-y-1'>
                            <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                              {language === 'AR' ? 'الوجه الأمامي' : 'Front Face'}
                            </span>
                            <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                              <img
                                src={viewingEmployee.nationalIdCard}
                                alt='National ID Front'
                                className='max-w-full max-h-[400px] object-contain rounded-lg'
                              />
                            </div>
                          </div>
                        )}
                        {viewingEmployee.nationalIdCardBack && (
                          <div className='space-y-1'>
                            <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                              {language === 'AR' ? 'الوجه الخلفي' : 'Back Face'}
                            </span>
                            <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                              <img
                                src={viewingEmployee.nationalIdCardBack}
                                alt='National ID Back'
                                className='max-w-full max-h-[400px] object-contain rounded-lg'
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='text-center py-8 bg-(--bg-card) border border-(--border-divider) border-dashed rounded-xl'>
                        <p className='text-sm text-gray-400'>
                          {language === 'AR' ? 'لا يوجد صور للبطاقة' : 'No ID card images uploaded'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Syndicate Cards Section - Only for Pharmacists */}
                  {viewingEmployee.role === 'pharmacist' && (
                    <div className='space-y-3'>
                      <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                        <span 
                          className='material-symbols-rounded text-gray-400'
                          style={{ fontSize: 'var(--icon-base)' }}
                        >
                          card_membership
                        </span>
                        <h3 className='text-xs font-semibold text-gray-500 uppercase px-1'>
                          {language === 'AR' ? 'كارنيهات النقابة' : 'Syndicate Cards'}
                        </h3>
                      </div>
                      {viewingEmployee.mainSyndicateCard || viewingEmployee.subSyndicateCard ? (
                        <div className='grid grid-cols-1 gap-4'>
                          {viewingEmployee.mainSyndicateCard && (
                            <div className='space-y-1'>
                              <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                                {language === 'AR' ? 'النقابة الرئيسية' : 'Main Syndicate'}
                              </span>
                              <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                                <img
                                  src={viewingEmployee.mainSyndicateCard}
                                  alt='Main Syndicate'
                                  className='max-w-full max-h-[400px] object-contain rounded-lg'
                                />
                              </div>
                            </div>
                          )}
                          {viewingEmployee.subSyndicateCard && (
                            <div className='space-y-1'>
                              <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                                {language === 'AR' ? 'النقابة الفرعية' : 'Sub Syndicate'}
                              </span>
                              <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                                <img
                                  src={viewingEmployee.subSyndicateCard}
                                  alt='Sub Syndicate'
                                  className='max-w-full max-h-[400px] object-contain rounded-lg'
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className='text-center py-8 bg-(--bg-card) border border-(--border-divider) border-dashed rounded-xl'>
                          <p className='text-sm text-gray-400'>
                            {language === 'AR'
                              ? 'لا يوجد صور للكارنيهات'
                              : 'No syndicate cards uploaded'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
