import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useData } from '../../services';
import { useSettings } from '../../context';
import { authService } from '../../services/auth/authService';
import type { LoginAuditEntry } from '../../types';
import { branchService } from '../../services/branchService';
import { TanStackTable } from '../common/TanStackTable';
import { Switch } from '../common/Switch';
import { permissionsService } from '../../services/auth/permissions';

/**
 * LoginAuditList Component
 * Displays a detailed log of user authentication events using TanStackTable.
 */
export const LoginAuditList: React.FC<{ language: 'EN' | 'AR' }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const { employees, activeBranchId, branches } = useData();
  const { theme: currentTheme } = useSettings();
  const [showAllBranches, setShowAllBranches] = useState(false);

  // Check if current user is Super Admin to show the toggle
  const currentUser = authService.getCurrentUserSync();
  const isSuperAdmin = permissionsService.isOrgAdmin();

  const history: LoginAuditEntry[] = useMemo(
    () => authService.getLoginHistory(showAllBranches ? undefined : activeBranchId),
    [activeBranchId, showAllBranches]
  );

  const getActionInfo = (action: string) => {
    switch (action) {
      case 'login':
        return {
          label: t.loginAudit.actions.login,
          icon: 'login',
          colors: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'logout':
        return {
          label: t.loginAudit.actions.logout,
          icon: 'logout',
          colors: 'text-rose-700 dark:text-rose-400',
        };
      case 'switch_user':
        return {
          label: t.loginAudit.actions.switch,
          icon: 'sync_alt',
          colors: 'text-amber-700 dark:text-amber-400',
        };
      case 'system_login':
        return {
          label: t.loginAudit.actions.system_login,
          icon: 'admin_panel_settings',
          colors: 'text-indigo-700 dark:text-indigo-400',
        };
      case 'system_logout':
        return {
          label: t.loginAudit.actions.system_logout,
          icon: 'no_accounts',
          colors: 'text-indigo-700 dark:text-indigo-400',
        };
      case 'switch_branch':
        return {
          label: t.loginAudit.actions.switchBranch || 'SWITCH BRANCH',
          icon: 'storefront',
          colors: 'text-cyan-700 dark:text-cyan-400',
        };
      default:
        return {
          label: action,
          icon: 'info',
          colors: 'text-gray-700 dark:text-gray-400',
        };
    }
  };

  /**
   * Translates dynamic details strings (e.g., "Switched from...")
   */
  const translateDetails = (details: string | undefined): React.ReactNode => {
    if (!details) return '-';

    // Pattern 1a: Switched from {from} to {to}
    const branchSwitchMatch = details.match(/^Switched from (.*) to (.*)$/);
    if (branchSwitchMatch) {
      const parts = t.loginAudit.detailPatterns.switchedBranch
        .split(/({{(?:from|to)}})/)
        .filter(Boolean);
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {parts.map((part, i) => {
            if (part === '{{from}}') {
              return (
                <span key={i} className='text-gray-900 dark:text-white font-semibold mx-1'>
                  {branchSwitchMatch[1]}
                </span>
              );
            }
            if (part === '{{to}}') {
              return (
                <span key={i} className='text-gray-900 dark:text-white font-semibold mx-1'>
                  {branchSwitchMatch[2]}
                </span>
              );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
        </span>
      );
    }

    // Pattern 1b: Switched from {name} (User switch)
    const switchMatch = details.match(/^Switched from (.*)$/);
    if (switchMatch) {
      const translated = t.loginAudit.detailPatterns.switchedFrom.split('{{name}}');
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {translated[0]}
          <span className='text-gray-900 dark:text-white font-semibold mx-1'>{switchMatch[1]}</span>
          {translated[1]}
        </span>
      );
    }

    // Pattern 2: Account: {name}
    const accountMatch = details.match(/^Account: (.*)$/);
    if (accountMatch) {
      const translated = t.loginAudit.detailPatterns.account.split('{{name}}');
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {translated[0]}
          <span className='text-gray-900 dark:text-white font-semibold mx-1'>
            {accountMatch[1]}
          </span>
          {translated[1]}
        </span>
      );
    }

    // Pattern 3: Employee signed out
    if (details === 'Employee signed out') {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {t.loginAudit.detailPatterns.employeeSignedOut}
        </span>
      );
    }

    // Pattern 4: Account Logout
    if (details === 'Account Logout') {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {t.loginAudit.detailPatterns.accountLogout}
        </span>
      );
    }

    // Pattern 5: System session started
    if (details === 'System session started') {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {t.loginAudit.detailPatterns.systemSessionStarted}
        </span>
      );
    }

    // Pattern 6: Employee session started
    if (details === 'Employee session started') {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {t.loginAudit.detailPatterns.employeeSessionStarted}
        </span>
      );
    }

    return <span className='text-gray-500 dark:text-gray-400'>{details}</span>;
  };

  const columns = useMemo<ColumnDef<LoginAuditEntry>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t.loginAudit.headers.id,
        cell: (info) => (
          <span className='font-semibold text-gray-800 dark:text-gray-200'>
            {String(info.getValue()).substring(0, 8)}
          </span>
        ),
        meta: { width: 80, align: 'start' },
      },
      {
        accessorKey: 'timestamp',
        header: t.loginAudit.headers.timestamp,
        cell: (info) => {
          const date = new Date(String(info.getValue()));
          const now = new Date();

          const isToday = date.toDateString() === now.toDateString();
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = date.toDateString() === yesterday.toDateString();

          let timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

          // Apply translations for AM/PM
          timeStr = timeStr.replace('AM', t.loginAudit.am).replace('PM', t.loginAudit.pm);

          let dateStr = '';
          if (isToday) {
            dateStr = t.loginAudit.today;
          } else if (isYesterday) {
            dateStr = t.loginAudit.yesterday;
          } else {
            dateStr = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
          }

          return (
            <div className='flex items-center gap-2 whitespace-nowrap'>
              <span className='text-[11px] font-bold text-gray-800 dark:text-gray-200'>
                {timeStr}
              </span>
              {dateStr && (
                <span className='text-[10px] text-gray-400 font-medium opacity-60'>{dateStr}</span>
              )}
            </div>
          );
        },
        meta: { width: 160, align: 'center' },
      },
      {
        accessorKey: 'username',
        header: t.loginAudit.headers.user,
        cell: (info) => {
          const username = String(info.getValue());
          const row = info.row.original;
          const isAdmin = username === 'Admin';

          // Try to find the employee by ID or Name
          const employee = employees.find((e) => e.id === row.employeeId || e.name === username);
          const hasImage = employee?.image && !isAdmin;

          return (
            <div className='flex items-center gap-2'>
              <div
                className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                  isAdmin
                    ? ''
                    : 'rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold border border-gray-200 dark:border-gray-700 overflow-hidden'
                }`}
              >
                {isAdmin ? (
                  <>
                    <img
                      src='/logo_icon_black.svg'
                      className='w-6 h-6 dark:hidden object-contain'
                      alt='System'
                    />
                    <img
                      src='/logo_icon_white.svg'
                      className='w-6 h-6 hidden dark:block object-contain'
                      alt='System'
                    />
                  </>
                ) : hasImage ? (
                  <img src={employee.image} className='w-full h-full object-cover' alt={username} />
                ) : (
                  username.charAt(0).toUpperCase()
                )}
              </div>
              <span className='font-semibold text-gray-800 dark:text-gray-200'>{username}</span>
            </div>
          );
        },
        meta: { width: 150, align: 'start' },
      },
      {
        accessorKey: 'action',
        header: t.loginAudit.headers.action,
        cell: (info) => {
          const { label, icon, colors } = getActionInfo(String(info.getValue()));
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current bg-transparent text-xs font-bold uppercase tracking-wider ${colors}`}
            >
              <span className='material-symbols-rounded text-sm'>{icon}</span>
              {label}
            </span>
          );
        },
        meta: { width: 110, align: 'center' },
      },
      {
        accessorKey: 'branchId',
        header: t.loginAudit.headers.branch,
        cell: (info) => {
          const id = String(info.getValue());
          const branch = branches.find(b => b.id === id);
          return (
            <span className='font-semibold text-gray-800 dark:text-gray-200'>
              {branch?.name || id}
            </span>
          );
        },
        meta: { width: 120, align: 'center' },
      },
      {
        accessorKey: 'details',
        header: t.loginAudit.headers.details,
        cell: (info) => (
          <div className='text-[11px]'>
            {translateDetails(info.getValue() as string | undefined)}
          </div>
        ),
        meta: { flex: true, align: 'start' },
      },
    ],
    [t, language]
  );

  return (
    <div className='h-full flex flex-col overflow-hidden bg-transparent'>
      {/* Header Area */}
      <div className='pb-2'>
        <div className='flex items-center justify-between mb-1'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white page-title'>
            {t.loginAudit.title}
          </h1>

          {isSuperAdmin && (
            <label className='flex items-center gap-3 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'>
              <span className='text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none'>
                {t.loginAudit.globalView}
              </span>
              <Switch
                checked={showAllBranches}
                onChange={setShowAllBranches}
                theme={currentTheme.name.toLowerCase()}
                activeColor={currentTheme.hex}
              />
            </label>
          )}
        </div>
        <p className='text-gray-500 dark:text-gray-400 text-sm'>{t.loginAudit.subtitle}</p>
      </div>

      {/* Table Area */}
      <div className='flex-1 pt-2 overflow-hidden'>
        <TanStackTable
          tableId='login-audit-report'
          data={history}
          columns={columns}
          searchPlaceholder={t.loginAudit.searchPlaceholder}
          color='blue'
          emptyMessage={t.loginAudit.emptyMessage}
          dense={true}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
        />
      </div>
    </div>
  );
};

export default LoginAuditList;
