
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
import { TanStackTable } from '../common/TanStackTable';
import { SmartInput, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { ExpandingDropdown } from '../common/ExpandingDropdown';
import { usePosSounds } from '../common/hooks/usePosSounds';

interface EmployeeListProps {
  color: string;
  t: any;
  language: string;
  onUpdateEmployees?: (employees: Employee[]) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ color, t, language, onUpdateEmployees }) => {
  // --- State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({});
  
  // Dropdown open states for ExpandingDropdown
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  // Tab state for modal
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'documents'>('general');
  const [activeViewTab, setActiveViewTab] = useState<'general' | 'credentials' | 'documents'>('general');

  // Sounds
  const { playSuccess, playError, playBeep } = usePosSounds();

  // --- Data Persistence ---
  useEffect(() => {
    // Load data
    try {
      const stored = localStorage.getItem('pharma_employees');
      if (stored) {
        setEmployees(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  }, []);

  const saveToStorage = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    localStorage.setItem('pharma_employees', JSON.stringify(newEmployees));
    window.dispatchEvent(new Event('pharma_employees_updated'));
    if (onUpdateEmployees) onUpdateEmployees(newEmployees);
  };

  // --- Actions ---
  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ ...emp });
    setIsModalOpen(true);
  };

  const handleDelete = (emp: Employee) => {
    if (confirm(t.employeeList.deleteConfirm)) {
      const newEmployees = employees.filter(e => e.id !== emp.id);
      saveToStorage(newEmployees);
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
    let data = employees;
    
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
        let badgeClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        
        if (status === 'active') badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (status === 'holiday') badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
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

  // --- Form Logic ---
  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
        playError();
        return; // Validation failed
    }
  
    // Secure Password Hashing
    let hashedPassword = formData.password;
    
    // Only hash if a password is provided (and not already hashed, basic check)
    // In edit mode: if password field is empty, keep existing hash. If not empty, hash it.
    if (formData.password && formData.password.trim().length > 0) {
        const { hashPassword } = await import('../../utils/auth');
        hashedPassword = await hashPassword(formData.password);
    } else if (editingEmployee) {
        // Keep existing password if not changing
        hashedPassword = editingEmployee.password;
    }

    const finalFormData = {
        ...formData,
        password: hashedPassword
    };

    const isEdit = !!editingEmployee;
    let newEmployees = [...employees];

    if (isEdit) {
        newEmployees = newEmployees.map(e => e.id === editingEmployee.id ? { ...e, ...finalFormData } as Employee : e);
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
        newEmployees.push(newEmp);
    }

    saveToStorage(newEmployees);
    playSuccess();
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({});
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({});
    setIsDepartmentOpen(false);
    setIsRoleOpen(false);
    setIsStatusOpen(false);
    setActiveTab('general');
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

            <button
            onClick={() => { setFormData({}); setEditingEmployee(null); setIsModalOpen(true); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all active:scale-95 whitespace-nowrap`}
            >
            <span className="material-symbols-rounded">add</span>
            <span>{t.employeeList.addEmployee}</span>
            </button>
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
            ]}
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
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
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
                  className={`absolute -top-2 ${language === 'AR' ? '-left-2' : '-right-2'} w-7 h-7 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30 text-red-500 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-transform active:scale-95`}
                  title={language === 'AR' ? 'إزالة الصورة' : 'Remove Image'}
                >
                  <span className="material-symbols-rounded text-[18px]">close</span>
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
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>person</span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t.employeeList.personalInfo || "Personal Info"}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
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
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.position}</label>
                            <SmartInput
                            value={formData.position || ''}
                            onChange={e => setFormData({...formData, position: e.target.value})}
                            placeholder={t.employeeList.position}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.department}</label>
                            <div className="relative h-[42px]">
                            <ExpandingDropdown
                                className="absolute top-0 left-0 w-full z-30"
                                minHeight="42px"
                                items={Object.entries(t.employeeList.departments).map(([key, label]) => ({ key, label: label as string }))}
                                selectedItem={Object.entries(t.employeeList.departments).map(([key, label]) => ({ key, label: label as string })).find(d => d.key === (formData.department || 'pharmacy'))}
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
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.role}</label>
                            <div className="relative h-[42px]">
                            <ExpandingDropdown
                                className="absolute top-0 left-0 w-full z-30"
                                minHeight="42px"
                                items={Object.entries(t.employeeList.roles).map(([key, label]) => ({ key, label: label as string }))}
                                selectedItem={Object.entries(t.employeeList.roles).map(([key, label]) => ({ key, label: label as string })).find(r => r.key === (formData.role || 'pharmacist'))}
                                isOpen={isRoleOpen}
                                onToggle={() => { setIsRoleOpen(!isRoleOpen); setIsDepartmentOpen(false); setIsStatusOpen(false); }}
                                onSelect={(item) => { setFormData({...formData, role: item.key as any}); setIsRoleOpen(false); }}
                                renderItem={(item) => <span className="text-sm">{item.label}</span>}
                                renderSelected={(item) => <span className="text-sm">{item?.label || t.employeeList.role}</span>}
                                keyExtractor={(item) => item.key}
                                variant="input"
                                color={color}
                            />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.status}</label>
                            <div className="relative h-[42px]">
                            <ExpandingDropdown
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
                    </div>
                </div>

                {/* Section 2: Contact Info */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>contact_phone</span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t.employeeList.contactInfo || "Contact Info"}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.phone}</label>
                            <SmartPhoneInput
                            value={formData.phone || ''}
                            onChange={val => setFormData({...formData, phone: val})}
                            placeholder={t.employeeList.phone}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.email}</label>
                            <SmartEmailInput
                            value={formData.email || ''}
                            onChange={val => setFormData({...formData, email: val})}
                            placeholder={t.employeeList.email}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Additional */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className={`material-symbols-rounded text-${color}-500 text-lg`}>more_horiz</span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t.employeeList.additionalInfo || "Additional"}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.salary}</label>
                            <SmartInput
                            value={formData.salary || ''}
                            onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                            placeholder="0.00"
                            type="number"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.notes}</label>
                            <SmartInput
                            value={formData.notes || ''}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder="..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
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
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase px-1">{t.employeeList.password || 'Password'}</label>
                            <SmartInput
                            value={formData.password || ''}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder={editingEmployee ? "Unchanged" : (t.employeeList.passwordPlaceholder || "Login Password")}
                            type="password"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {editingEmployee && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3">
                            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm">warning</span>
                                {language === 'AR' 
                                    ? 'اترك حقل كلمة المرور فارغاً إذا كنت لا تريد تغييرها'
                                    : 'Leave password field empty if you don\'t want to change it'}
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
                                            className={`absolute -top-2 ${language === 'AR' ? '-left-2' : '-right-2'} w-6 h-6 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30 text-red-500 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity`}
                                        >
                                            <span className="material-symbols-rounded text-[14px]">close</span>
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
                                                    className={`absolute -top-2 ${language === 'AR' ? '-left-2' : '-right-2'} w-6 h-6 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30 text-red-500 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity`}
                                                >
                                                    <span className="material-symbols-rounded text-[14px]">close</span>
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

                        {/* Syndicate Cards - Side by Side */}
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
                                                className={`absolute -top-2 ${language === 'AR' ? '-left-2' : '-right-2'} w-6 h-6 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30 text-red-500 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity`}
                                            >
                                                <span className="material-symbols-rounded text-[14px]">close</span>
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
                                                className={`absolute -top-2 ${language === 'AR' ? '-left-2' : '-right-2'} w-6 h-6 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30 text-red-500 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity`}
                                            >
                                                <span className="material-symbols-rounded text-[14px]">close</span>
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
              ]}
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
                                    {viewingEmployee.name.charAt(0).toUpperCase()}
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
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        viewingEmployee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        viewingEmployee.status === 'holiday' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                        {t.employeeList.statusOptions[viewingEmployee.status]}
                                    </span>
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

                            {/* Syndicate Cards Section */}
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
