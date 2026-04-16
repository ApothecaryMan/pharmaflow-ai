import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { TanStackTable } from '../common/TanStackTable';
import type { Employee, Branch } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { ORG_ROLES } from '../../config/permissions';
import { getRoleLabel } from '../../config/employeeRoles';
import { CARD_BASE } from '../../utils/themeStyles';

interface MemberPermissionMatrixProps {
  employees: Employee[];
  branches: Branch[];
  language: 'EN' | 'AR';
  currentEmployeeId?: string;
  color?: string;
  onUpdate: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
  isLoading?: boolean;
}

export const MemberPermissionMatrix: React.FC<MemberPermissionMatrixProps> = ({
  employees,
  branches,
  language,
  currentEmployeeId,
  color = 'primary',
  onUpdate,
  isLoading = false
}) => {
  const t = TRANSLATIONS[language].orgManagement;
  const ownersCount = employees.filter(e => e.orgRole === 'owner').length;

  const columns = React.useMemo<ColumnDef<Employee>[]>(() => [
    {
      accessorKey: 'name',
      header: t.member,
      meta: { align: 'start' },
      cell: (info) => {
        const employee = info.row.original;
        const isSelf = employee.id === currentEmployeeId;
        return (
          <div className="flex flex-col py-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'AR' ? (employee.nameArabic || employee.name) : employee.name}
              </span>
              {isSelf && (
                <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-sm)' }}>person</span>
                  {language === 'AR' ? 'أنت' : 'YOU'}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 font-mono tracking-tighter opacity-70">{employee.employeeCode}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'email',
      header: t.email,
      meta: { align: 'start' },
      cell: (info) => <span className="text-sm text-zinc-600 dark:text-zinc-400 font-mono tracking-tight">{info.getValue() as string || '-'}</span>
    },
    {
      accessorKey: 'orgRole',
      header: t.globalRole,
      meta: { align: 'center' },
      cell: (info) => {
        const role = info.getValue() as string;
        const employeeId = info.row.original.id;
        const isLastOwner = role === 'owner' && ownersCount <= 1;
        
        return (
          <div className="flex flex-col items-center gap-1">
            <select
              value={role}
              disabled={isLastOwner}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate(employeeId, { orgRole: e.target.value as any })}
              className={`text-xs p-1.5 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-1 focus:ring-blue-500 outline-none transition-all ${
                isLastOwner ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : 'hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
              style={{ minWidth: '100px' }}
              title={isLastOwner ? t.lastOwnerWarning : ''}
            >
              {ORG_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {getRoleLabel(r.id, t)}
                </option>
              ))}
            </select>
            {isLastOwner && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold uppercase tracking-wide">
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-xs)' }}>warning</span>
                {t.lastOwnerWarning}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'branchId',
      header: t.primaryBranch,
      meta: { align: 'start' },
      cell: (info) => {
        const currentBranchId = info.getValue() as string;
        const employeeId = info.row.original.id;

        return (
          <select
            value={currentBranchId}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate(employeeId, { branchId: e.target.value })}
            className="text-xs p-1.5 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 outline-none w-full max-w-[200px] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all font-medium py-1.5"
          >
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      accessorKey: 'status',
      header: t.status,
      meta: { align: 'center' },
      cell: (info) => {
        const status = info.getValue() as string;
        const isActive = status === 'active';
        
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-transparent ${
            isActive 
              ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' 
              : 'text-zinc-500 border-zinc-200 dark:border-zinc-800/50'
          }`}>
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-sm)' }}>
              {isActive ? 'check_circle' : 'cancel'}
            </span>
            {isActive ? t.active : t.inactive}
          </span>
        );
      }
    }
  ], [language, t, currentEmployeeId, ownersCount, branches, onUpdate]);

  return (
    <div className={`rounded-3xl ${CARD_BASE} overflow-hidden group`}>
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>group</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              {t.permissionsTitle}
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              {t.permissionsSubtitle}
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
          <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-sm)' }}>info</span>
          {t.multiBranchAccessNote}
        </div>
      </div>

      <div className="p-0">
        <TanStackTable
          data={employees}
          columns={columns}
          isLoading={isLoading}
          lite
          dense
          enableVirtualization={employees.length > 30}
          tableId="org-member-matrix"
          color={color}
          searchPlaceholder={t.searchPlaceholder}
        />
      </div>
    </div>
  );
};
