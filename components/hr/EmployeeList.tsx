
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ColumnDef, 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';
import { Employee } from '../../types';
import { useData } from '../../services';
import { TanStackTable } from '../common/TanStackTable';
import { SmartInput, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { FilterDropdown } from '../common/FilterDropdown';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { UserRole, canPerformAction } from '../../config/permissions';
import { authService, UserSession } from '../../services/auth/authService';

// --- Smart Roles Configuration ---
// Dependency Matrix: Defines valid roles for each department
const DEPT_ROLES: Record<string, string[]> = {
  pharmacy: [
    'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 
    'assistant', 'inventory_officer', 'senior_cashier', 'officeboy'
  ],
  sales: ['cashier', 'senior_cashier'],
  marketing: ['manager', 'officeboy'],
  hr: ['hr_manager'],
  it: ['admin'],
  logistics: ['delivery', 'delivery_pharmacist']
};

interface EmployeeListProps {
  color: string;
  t: any;
  language: string;
  onUpdateEmployees?: (employees: Employee[]) => void;
  userRole: UserRole;
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
  userRole, 
  employees, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee 
}) => {
  // --- Data Context ---
  // Removed direct useData() call for employees/actions to enforce centralized logic
  // const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();

  // --- State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form State (extends Employee with form-only fields like oldPassword for verification)
  const [formData, setFormData] = useState<Partial<Employee> & { oldPassword?: string }>({});
  
  // Dropdown open states for FilterDropdown
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // --- Smart Roles Logic ---
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // 1. Access Matrix: Filter Departments based on User Role
  const availableDepartments = useMemo(() => {
    const allDepts = Object.entries(t.employeeList.departments).map(([key, label]) => ({ key, label: label as string }));
    
    if (!currentUser) return [];
    
    // Admin / Owner / HR -> See ALL
    if (currentUser.role === 'admin' || currentUser.role === 'pharmacist_owner' || currentUser.role === 'hr_manager') {
      // Owner/HR shouldn't usually see 'IT' unless specified, but for simplicity we show all except maybe sensitive ones?
      // Plan says Owner sees all except IT.
      if (currentUser.role === 'pharmacist_owner') {
         return allDepts.filter(d => d.key !== 'it');
      }
      return allDepts;
    }

    // Manager / Pharmacist Manager -> See Operations (Pharmacy, Sales, Logistics, Marketing)
    if (currentUser.role === 'manager' || currentUser.role === 'pharmacist_manager') {
       return allDepts.filter(d => ['pharmacy', 'sales', 'logistics', 'marketing'].includes(d.key));
    }
    
    // Fallback: If logic fails or other roles (restricted), ideally they shouldn't see this modal at all,
    // but if they do, show only their OWN department to be safe.
    return allDepts.filter(d => d.key === currentUser.department);

  }, [t.employeeList.departments, currentUser]);

  // 2. Dependency Matrix: Filter Roles based on Selected Department
  const availableRoles = useMemo(() => {
    const selectedDept = formData.department || 'pharmacy';
    const validRoles = DEPT_ROLES[selectedDept] || [];
    
    return Object.entries(t.employeeList.roles)
      .filter(([key]) => validRoles.includes(key))
      .map(([key, label]) => ({ key, label: label as string }));
  }, [t.employeeList.roles, formData.department]);

  // 3. Auto-Correction: Clear invalid role when department changes
  useEffect(() => {
    if (!formData.department) return;
    
    const validRoles = DEPT_ROLES[formData.department] || [];
    if (formData.role && !validRoles.includes(formData.role)) {
       // Reset role if invalid for new department
       setFormData(prev => ({ ...prev, role: undefined }));
    }
  }, [formData.department]); // Only run when dept changes

  // Tab state for modal
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'documents'>('general');
  const [activeViewTab, setActiveViewTab] = useState<'general' | 'credentials' | 'documents'>('general');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [wantsToChangePassword, setWantsToChangePassword] = useState(false);

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
    }
  };

  const handleView = (emp: Employee) => {
    setViewingEmployee(emp);
  };

  // --- Derived Data ---
  const counts = useMemo(() => {
    return {
      all: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      inactive: employees.filter(e => e.status === 'inactive').length,
      holiday: employees.filter(e => e.status === 'holiday').length
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    // Hide Super Admin from the list
    let data = employees.filter(e => e.id !== 'SUPER-ADMIN' && e.employeeCode !== 'EMP-000');
    
    // Status Filter
    if (statusFilter !== 'all') {
      data = data.filter(e => e.status === statusFilter);
    }

    return data;
  }, [employees, statusFilter]);

  // --- Columns ---
  const columns = useMemo<ColumnDef<Employee>[]>(() => [
    {
      accessorKey: 'employeeCode',
      header: t.employeeList.table.code,
      cell: ({ row }) => (
        <span className="font-bold text-gray-700 dark:text-gray-300">
          {row.original.employeeCode}
        </span>
      )
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
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t.employeeList.departments[row.original.department] || row.original.department}
        </span>
      )
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
          icon: 'cancel'
        };
        
        if (status === 'active') config = { color: 'emerald', icon: 'check_circle' };
        if (status === 'holiday') config = { color: 'amber', icon: 'beach_access' };

        return (
          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}>
            <span className="material-symbols-rounded text-sm">{config.icon}</span>
            {t.employeeList.statusOptions[status] || status}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2 w-full">
          <button 
            onClick={(e) => { e.stopPropagation(); handleView(row.original); }}
            className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">visibility</span>
          </button>
          {canPerformAction(userRole, 'users.manage') && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <span className="material-symbols-rounded text-[20px]">edit</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-rounded text-[20px]">delete</span>
              </button>
            </>
          )}
        </div>
      )
    }
  ], [t, employees]);

  // Safe UUID generator
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

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
        password: hashedPassword
    };

    const isEdit = !!editingEmployee;

    try {
      if (isEdit) {
          await onUpdateEmployee(editingEmployee.id, finalFormData);
      } else {
          // Generate ID and Code
          const maxSerial = employees.reduce((max, emp) => {
              const num = parseInt(emp.employeeCode.replace('EMP-', '') || '0');
              return Math.max(max, isNaN(num) ? 0 : num);
          }, 0);
          
          const newCode = `EMP-${String(maxSerial + 1).padStart(3, '0')}`;
          
          const newEmp: Employee = {
              id: generateUUID(),
              employeeCode: newCode,
              startDate: new Date().toISOString().split('T')[0],
              status: 'active',
              department: 'pharmacy',
              role: 'pharmacist',
              ...finalFormData as any
          };
          await onAddEmployee(newEmp);
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
  };

  // --- Render ---
  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
           <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.employeeList.title}</h2>
           <p className="text-sm text-gray-500 dark:text-gray-400">{t.employeeList.subtitle}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           {/* Status Filter */}
           <SegmentedControl
             value={statusFilter}
             onChange={(val) => setStatusFilter(val as string)}
             variant="onPage"
             size="sm"
             options={[
               { label: t.employeeList.statusOptions.all, count: counts.all, value: 'all' },
               { label: t.employeeList.statusOptions.active, count: counts.active, value: 'active', activeColor: 'green' },
               { label: t.employeeList.statusOptions.inactive, count: counts.inactive, value: 'inactive', activeColor: 'gray' },
               { label: t.employeeList.statusOptions.holiday, count: counts.holiday, value: 'holiday', activeColor: 'amber' },
             ]}
           />

           {/* Search */}
           <div className="relative w-full md:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-rounded text-gray-400">search</span>
                </span>
                <SmartInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.global?.actions?.search || "Search..."}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
            </div>

            {canPerformAction(userRole, 'users.manage') && (
              <button
                onClick={() => { setFormData({}); setEditingEmployee(null); setIsModalOpen(true); }}
                className={`flex items-center justify-center gap-2 px-4 py-2 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all active:scale-95 whitespace-nowrap`}
              >
                <span className="material-symbols-rounded">add</span>
                <span>{t.employeeList.addEmployee}</span>
              </button>
            )}
        </div>
      </div>

      {/* Main Content: Table */}
      <div className="flex-1 min-h-0 flex flex-col">
         <TanStackTable
            data={filteredEmployees}
            columns={columns}
            tableId="employee-list"
            color={color}
            emptyMessage="No employees found"
            onRowClick={handleView}
            globalFilter={searchQuery}
            enableSearch={false}
            enableTopToolbar={false}
         />
      </div>

      {/* Add/Edit Modal - Wide Layout with Tabs */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEmployee ? t.employeeList.editEmployee : t.employeeList.addEmployee}
        icon="badge"
        size="4xl"
        // Hide header close button when using tabs; ensure a cancel button exists in footer
        hideCloseButton={true}
        headerActions={
          <SegmentedControl
            options={[
              { value: 'general', label: language === 'AR' ? 'معلومات عامة' : 'General', icon: 'person' },
              { value: 'credentials', label: language === 'AR' ? 'بيانات الدخول' : 'Credentials', icon: 'lock' },
              { value: 'documents', label: language === 'AR' ? 'المستندات' : 'Documents', icon: 'description' }
            ].filter(opt => opt.value !== 'credentials' || (formData.role || 'pharmacist') !== 'officeboy')}
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'general' | 'credentials' | 'documents')}
            color={color}
          />
        }
      >
        <div className="flex gap-8 p-4">
          {/* Left Side - Image Upload (Fixed Width) */}
          <div className="flex flex-col items-center gap-3 shrink-0 pt-2">
            <div className="relative group">
              {formData.image ? (
                <img 
                  src={formData.image} 
                  alt="Employee" 
                  className="w-32 h-32 rounded-3xl object-cover shadow-sm border border-gray-100 dark:border-gray-700"
                />
              ) : (
                <div className={`w-32 h-32 rounded-3xl bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center text-${color}-600 dark:text-${color}-400 text-4xl font-bold border border-${color}-100 dark:border-${color}-900/30`}>
                  {getInitials(formData.name || '')}
                </div>
              )}
              <label 
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
                title={language === 'AR' ? 'تغيير الصورة' : 'Change Image'}
              >
                <span className="material-symbols-rounded text-white text-3xl drop-shadow-md">photo_camera</span>
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 500 * 1024) {
                        playError();
                        alert(language === 'AR' ? 'حجم الصورة كبير جداً (الحد الأقصى 500KB)' : 'Image too large (max 500KB)');
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
              {formData.image && (
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, image: undefined })}
                  className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-7 h-7 bg-gray-100 dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-lg text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 flex items-center justify-center shadow-inner`}
                  title={language === 'AR' ? 'إزالة الصورة' : 'Remove Image'}
                >
                  <span className="material-symbols-rounded text-[18px]" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                </button>
              )}
            </div>
            <div className="text-center">
                <p className="text-xs font-medium text-gray-500 mb-0.5">{language === 'AR' ? 'صورة شخصية' : 'Profile Photo'}</p>
                <p className="text-[10px] text-gray-400">Max 500KB</p>
            </div>
          </div>

          {/* Right Side - Form Fields */}
          <div className="flex-1 space-y-6">

            {/* Tab Content */}
            {activeTab === 'general' ? (
              <>
                {/* Compact Grid Layout for General Info */}
                <div className="grid grid-cols-12 gap-x-4 gap-y-5 pt-1">
                    
                    {/* Row 1: Name (8) + Status (4) */}
                    <div className="col-span-8 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.name}</label>
                        <SmartInput
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder={t.employeeList.name}
                            autoFocus
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            required
                        />
                    </div>
                    <div className="col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.status}</label>
                        <div className="relative h-[42px]">
                            <FilterDropdown
                                className="absolute top-0 left-0 w-full z-30"
                                minHeight="42px"
                                items={Object.entries(t.employeeList.statusOptions).filter(([key]) => key !== 'all').map(([key, label]) => ({ key, label: label as string }))}
                                selectedItem={Object.entries(t.employeeList.statusOptions).map(([key, label]) => ({ key, label: label as string })).find(s => s.key === (formData.status || 'active'))}
                                isOpen={isStatusOpen}
                                onToggle={() => { setIsStatusOpen(!isStatusOpen); setIsDepartmentOpen(false); setIsRoleOpen(false); }}
                                onSelect={(item) => { setFormData({...formData, status: item.key as any}); setIsStatusOpen(false); }}
                                renderItem={(item) => <span className="text-sm">{item.label}</span>}
                                renderSelected={(item) => <span className="text-sm">{item?.label || t.employeeList.status}</span>}
                                keyExtractor={(item) => item.key}
                                variant="input"
                                color={color}
                            />
                        </div>
                    </div>

                    {/* Row 2: Role (4) + Dept (4) + Position (4) */}
                    <div className="col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.department}</label>
                        <div className="relative h-[42px]">
                            <FilterDropdown
                                className="absolute top-0 left-0 w-full z-30"
                                minHeight="42px"
                                items={availableDepartments}
                                selectedItem={availableDepartments.find(d => d.key === (formData.department || 'pharmacy'))}
                                isOpen={isDepartmentOpen}
                                onToggle={() => { setIsDepartmentOpen(!isDepartmentOpen); setIsRoleOpen(false); setIsStatusOpen(false); }}
                                onSelect={(item) => { setFormData({...formData, department: item.key as any}); setIsDepartmentOpen(false); }}
                                renderItem={(item) => <span className="text-sm">{item.label}</span>}
                                renderSelected={(item) => <span className="text-sm">{item?.label || t.employeeList.department}</span>}
                                keyExtractor={(item) => item.key}
                                variant="input"
                                color={color}
                            />
                        </div>
                    </div>
                    <div className="col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.role}</label>
                        <div className="relative h-[42px]">
                            <FilterDropdown
                                className="absolute top-0 left-0 w-full z-30"
                                minHeight="42px"
                                items={availableRoles}
                                selectedItem={availableRoles.find(r => r.key === (formData.role || 'pharmacist'))}
                                isOpen={isRoleOpen}
                                onToggle={() => { setIsRoleOpen(!isRoleOpen); setIsDepartmentOpen(false); setIsStatusOpen(false); }}
                                onSelect={(item) => { 
                                    const newRole = item.key as any;
                                    setFormData({...formData, role: newRole}); 
                                    setIsRoleOpen(false);
                                }}
                                renderItem={(item) => <span className="text-sm">{item.label}</span>}
                                renderSelected={(item) => <span className="text-sm">{item?.label || t.employeeList.role}</span>}
                                keyExtractor={(item) => item.key}
                                variant="input"
                                color={color}
                            />
                        </div>
                    </div>
                    <div className="col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.position}</label>
                        <SmartInput
                            value={formData.position || ''}
                            onChange={e => setFormData({...formData, position: e.target.value})}
                            placeholder={t.employeeList.position}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Row 3: Phone (6) + Email (6) */}
                    <div className="col-span-6 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.phone}</label>
                        <SmartPhoneInput
                            value={formData.phone || ''}
                            onChange={val => setFormData({...formData, phone: val})}
                            placeholder={t.employeeList.phone}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>
                    <div className="col-span-6 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.email}</label>
                        <SmartEmailInput
                            value={formData.email || ''}
                            onChange={val => setFormData({...formData, email: val})}
                            placeholder={t.employeeList.email}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Row 4: Salary (4) + Notes (8) */}
                    <div className="col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.salary}</label>
                        <div className="relative">
                            <SmartInput
                                value={formData.salary || ''}
                                onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                                placeholder="0.00"
                                type="number"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none pl-9"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        </div>
                    </div>
                    <div className="col-span-8 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.notes}</label>
                        <SmartInput
                            value={formData.notes || ''}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder={language === 'AR' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>
                </div>
              </>
            ) : activeTab === 'credentials' ? (
              <>
                {/* Credentials Tab */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>lock</span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t.employeeList.credentials || "Login Credentials"}</h3>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl mt-0.5">info</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    {language === 'AR' ? 'معلومات الدخول للنظام' : 'System Login Information'}
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {language === 'AR' 
                                        ? 'استخدم هذه البيانات للدخول إلى النظام. تأكد من استخدام كلمة مرور قوية.'
                                        : 'Use these credentials to login to the system. Make sure to use a strong password.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.username || 'Username'}</label>
                            <SmartInput
                            value={formData.username || ''}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            placeholder={t.employeeList.usernamePlaceholder || "Login Username"}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                        {/* Password field for NEW employees */}
                        {!editingEmployee && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.password || 'Password'}</label>
                            <SmartInput
                            value={formData.password || ''}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder={t.employeeList.passwordPlaceholder || "Login Password"}
                            type="password"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                        )}
                    </div>

                    {/* Password Change Section - Only when EDITING and user WANTS to change */}
                    {editingEmployee && editingEmployee.password && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        {!wantsToChangePassword ? (
                            /* Button to initiate password change */
                            <button
                                type="button"
                                onClick={() => setWantsToChangePassword(true)}
                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <span className="material-symbols-rounded text-lg">key</span>
                                {language === 'AR' ? 'تغيير كلمة المرور' : 'Change Password'}
                                <span className="material-symbols-rounded text-lg">chevron_right</span>
                            </button>
                        ) : (
                            /* Password change form */
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>key</span>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            {language === 'AR' ? 'تغيير كلمة المرور' : 'Change Password'}
                                        </h4>
                                        {isOldPasswordVerified && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                                {language === 'AR' ? 'تم التحقق' : 'Verified'}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setWantsToChangePassword(false); setIsOldPasswordVerified(false); setPasswordError(''); setFormData({...formData, oldPassword: '', password: ''}); }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <span className="material-symbols-rounded">close</span>
                                    </button>
                                </div>

                                {!isOldPasswordVerified ? (
                                    /* Step 1: Verify Old Password */
                                    <div className="space-y-3">
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3">
                                            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                                <span className="material-symbols-rounded text-sm">info</span>
                                                {language === 'AR' 
                                                    ? 'أدخل كلمة المرور الحالية للتحقق من هويتك قبل تغييرها'
                                                    : 'Enter current password to verify your identity before changing it'}
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1 space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase px-1">
                                                    {language === 'AR' ? 'كلمة المرور الحالية' : 'Current Password'}
                                                </label>
                                                <SmartInput
                                                    value={formData.oldPassword || ''}
                                                    onChange={e => { setFormData({...formData, oldPassword: e.target.value}); setPasswordError(''); }}
                                                    placeholder={language === 'AR' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                                                    type="password"
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${passwordError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                                />
                                                {passwordError && (
                                                    <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 px-1">
                                                        <span className="material-symbols-rounded text-sm">error</span>
                                                        {passwordError}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-end pb-0.5">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setPasswordError('');
                                                        if (!formData.oldPassword || formData.oldPassword.trim().length === 0) {
                                                            playError();
                                                            setPasswordError(language === 'AR' ? 'أدخل كلمة المرور' : 'Enter password');
                                                            return;
                                                        }
                                                        const { verifyPassword } = await import('../../services/auth/hashUtils');
                                                        const isValid = await verifyPassword(formData.oldPassword, editingEmployee.password!);
                                                        if (isValid) {
                                                            playSuccess();
                                                            setIsOldPasswordVerified(true);
                                                            setPasswordError('');
                                                        } else {
                                                            playError();
                                                            setPasswordError(language === 'AR' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
                                                        }
                                                    }}
                                                    className={`px-4 py-2.5 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all active:scale-95 font-medium flex items-center gap-2`}
                                                >
                                                    <span className="material-symbols-rounded text-[18px]">verified_user</span>
                                                    {language === 'AR' ? 'تحقق' : 'Verify'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Step 2: Enter New Password (only after verification) */
                                    <div className="space-y-3">
                                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl p-3">
                                            <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-2">
                                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                                {language === 'AR' 
                                                    ? 'تم التحقق! يمكنك الآن إدخال كلمة المرور الجديدة'
                                                    : 'Verified! You can now enter the new password'}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">
                                                {language === 'AR' ? 'كلمة المرور الجديدة' : 'New Password'}
                                            </label>
                                            <SmartInput
                                                value={formData.password || ''}
                                                onChange={e => setFormData({...formData, password: e.target.value})}
                                                placeholder={language === 'AR' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                                                type="password"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    )}

                    {editingEmployee && !editingEmployee.password && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 mt-4">
                            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm">warning</span>
                                {language === 'AR' 
                                    ? 'هذا الموظف ليس لديه كلمة مرور. أضف كلمة مرور جديدة من الأعلى.'
                                    : 'This employee has no password. Add a new password above.'}
                            </p>
                        </div>
                    )}
                </div>
              </>
            ) : activeTab === 'documents' ? (
              <>
                {/* Documents Tab */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>description</span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{language === 'AR' ? 'المستندات الرسمية' : 'Official Documents'}</h3>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl mt-0.5">info</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    {language === 'AR' ? 'رفع المستندات المطلوبة' : 'Upload Required Documents'}
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {language === 'AR' 
                                        ? 'الحجم الأقصى للملف: 500 كيلوبايت | الصيغ المدعومة: JPG, PNG, PDF'
                                        : 'Max file size: 500KB | Supported formats: JPG, PNG, PDF'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        {/* National ID Card - Both Faces */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1 flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm">badge</span>
                                {language === 'AR' ? 'البطاقة الشخصية' : 'National ID Card'}
                            </label>
                            <div className="flex items-center gap-4">
                                {/* Front Face */}
                                {formData.nationalIdCard ? (
                                    <div className="relative group">
                                        <img 
                                            src={formData.nationalIdCard} 
                                            alt="National ID Front" 
                                            className="h-24 w-auto rounded-xl object-contain"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, nationalIdCard: undefined })}
                                            className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                                        >
                                            <span className="material-symbols-rounded text-[16px]" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50">
                                            <span className="material-symbols-rounded text-gray-400">upload</span>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{language === 'AR' ? 'اضغط لرفع الوجه الأمامي' : 'Upload Front'}</span>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 500 * 1024) {
                                                            playError();
                                                            alert(language === 'AR' ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)' : 'File too large (max 500KB)');
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, nationalIdCard: reader.result as string });
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
                                            <div className="relative group">
                                                <img 
                                                    src={formData.nationalIdCardBack} 
                                                    alt="National ID Back" 
                                                    className="h-24 w-auto rounded-xl object-contain"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, nationalIdCardBack: undefined })}
                                                    className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                                                >
                                                    <span className="material-symbols-rounded text-[16px]" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={`flex items-center justify-center w-24 h-24 border-2 border-dashed border-${color}-300 dark:border-${color}-600 rounded-xl hover:border-${color}-400 dark:hover:border-${color}-500 transition-colors cursor-pointer bg-${color}-50/50 dark:bg-${color}-900/10`}>
                                                <span className={`material-symbols-rounded text-${color}-500 text-2xl`}>add</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 500 * 1024) {
                                                                playError();
                                                                alert(language === 'AR' ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)' : 'File too large (max 500KB)');
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData({ ...formData, nationalIdCardBack: reader.result as string });
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
                        <div className="grid grid-cols-2 gap-4">
                            {/* Main Syndicate Card */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase px-1 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-sm">card_membership</span>
                                    {language === 'AR' ? 'كارنية النقابة الرئيسية' : 'Main Syndicate Card'}
                                </label>
                                <div className="flex items-center gap-4">
                                    {formData.mainSyndicateCard ? (
                                        <div className="relative group">
                                            <img 
                                                src={formData.mainSyndicateCard} 
                                                alt="Main Syndicate Card" 
                                                className="h-24 w-auto rounded-xl object-contain"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, mainSyndicateCard: undefined })}
                                                className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                                            >
                                                <span className="material-symbols-rounded text-[16px]" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50">
                                                <span className="material-symbols-rounded text-gray-400">upload</span>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{language === 'AR' ? 'رفع' : 'Upload'}</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 500 * 1024) {
                                                                playError();
                                                                alert(language === 'AR' ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)' : 'File too large (max 500KB)');
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData({ ...formData, mainSyndicateCard: reader.result as string });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sub Syndicate Card */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase px-1 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-sm">workspace_premium</span>
                                    {language === 'AR' ? 'كارنية النقابة الفرعية' : 'Sub Syndicate Card'}
                                </label>
                                <div className="flex items-center gap-4">
                                    {formData.subSyndicateCard ? (
                                        <div className="relative group">
                                            <img 
                                                src={formData.subSyndicateCard} 
                                                alt="Sub Syndicate Card" 
                                                className="h-24 w-auto rounded-xl object-contain"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, subSyndicateCard: undefined })}
                                                className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                                            >
                                                <span className="material-symbols-rounded text-[16px]" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50">
                                                <span className="material-symbols-rounded text-gray-400">upload</span>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{language === 'AR' ? 'رفع' : 'Upload'}</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 500 * 1024) {
                                                                playError();
                                                                alert(language === 'AR' ? 'حجم الملف كبير جداً (الحد الأقصى 500KB)' : 'File too large (max 500KB)');
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setFormData({ ...formData, subSyndicateCard: reader.result as string });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
              </>
            ) : null}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
          <button onClick={closeModal} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium">
            {t.employeeList.modal.cancel}
          </button>
          <button onClick={handleSave} className={`px-8 py-2.5 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all active:scale-95 font-bold`}>
            {t.employeeList.modal.save}
          </button>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => { setViewingEmployee(null); setActiveViewTab('general'); }}
        title={t.employeeList.viewDetails}
        size="3xl"
        hideCloseButton={true}
        headerActions={
            <SegmentedControl
              options={[
                { value: 'general', label: language === 'AR' ? 'معلومات عامة' : 'General', icon: 'person' },
                { value: 'credentials', label: language === 'AR' ? 'بيانات الدخول' : 'Credentials', icon: 'lock' },
                { value: 'documents', label: language === 'AR' ? 'المستندات' : 'Documents', icon: 'description' }
              ].filter(opt => opt.value !== 'credentials' || viewingEmployee?.role === 'pharmacist')}
              value={activeViewTab}
              onChange={(value) => setActiveViewTab(value as 'general' | 'credentials' | 'documents')}
              color={color}
              size="sm"
            />
        }
      >
        <div className="p-5 space-y-5">
            {viewingEmployee && (
                <>
                    {activeViewTab === 'general' ? (
                        <>
                             <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                {viewingEmployee.image ? (
                                  <img 
                                    src={viewingEmployee.image} 
                                    alt={viewingEmployee.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                  />
                                ) : (
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 text-xl font-bold`}>
                                    {getInitials(viewingEmployee.name)}
                                  </div>
                                )}
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{viewingEmployee.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>{viewingEmployee.employeeCode}</span>
                                        <span>•</span>
                                        <span>{t.employeeList.departments[viewingEmployee.department]}</span>
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    {(() => {
                                        const status = viewingEmployee.status;
                                        let config = { color: 'gray', icon: 'cancel' };
                                        if (status === 'active') config = { color: 'emerald', icon: 'check_circle' };
                                        if (status === 'holiday') config = { color: 'amber', icon: 'beach_access' };
                                        
                                        return (
                                            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}>
                                                <span className="material-symbols-rounded text-xs">{config.icon}</span>
                                                {t.employeeList.statusOptions[status]}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.position}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{viewingEmployee.position}</p>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.role}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{t.employeeList.roles[viewingEmployee.role]}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.phone}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{viewingEmployee.phone}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.email}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug truncate">{viewingEmployee.email || '-'}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.salary}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                        {viewingEmployee.salary ? viewingEmployee.salary.toLocaleString() : '-'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.notes}</label>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{viewingEmployee.notes || '-'}</p>
                                </div>
                            </div>
                        </>
                    ) : activeViewTab === 'credentials' ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl mt-0.5">lock_person</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                            {language === 'AR' ? 'بيانات الدخول المسجلة' : 'Registered Login Credentials'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.username || 'Username'}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        {viewingEmployee.username || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.password || 'Password'}</label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        ••••••••
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* National ID Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="material-symbols-rounded text-gray-400 text-lg">badge</span>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {language === 'AR' ? 'البطاقة الشخصية' : 'National ID Card'}
                                    </h3>
                                </div>
                                {(viewingEmployee.nationalIdCard || viewingEmployee.nationalIdCardBack) ? (
                                    <div className="flex items-center gap-4">
                                        {viewingEmployee.nationalIdCard && (
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase px-1">{language === 'AR' ? 'الوجه الأمامي' : 'Front Face'}</span>
                                                <img 
                                                    src={viewingEmployee.nationalIdCard} 
                                                    alt="National ID Front" 
                                                    className="h-24 w-auto rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                        {viewingEmployee.nationalIdCardBack && (
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase px-1">{language === 'AR' ? 'الوجه الخلفي' : 'Back Face'}</span>
                                                <img 
                                                    src={viewingEmployee.nationalIdCardBack} 
                                                    alt="National ID Back" 
                                                    className="h-24 w-auto rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-400">
                                            {language === 'AR' ? 'لا يوجد صور للبطاقة' : 'No ID card images uploaded'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Syndicate Cards Section - Only for Pharmacists */}
                            {viewingEmployee.role === 'pharmacist' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="material-symbols-rounded text-gray-400 text-lg">card_membership</span>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {language === 'AR' ? 'كارنيهات النقابة' : 'Syndicate Cards'}
                                    </h3>
                                </div>
                                {(viewingEmployee.mainSyndicateCard || viewingEmployee.subSyndicateCard) ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {viewingEmployee.mainSyndicateCard && (
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase px-1">{language === 'AR' ? 'النقابة الرئيسية' : 'Main Syndicate'}</span>
                                                <img 
                                                    src={viewingEmployee.mainSyndicateCard} 
                                                    alt="Main Syndicate" 
                                                    className="h-24 w-auto rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                        {viewingEmployee.subSyndicateCard && (
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase px-1">{language === 'AR' ? 'النقابة الفرعية' : 'Sub Syndicate'}</span>
                                                <img 
                                                    src={viewingEmployee.subSyndicateCard} 
                                                    alt="Sub Syndicate" 
                                                    className="h-24 w-auto rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-400">
                                            {language === 'AR' ? 'لا يوجد صور للكارنيهات' : 'No syndicate cards uploaded'}
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
        
        {viewingEmployee && (
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => { setViewingEmployee(null); setActiveViewTab('general'); }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                    {t.employeeList.modal.cancel}
                </button>
            </div>
        )}
      </Modal>

    </div>
  );
};
