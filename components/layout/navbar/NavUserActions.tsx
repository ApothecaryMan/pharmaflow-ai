import type React from 'react';
import { TRANSLATIONS } from '../../../i18n/translations';
import { authService } from '../../../services/auth/authService';
import type { Language, Organization, ViewState } from '../../../types';
import { isTauri } from '../../../utils/platform';
import { EmployeeAvatar } from '../../common/EmployeeAvatar';
import { Icons } from '../../common/Icons';
import { AttendanceQuickAction } from '../AttendanceQuickAction';

interface NavUserActionsProps {
  language: Language;
  theme: { hex: string; primary: string };
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  profileRef: React.RefObject<HTMLDivElement>;
  currentEmployeeId: string | null;
  currentEmployee: any;
  activeOrg: Organization | null;
  activeBranch: any;
  activeBranchId: string | null;
  branches: any[];
  switchBranch: (id: string) => Promise<void>;
  onNavigate?: (view: ViewState) => void;
  onLogout?: () => void;
  isDataLoading: boolean;
  isLoggingOut: boolean;
  setIsLoggingOut: (val: boolean) => void;
  isCompact?: boolean;
}

export const NavUserActions: React.FC<NavUserActionsProps> = ({
  language,
  theme,
  showProfileMenu,
  setShowProfileMenu,
  profileRef,
  currentEmployeeId,
  currentEmployee,
  activeOrg,
  activeBranch,
  activeBranchId,
  branches,
  switchBranch,
  onNavigate,
  onLogout,
  isDataLoading,
  isLoggingOut,
  setIsLoggingOut,
  isCompact = false,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
      {/* Quick Attendance Action */}
      {!isCompact && (
        <div className='hidden md:block'>
          <AttendanceQuickAction language={language} />
        </div>
      )}

      {/* User Profile & Settings */}
      <div className='relative' ref={profileRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex items-center gap-2 py-0.5 px-1 ${!isCompact ? 'ltr:pr-3 rtl:pl-3' : ''} rounded-full border border-transparent hover:border-(--border-divider) hover:bg-(--bg-navbar-hover) ${showProfileMenu ? 'border-(--border-divider) bg-(--bg-navbar-hover)' : ''}`}
          type='button'
        >
          <EmployeeAvatar
            image={currentEmployee?.image}
            initials={currentEmployee?.name?.charAt(0).toUpperCase()}
            themeHex={theme.hex}
            size={isCompact ? 24 : 32}
            designSettings={currentEmployee?.designSettings}
          />
          {!isCompact && (
            <div className='hidden md:flex flex-col items-start'>
              <span
                className='text-xs !font-["GraphicSansFont"] tracking-tight font-bold text-gray-700 dark:text-gray-200 leading-none mb-0.5'
                style={{
                  fontFeatureSettings:
                    '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
                }}
              >
                {currentEmployeeId
                  ? currentEmployee?.name ||
                    authService.getCurrentUserSync()?.username ||
                    (language === 'AR' ? 'Zinc' : 'Zinc')
                  : language === 'AR'
                    ? 'تسجيل دخول الموظف'
                    : 'Employee Login'}
              </span>
              {currentEmployeeId && (
                <span className='text-[10px] text-gray-400 leading-none h-2.5 flex items-center'>
                  {isDataLoading || !activeBranch ? (
                    <span className='w-16 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full' />
                  ) : (
                    activeBranch.name
                  )}
                </span>
              )}
            </div>
          )}
          {!isCompact && (
            <span
              className='material-symbols-rounded hidden md:block text-gray-400'
              style={{ fontSize: 'var(--icon-base)' }}
            >
              expand_more
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        {showProfileMenu && (
          <div
            className={`absolute ${language === 'AR' ? 'left-0' : 'right-0'} mt-2 w-72 bg-(--bg-menu) rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] border border-(--border-divider) overflow-hidden z-[10000] `}
          >
            {/* User Info */}
            <div className='p-4 border-b border-(--border-divider) bg-(--bg-page-surface)'>
              <div className='flex items-center gap-3'>
                <div className='relative group'>
                  <EmployeeAvatar
                    image={currentEmployee?.image}
                    initials={currentEmployee?.name?.charAt(0).toUpperCase()}
                    themeHex={theme.hex}
                    size={48}
                    designSettings={currentEmployee?.designSettings}
                  />
                </div>
                <div className='flex-1'>
                  <h3
                    className='!font-["GraphicSansFont"] tracking-tight font-bold text-gray-900 dark:text-white'
                    style={{
                      fontFeatureSettings:
                        '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
                    }}
                  >
                    {currentEmployeeId
                      ? currentEmployee?.name ||
                        authService.getCurrentUserSync()?.username ||
                        (language === 'AR' ? 'Zinc' : 'Zinc')
                      : language === 'AR'
                        ? 'تسجيل دخول الموظف'
                        : 'Employee Login'}
                  </h3>
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {isDataLoading || !activeOrg ? (
                        <span className='inline-block w-20 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full' />
                      ) : (
                        activeOrg.name
                      )}
                    </p>
                    {currentEmployeeId && (
                      <>
                        <span className='w-1 h-1 bg-gray-300 rounded-full' />
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {isDataLoading || !activeBranch ? (
                            <span className='inline-block w-12 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full' />
                          ) : (
                            activeBranch.name
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {currentEmployeeId && (
                  <button
                    onClick={async () => {
                      if (isLoggingOut) return;
                      setIsLoggingOut(true);
                      try {
                        if (onLogout) await onLogout();
                        setShowProfileMenu(false);
                      } catch (error) {
                        console.error('Logout failed', error);
                      } finally {
                        setIsLoggingOut(false);
                      }
                    }}
                    disabled={isLoggingOut}
                    className='md:hidden flex items-center justify-center w-9 h-9 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors'
                    type='button'
                  >
                    {isLoggingOut ? <Icons.Loading className='animate-spin' /> : <Icons.Logout />}
                  </button>
                )}
              </div>
            </div>

            {/* Workspace Management */}
            {authService.getCurrentUserSync()?.accountType === 'employee' &&
              authService.getCurrentUserSync()?.destination === 'pharmacy' && (
                <div className='p-2 border-t border-(--border-divider)'>
                  <div className='flex items-center justify-between px-2 mb-2'>
                    <div className='flex items-center gap-1.5'>
                      <Icons.Store size={16} className='text-gray-400' />
                      <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                        {language === 'AR' ? 'مساحات العمل' : 'Workspaces'}
                      </p>
                    </div>
                  </div>
                  <div className='space-y-1 max-h-[150px] overflow-y-auto scrollbar-hide'>
                    {authService
                      .getCurrentUserSync()
                      ?.availableWorkspaces?.map((workspace: any) => {
                        const isActive =
                          authService.getCurrentUserSync()?.employeeId === workspace.id;
                        return (
                          <button
                            key={workspace.id}
                            onClick={() => {}}
                            className={`w-full p-2 text-sm font-medium rounded-lg flex items-center justify-between transition-colors
 ${
   isActive
     ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
     : 'text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover)'
 }
 `}
                            type='button'
                          >
                            <div className='flex flex-col items-start'>
                              <span>{workspace.orgName || 'Pharmacy'}</span>
                              <span className='text-[10px] opacity-70 capitalize'>
                                {workspace.role.replace('_', ' ')}
                              </span>
                            </div>
                            {isActive && <Icons.Success size='var(--icon-md)' />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Branch Management */}
            {currentEmployeeId && (
              <div className='p-2 border-t border-(--border-divider)'>
                <div className='flex items-center justify-between px-2 mb-2'>
                  <div className='flex items-center gap-1.5'>
                    <Icons.Branch size={16} className='text-gray-400' />
                    <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                      {language === 'AR' ? 'فروع الصيدلية' : 'Pharmacy Branches'}
                    </p>
                  </div>
                </div>
                {branches.length > 1 ? (
                  <div className='space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide'>
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={async () => {
                          if (activeBranchId === branch.id) return;
                          await switchBranch(branch.id);
                          setShowProfileMenu(false);
                        }}
                        className={`w-full p-2 text-sm font-medium rounded-lg flex items-center justify-between transition-colors
 ${
   activeBranchId === branch.id
     ? 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
     : 'text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover)'
 }
 `}
                        type='button'
                      >
                        <div className='flex items-center gap-2'>
                          {activeBranchId === branch.id ? (
                            <Icons.Success size='var(--icon-md)' />
                          ) : (
                            <Icons.Circle size='var(--icon-md)' />
                          )}
                          {branch.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : branches.length === 1 ? (
                  <div className='px-2.5 py-2 mt-1 mx-1 text-xs text-gray-700 dark:text-gray-300 bg-(--bg-page-surface) rounded-lg border border-(--border-divider) font-medium'>
                    {branches[0].name}
                  </div>
                ) : null}
              </div>
            )}

            {/* Desktop Settings (Tauri Only) */}
            {isTauri() && (
              <div className='p-2 border-t border-(--border-divider)'>
                <button
                  onClick={() => {
                    onNavigate?.('desktop-settings');
                    setShowProfileMenu(false);
                  }}
                  className='w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover) rounded-lg flex items-center gap-2'
                  type='button'
                >
                  <Icons.Desktop size='var(--icon-md)' />
                  {language === 'AR' ? 'إعدادات سطح المكتب' : 'Desktop Settings'}
                </button>
              </div>
            )}

            {/* Sign Out */}
            <div className='p-2 border-t border-(--border-divider) bg-(--bg-page-surface)'>
              <button
                onClick={async () => {
                  if (isLoggingOut) return;
                  setIsLoggingOut(true);
                  try {
                    // Always use centralized logout handler (useAuth.handleLogout)
                    if (onLogout) await onLogout();
                    setShowProfileMenu(false);
                  } catch (error) {
                    console.error('Logout failed', error);
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                disabled={isLoggingOut}
                className='w-full p-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center gap-2'
                type='button'
              >
                {isLoggingOut ? <Icons.Loading className='animate-spin' /> : <Icons.Logout />}
                {t.profile.signOut}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
