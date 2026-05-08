import React from 'react';
import { Icons } from '../../common/Icons';
import { AttendanceQuickAction } from '../AttendanceQuickAction';
import { Language, Organization, ViewState } from '../../../types';
import { authService } from '../../../services/auth/authService';
import { permissionsService } from '../../../services/auth/permissionsService';
import { TRANSLATIONS } from '../../../i18n/translations';

interface NavUserActionsProps {
  language: Language;
  theme: { hex: string; primary: string };
  profileImage: string | null;
  setProfileImage: (img: string | null) => void;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  profileRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
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
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoggingOut: boolean;
  setIsLoggingOut: (val: boolean) => void;
  setShowPrinterSettings: (val: boolean) => void;
  isCompact?: boolean;
}

export const NavUserActions: React.FC<NavUserActionsProps> = ({
  language,
  theme,
  profileImage,
  setProfileImage,
  showProfileMenu,
  setShowProfileMenu,
  profileRef,
  fileInputRef,
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
  handleFileChange,
  isLoggingOut,
  setIsLoggingOut,
  setShowPrinterSettings,
  isCompact = false,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
      {/* Quick Attendance Action */}
      {!isCompact && <AttendanceQuickAction language={language} />}

      {/* User Profile & Settings */}
      <div className='relative' ref={profileRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex items-center gap-2 py-0.5 px-1 ${!isCompact ? 'ltr:pr-3 rtl:pl-3' : ''} rounded-full border border-transparent hover:border-(--border-divider) hover:bg-(--bg-navbar-hover) ${showProfileMenu ? 'border-(--border-divider) bg-(--bg-navbar-hover)' : ''}`}
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt='Profile'
              className={`${isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover border border-(--border-divider)`}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full border border-white/20"
              style={{
                backgroundColor: theme.hex,
                width: isCompact ? '24px' : '32px',
                height: isCompact ? '24px' : '32px',
              }}
            >
              <Icons.Store size={isCompact ? "14px" : "var(--icon-md)"} stroke={2.5} color="white" />
            </div>
          )}
          {!isCompact && (
            <div className='hidden md:flex flex-col items-start'>
              <span className='text-xs font-bold text-gray-700 dark:text-gray-200 leading-none mb-0.5'>
                {currentEmployeeId
                  ? (currentEmployee?.name || authService.getCurrentUserSync()?.username || (language === 'AR' ? 'Zinc' : 'Zinc'))
                  : (language === 'AR' ? 'تسجيل دخول الموظف' : 'Employee Login')
                }
              </span>
              {currentEmployeeId && (
                <span className='text-[10px] text-gray-400 leading-none h-2.5 flex items-center'>
                  {isDataLoading || !activeBranch ? (
                    <span className="w-16 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                  ) : (
                    activeBranch.name
                  )}
                </span>
              )}
            </div>
          )}
          {!isCompact && <Icons.ExpandMore size="var(--icon-base)" className="hidden md:block text-gray-400" />}
        </button>

        {/* Profile Dropdown */}
        {showProfileMenu && (
          <div className={`absolute ${language === 'AR' ? 'left-0' : 'right-0'} mt-2 w-72 bg-(--bg-menu) rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] border border-(--border-divider) overflow-hidden z-[10000] animate-fade-in`}>
            {/* User Info */}
            <div className='p-4 border-b border-(--border-divider) bg-(--bg-page-surface)'>
              <div className='flex items-center gap-3'>
                <div className='relative group'>
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt='Profile'
                      className='w-12 h-12 rounded-full object-cover border border-(--border-divider)'
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-full border border-white/10"
                      style={{
                        backgroundColor: theme.hex,
                        width: '48px',
                        height: '48px',
                      }}
                    >
                      <Icons.Store size="var(--icon-lg)" stroke={2} color="white" />
                    </div>
                  )}
                  {currentEmployeeId && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        width: '20px',
                        height: '20px',
                      }}
                      className='absolute bottom-0 right-0 w-5 h-5 bg-black/30 backdrop-blur-xs text-white rounded-full flex items-center justify-center hover:bg-black/50 shadow-xs'
                      title='Change Photo'
                    >
                      <Icons.Edit size="var(--icon-xs)" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className='font-bold text-gray-900 dark:text-white'>
                    {currentEmployeeId
                      ? (currentEmployee?.name || authService.getCurrentUserSync()?.username || (language === 'AR' ? 'Zinc' : 'Zinc'))
                      : (language === 'AR' ? 'تسجيل دخول الموظف' : 'Employee Login')
                    }
                  </h3>
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {isDataLoading || !activeOrg ? (
                        <span className="inline-block w-20 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                      ) : (
                        activeOrg.name
                      )}
                    </p>
                    {currentEmployeeId && (
                      <>
                        <span className='w-1 h-1 bg-gray-300 rounded-full' />
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {isDataLoading || !activeBranch ? (
                            <span className="inline-block w-12 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                          ) : (
                            activeBranch.name
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type='file'
                  ref={fileInputRef}
                  className='hidden'
                  accept='image/*'
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Branch Management */}
            {currentEmployeeId && (
              <div className='p-2 border-t border-(--border-divider)'>
                <div className='flex items-center justify-between px-2 mb-2'>
                  <div className='flex items-center gap-1.5'>
                    <Icons.Branch size={16} className="text-gray-400" />
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
                      >
                        <div className='flex items-center gap-2'>
                          {activeBranchId === branch.id ? <Icons.Success size="var(--icon-md)" /> : <Icons.Circle size="var(--icon-md)" />}
                          {branch.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='px-2.5 py-2 mt-1 mx-1 text-xs text-gray-500 dark:text-gray-400 bg-(--bg-page-surface) rounded-lg border border-(--border-divider) flex items-center gap-2'>
                    <Icons.Info size={16} className="text-gray-400" />
                    {language === 'AR' ? 'فرع واحد متاح.' : 'One branch available.'}
                  </div>
                )}
              </div>
            )}

            {/* Sign Out */}
            <div className='p-2 border-t border-(--border-divider) bg-(--bg-page-surface)'>
              <button
                onClick={async () => {
                  if (isLoggingOut) return;
                  setIsLoggingOut(true);
                  try {
                    if (onLogout) await onLogout();
                    else await authService.logout();
                    setShowProfileMenu(false);
                  } catch (error) {
                    console.error('Logout failed', error);
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                disabled={isLoggingOut}
                className='w-full p-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center gap-2'
              >
                {isLoggingOut ? <Icons.Loading className="animate-spin" /> : <Icons.Logout />}
                {t.profile.signOut}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
