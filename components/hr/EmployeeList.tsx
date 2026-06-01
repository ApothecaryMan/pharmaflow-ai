import {
  type ColumnDef,
} from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { permissionsService } from '../../services/auth/permissionsService';
import { useData } from '../../services';
import { authService } from '../../services/auth/authService';
import type { Branch, Employee, UserSession } from '../../types';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { SegmentedControl } from '../common/SegmentedControl';
import { type FilterConfig } from '../common/FilterPill';
import { TanStackTable } from '../common/TanStackTable';
import { Switch } from '../common/Switch';
import { employeeService } from '../../services/hr/employeeService';
import { orgService } from '../../services/org/orgService';
import { SearchInput } from '../common/SearchInput';
import { PageHeader } from '../common/PageHeader';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { HireEmployeeModal } from './HireEmployeeModal';

interface EmployeeListProps {
  color: string;
  t: any;
  language: string;
  onUpdateEmployees?: (employees: Employee[]) => void;
  employees: Employee[];
  onAddEmployee: (employee: Employee) => Promise<void>;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  isLoading?: boolean;
  onViewChange?: (view: string) => void;
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
  isLoading = false,
  onViewChange,
}) => {
  // --- Data Context ---
  const { branches } = useData();

  // --- State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // --- Smart Roles Logic ---
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Global View State
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [allEmployeesFetched, setAllEmployeesFetched] = useState<Employee[]>([]);
  const [isFetchingGlobal, setIsFetchingGlobal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch all employees when "Global View" is toggled
  // Fetch all employees in the active organization on mount for validation & global view
  useEffect(() => {
    if (allEmployeesFetched.length === 0 && !isFetchingGlobal) {
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
  }, [allEmployeesFetched.length, isFetchingGlobal]);

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

  // Sounds
  const { playSuccess, playError, playBeep } = usePosSounds();

  // --- Actions ---
  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
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
      mode: 'single',
      options: Object.entries(t.employeeList.statusOptions)
        .filter(([key]) => key !== 'all')
        .map(([key, label]) => ({
          label: label as string,
          value: key,
          icon: key === 'active' ? 'check_circle' : key === 'holiday' ? 'beach_access' : key === 'pending' ? 'pending' : 'cancel',
          color: key === 'active' ? 'emerald' : key === 'holiday' ? 'amber' : 'gray'
        }))
    },
    {
      id: 'department',
      label: t.employeeList.department,
      icon: 'business',
      mode: 'single',
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
          let badgeClass = 'badge-neutral';
          let icon = 'cancel';

          if (status === 'active') {
            badgeClass = 'badge-success';
            icon = 'check_circle';
          } else if (status === 'holiday') {
            badgeClass = 'badge-warning';
            icon = 'beach_access';
          }

          return (
            <span className={`${badgeClass} gap-1.5`}>
              <span className='material-symbols-rounded'>{icon}</span>
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
            <span className='badge-neutral gap-1.5'>
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
    [t, employees, branches, handleView, handleEdit, handleDelete]
  );

  // --- Form Logic ---
  const handleFormSave = async (finalFormData: Partial<Employee>) => {
    const isEdit = !!editingEmployee;
    try {
      if (isEdit) {
        await onUpdateEmployee(editingEmployee!.id, finalFormData);
      } else {
        const newEmp: Employee = {
          id: '', // Will be generated by service
          employeeCode: '', // Will be generated by service
          startDate: new Date().toISOString().split('T')[0],
          status: 'active',
          department: 'pharmacy',
          role: 'pharmacist',
          ...(finalFormData as any),
        };
        await onAddEmployee(newEmp);
      }

      // Refresh global list if in global view to ensure parity
      if (showAllBranches) {
        try {
          const all = await employeeService.getAll('ALL');
          setAllEmployeesFetched(all);
        } catch (err) {}
      }

      if (onUpdateEmployees) onUpdateEmployees(employees);
    } catch (error) {
      console.error('Failed to save employee', error);
      throw error;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  // --- Render ---
  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in overflow-hidden'>
      <PageHeader
        leftContent={
          <div className="w-full max-w-md">
            <SearchInput
              value={globalFilter}
              onSearchChange={setGlobalFilter}
              placeholder={t.employeeList.searchPlaceholder}
              color={color}
              filterConfigs={employeeFilterConfigs}
              activeFilters={activeFilters}
              onUpdateFilter={(id, vals) => setActiveFilters(prev => ({ ...prev, [id]: vals }))}
            />
          </div>
        }
        centerContent={
          <SegmentedControl
            options={[
              { value: 'staff-overview', label: t.employeeList.navTabs.overview, icon: 'supervisor_account' },
              { value: 'employee-list', label: t.employeeList.navTabs.employees, icon: 'badge' },
              { value: 'employee-profile', label: t.employeeList.navTabs.profile, icon: 'person' }
            ]}
            value="employee-list"
            onChange={(val) => onViewChange?.(val as any)}
            size="md"
            iconSize="--icon-lg"
            shape="pill"
            className="w-full sm:w-[480px]"
            useGraphicFont={true}
          />
        }
        rightContent={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 px-3 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none shrink-0">
                  {t.employeeList.globalView}
                </span>
                <Switch
                  checked={showAllBranches}
                  onChange={setShowAllBranches}
                  activeColor={color}
                />
              </label>

            {permissionsService.can('users.manage') && (
              <>
                <button
                  onClick={() => setIsHireModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-6 h-10 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95 whitespace-nowrap font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>person_add</span>
                  <span>{language === 'AR' ? 'تعيين عبر الاسم' : 'Hire via Username'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-6 h-10 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                  <span>{t.employeeList.addEmployee}</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Main Content: Table */}
      <div className='flex-1 min-h-0 flex flex-col'>
        <TanStackTable
          data={filteredEmployees}
          columns={columns}
          tableId='employee-list'
          color={color}
          emptyMessage={t.employeeList.emptyMessage}
          onRowClick={handleView}
          isLoading={isLoading}
          enableSearch={false}
          globalFilter={globalFilter}
          onSearchChange={setGlobalFilter}
          initialFilters={activeFilters}
          onFilterChange={setActiveFilters}
          enableTopToolbar={true}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
          filterableColumns={employeeFilterConfigs}
        />
      </div>

      {/* Add/Edit Modal */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        employee={editingEmployee}
        onSave={handleFormSave}
        employeesListToCheck={allEmployeesFetched.length > 0 ? allEmployeesFetched : employees}
        branches={branches}
        availableDepartments={availableDepartments}
        language={language}
        color={color}
        t={t.employeeList}
      />

      {/* View Details Modal */}
      <EmployeeDetailsModal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        employee={viewingEmployee}
        language={language}
        t={t.employeeList}
      />

      {/* Hire via Username Modal */}
      <HireEmployeeModal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
        language={language}
      />
    </div>
  );
};
