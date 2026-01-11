
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
import { useExpandingDropdown } from '../../hooks/useExpandingDropdown';
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
        <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
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
            onRowClick={handleEdit}
            globalFilter={searchQuery}
            enableSearch={false}
            enableTopToolbar={false}
         />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEmployee ? t.employeeList.editEmployee : t.employeeList.addEmployee}
        icon="badge"
      >
        <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.name}</label>
                   <SmartInput
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder={t.employeeList.name}
                      autoFocus
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      required
                   />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.phone}</label>
                   <SmartPhoneInput
                      value={formData.phone || ''}
                      onChange={val => setFormData({...formData, phone: val})}
                      placeholder={t.employeeList.phone}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.email}</label>
                   <SmartEmailInput
                      value={formData.email || ''}
                      onChange={val => setFormData({...formData, email: val})}
                      placeholder={t.employeeList.email}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.department}</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none"
                    value={formData.department || 'pharmacy'}
                    onChange={e => setFormData({...formData, department: e.target.value as any})}
                  >
                     {Object.entries(t.employeeList.departments).map(([key, label]) => (
                        <option key={key} value={key}>{label as string}</option>
                     ))}
                  </select>
               </div>
               
               <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.role}</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none"
                    value={formData.role || 'pharmacist'}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                  >
                     {Object.entries(t.employeeList.roles).map(([key, label]) => (
                        <option key={key} value={key}>{label as string}</option>
                     ))}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.position}</label>
                  <SmartInput
                      value={formData.position || ''}
                      onChange={e => setFormData({...formData, position: e.target.value})}
                      placeholder={t.employeeList.position}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.status}</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none"
                    value={formData.status || 'active'}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                     {Object.entries(t.employeeList.statusOptions).map(([key, label]) => (
                        <option key={key} value={key}>{label as string}</option>
                     ))}
                  </select>
               </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.username || 'Username'}</label>
                   <SmartInput
                      value={formData.username || ''}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      placeholder={t.employeeList.usernamePlaceholder || "Login Username"}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
               </div>
               <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.password || 'Password'}</label>
                   <SmartInput
                      value={formData.password || ''}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder={editingEmployee ? "Unchanged" : (t.employeeList.passwordPlaceholder || "Login Password")}
                      type="password"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
               </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.salary}</label>
                   <SmartInput
                      value={formData.salary || ''}
                      onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                      placeholder="0.00"
                      type="number"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
               </div>
               <div className="space-y-1">
                   <label className="text-xs font-medium text-gray-500 uppercase">{t.employeeList.notes}</label>
                   <SmartInput
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                   />
               </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
               <button onClick={closeModal} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  {t.employeeList.modal.cancel}
               </button>
               <button onClick={handleSave} className={`px-6 py-2 bg-${color}-500 hover:bg-${color}-600 text-white rounded-lg shadow-md transition-all active:scale-95`}>
                  {t.employeeList.modal.save}
               </button>
            </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title={t.employeeList.viewDetails}
        icon="badge"
      >
        <div className="p-5 space-y-5">
            {viewingEmployee && (
                <>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 text-xl font-bold`}>
                            {viewingEmployee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{viewingEmployee.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="font-mono">{viewingEmployee.employeeCode}</span>
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
                            <p className="text-sm font-medium text-gray-900 dark:text-white font-mono leading-snug">{viewingEmployee.phone}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.email}</label>
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug truncate">{viewingEmployee.email || '-'}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.salary}</label>
                            <p className="text-sm font-medium text-gray-900 dark:text-white font-mono leading-snug">
                                {viewingEmployee.salary ? viewingEmployee.salary.toLocaleString() : '-'}
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.employeeList.notes}</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{viewingEmployee.notes || '-'}</p>
                        </div>
                    </div>

                     <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button 
                            onClick={() => setViewingEmployee(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            {t.global.actions.close}
                        </button>
                    </div>
                </>
            )}
        </div>
      </Modal>

    </div>
  );
};
