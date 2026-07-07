import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import { useSettings } from '../../context';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAuthStore } from '../../stores/authStore';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { authService } from '../../services/auth/authService';
import type { LoginAuditEntry } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { Switch } from '../common/Switch';
import { TanStackTable } from '../common/TanStackTable';

/**
 * LoginAuditList Component
 * Displays a detailed log of user authentication events using TanStackTable.
 */
export const LoginAuditList: React.FC<{ language: 'EN' | 'AR' }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const branches = useAuthStore(s => s.branches);
  const { data: employeesData } = useEmployees(activeBranchId);
  const employees = employeesData ?? [];
  const { theme: currentTheme } = useSettings();
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [history, setHistory] = useState<LoginAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if current user is Super Admin to show the toggle
  const currentUser = authService.getCurrentUserSync();

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const branchIds = branches.map((b) => b.id);
        const data = await authService.getLoginHistory(
          showAllBranches ? branchIds : activeBranchId
        );
        setHistory(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [activeBranchId, showAllBranches]);

  const getActionInfo = (action: string) => {
    switch (action) {
      case 'login':
        return {
          label: t.loginAudit.actions.login,
          icon: 'login',
          badgeClass: 'badge-success',
        };
      case 'logout':
        return {
          label: t.loginAudit.actions.logout,
          icon: 'logout',
          badgeClass: 'badge-danger',
        };
      case 'switch_user':
        return {
          label: t.loginAudit.actions.switch,
          icon: 'sync_alt',
          badgeClass: 'badge-warning',
        };
      case 'system_login':
        return {
          label: t.loginAudit.actions.system_login,
          icon: 'admin_panel_settings',
          badgeClass: 'badge-indigo',
        };
      case 'system_logout':
        return {
          label: t.loginAudit.actions.system_logout,
          icon: 'no_accounts',
          badgeClass: 'badge-indigo',
        };
      case 'switch_branch':
        return {
          label: t.loginAudit.actions.switchBranch || 'SWITCH BRANCH',
          icon: 'storefront',
          badgeClass: 'badge-blue',
        };
      case 'force_logout':
        return {
          label: t.loginAudit.actions.forceLogout,
          icon: 'gpp_maybe',
          badgeClass: 'badge-danger',
        };
      case 'switch_org':
        return {
          label: t.loginAudit.actions.switchOrg,
          icon: 'domain',
          badgeClass: 'badge-purple',
        };
      case 'employee_logout':
        return {
          label: t.loginAudit.actions.employeeLogout,
          icon: 'person_remove',
          badgeClass: 'badge-warning',
        };
      default:
        return {
          label: action,
          icon: 'info',
          badgeClass: 'badge-neutral',
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
                <span key={i} className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>
                  {branchSwitchMatch[1]}
                </span>
              );
            }
            if (part === '{{to}}') {
              return (
                <span key={i} className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>
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
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>{switchMatch[1]}</span>
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
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>
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

    // Pattern 3b: Employee signed out (Remotely)
    if (details === 'Employee signed out (Remotely)') {
      return (
        <span className='text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
          {t.loginAudit.detailPatterns.employeeSignedOut}
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'>
            {t.loginAudit.detailPatterns.remotelyBadge}
          </span>
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

    // Pattern 7a: Session terminated by {name} (Remotely)
    const terminatedRemoteMatch = details.match(/^Session terminated by (.*?) \(Remotely\)$/);
    if (terminatedRemoteMatch) {
      const translated = t.loginAudit.detailPatterns.terminatedBy.split('{{name}}');
      return (
        <span className='text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1.5'>
          {translated[0]}
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>{terminatedRemoteMatch[1]}</span>
          {translated[1]}
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'>
            {t.loginAudit.detailPatterns.remotelyBadge}
          </span>
        </span>
      );
    }

    // Pattern 7: Session terminated by {name}
    const terminatedMatch = details.match(/^Session terminated by (.*)$/);
    if (terminatedMatch) {
      const translated = t.loginAudit.detailPatterns.terminatedBy.split('{{name}}');
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {translated[0]}
          <span className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>{terminatedMatch[1]}</span>
          {translated[1]}
        </span>
      );
    }

    // Pattern 8: Employee {name} logged out by {admin}
    const employeeLoggedOutMatch = details.match(/^Employee (.*) logged out by (.*)$/);
    if (employeeLoggedOutMatch) {
      const translated = t.loginAudit.detailPatterns.employeeLoggedOutBy.split('{{name}}').join('{{temp}}').split('{{admin}}').join('{{name}}').split('{{temp}}').join('{{admin}}');
      const parts = t.loginAudit.detailPatterns.employeeLoggedOutBy
        .split(/({{(?:name|admin)}})/)
        .filter(Boolean);
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {parts.map((part, i) => {
            if (part === '{{name}}') {
              return (
                <span key={i} className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>
                  {employeeLoggedOutMatch[1]}
                </span>
              );
            }
            if (part === '{{admin}}') {
              return (
                <span key={i} className='inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mx-1'>
                  {employeeLoggedOutMatch[2]}
                </span>
              );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
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
        meta: { width: 150, align: 'start', isId: true, hideFromSettings: false },
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

          return isToday ? (
            <span className='text-[11px] font-bold text-gray-800 dark:text-gray-200'>
              {timeStr}
            </span>
          ) : (
            <div className='flex items-center gap-2 whitespace-nowrap'>
              <span className='text-[11px] font-bold text-gray-800 dark:text-gray-200'>
                {dateStr}
              </span>
              <span className='text-[10px] text-gray-400 font-medium opacity-60'>{timeStr}</span>
            </div>
          );
        },
        meta: { width: 110, align: 'start', minWidth: 100, smartDate: false },
      },
      {
        accessorKey: 'employeeCode',
        header: t.loginAudit.headers.code || 'CODE',
        cell: (info) => (
          <span className='text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'>
            {String(info.getValue() || '-')}
          </span>
        ),
        meta: { width: 150, align: 'center', dir: 'ltr', minWidth: 100 },
      },
      {
        accessorKey: 'username',
        header: t.loginAudit.headers.user,
        cell: (info) => {
          const username = String(info.getValue());
          const row = info.row.original;
          const isAdmin = username === 'Admin';

          // Try to find the employee by ID only for the image/avatar
          const employee = employees.find((e) => e.id === row.employeeId);
          const hasImage = employee?.image && !isAdmin;

          return (
            <div className='flex items-center gap-2'>
              <div
                className={`w-6 h-6 flex items-center justify-center shrink-0 ${isAdmin
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
              {/* Display the recorded name at time of event, fallback to username */}
              <span className='font-semibold text-gray-800 dark:text-gray-200'>
                {row.employeeName || username}
              </span>
            </div>
          );
        },
        meta: { width: 172, align: 'start', minWidth: 140 },
      },
      {
        accessorKey: 'action',
        header: t.loginAudit.headers.action,
        cell: (info) => {
          const { label, icon, badgeClass } = getActionInfo(String(info.getValue()));
          return (
            <span className={`gap-1 px-2 py-1 ${badgeClass}`}>
              <span className='material-symbols-rounded text-sm'>{icon}</span>
              {label}
            </span>
          );
        },
        meta: { width: 150, align: 'start' },
      },
      {
        accessorKey: 'branchId',
        header: t.loginAudit.headers.branch,
        cell: (info) => {
          const id = String(info.getValue());
          const branch = branches.find((b) => b.id === id);
          return (
            <span className='font-semibold text-gray-800 dark:text-gray-200'>
              {branch?.name || id}
            </span>
          );
        },
        meta: { width: 150, align: 'start', dir: 'ltr' },
      },
      {
        accessorKey: 'details',
        header: t.loginAudit.headers.details,
        cell: (info) => (
          <div className='text-[11px]'>
            {translateDetails(info.getValue() as string | undefined)}
          </div>
        ),
        meta: { width: 400, align: 'start', flex: true },
      },
    ],
    [t, language]
  );

  return (
    <div className='h-full flex flex-col overflow-hidden bg-transparent px-4 sm:px-6 pt-4 sm:pt-6'>
      {/* Header Area */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 flex-shrink-0'>
        <h2
          className='hidden md:block text-2xl !font-["GraphicSansFont"] tracking-tight leading-normal text-zinc-900 dark:text-zinc-100 me-2 sm:me-4'
          style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
        >
          {t.loginAudit.title}
        </h2>

        <div className='flex-1 flex items-center sm:justify-end gap-2 w-full'>
          <SearchInput
            compact
            value={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={t.loginAudit.searchPlaceholder}
            wrapperClassName='w-full sm:w-64'
          />

          <label className='flex items-center gap-3 h-[34px] px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer flex-shrink-0'>
            <span className='text-sm font-medium text-gray-700 dark:text-gray-300 select-none whitespace-nowrap'>
              {t.loginAudit.showAllBranches}
            </span>
            <Switch
              checked={showAllBranches}
              onChange={setShowAllBranches}
              theme={currentTheme.name.toLowerCase()}
              activeColor={currentTheme.hex}
            />
          </label>
        </div>
      </div>
      {/* Table Area */}
      <div className='flex-1 overflow-hidden'>
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
          isLoading={isLoading}
          enableSearch={false}
          globalFilter={searchQuery}
        />
      </div>
    </div>
  );
};

export default LoginAuditList;
