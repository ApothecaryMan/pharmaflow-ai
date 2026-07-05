import type React from 'react';
import { supabase } from '../../../lib/supabase';
import { sessionRepository, type UserActiveSession } from '../../../services/auth/repositories/sessionRepository';
import { getDeviceName, getBrowserName, isDesktopAppUserAgent, getSessionUserAgent } from '../../../utils/platform';
import { isSessionOnline } from '../../../hooks/infrastructure/useSessionHeartbeat';
import { formatDateWithRelativeLabel, getRelativeTime } from '../../../utils/dateFormatter';
import { Icons } from '../../common/Icons';
import type { Employee, UserProfile } from '../../../types';

interface EmployeeSessionsTabProps {
  profile: UserProfile | null;
  t: any;
  isRTL?: boolean;
  workspaces?: (Employee & { branches?: { name: string }; organizations?: { name: string } })[];
  sessions: UserActiveSession[];
  loading: boolean;
  error: string | null;
  onReloadSessions: () => Promise<void>;
}

export const EmployeeSessionsTab: React.FC<EmployeeSessionsTabProps> = ({
  profile,
  t,
  isRTL,
  workspaces = [],
  sessions,
  loading,
  error,
  onReloadSessions,
}) => {
  const currentUserAgent = typeof navigator !== 'undefined' ? getSessionUserAgent(navigator.userAgent) : '';

  const handleLogout = async (session: UserActiveSession) => {
    try {
      const terminatorName = profile?.name || 'User';
      if (session.org_id) {
        // POS session: Just log the employee out, leaving the session active for the owner
        await sessionRepository.logoutEmployeeFromSession(session.id, terminatorName);
      } else {
        // Portal session: Destroy the entire session
        await sessionRepository.logoutSession(session.id, terminatorName);
      }
      await onReloadSessions();
    } catch (err) {
      console.error('Failed to logout session', err);
    }
  };

  const getWorkspaceInfo = (orgId?: string, branchId?: string) => {
    if (!orgId && !branchId) return isRTL ? 'بوابة الموظفين (تسجيل دخول عام)' : 'Employee Portal (Global Login)';
    const workspace = workspaces.find((w: any) => 
      (w.orgId === orgId || w.organization_id === orgId) && 
      (!branchId || w.branchId === branchId || w.branch_id === branchId)
    );
    if (workspace) {
      const wAny = workspace as any;
      const orgName = wAny.orgName || wAny.organizations?.name || '';
      const branchName = wAny.branchName || wAny.branches?.name || '';
      return branchName ? `${orgName} - ${branchName}` : orgName;
    }
    return isRTL ? 'مؤسسة غير معروفة' : 'Unknown Organization';
  };

  const pharmacySessions = sessions.filter(session => session.org_id);
  const onlineCount = pharmacySessions.filter(session => isSessionOnline(session.last_seen_at)).length;
  const offlineCount = pharmacySessions.length - onlineCount;

  return (
    <div className='animate-fade-in space-y-6'>
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-3'>
          <span className='material-symbols-rounded text-3xl text-(--text-secondary)'>devices</span>
          <div className='flex items-center gap-2'>
            <h3 
              className='text-lg font-semibold text-(--text-primary) !font-["GraphicSansFont"]'
              style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
            >
              {t.employeeProfile.sessions || 'Active Sessions'}
            </h3>
          </div>
        </div>

        <button
          onClick={onReloadSessions}
          disabled={loading}
          className='flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-(--border-divider) rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-transparent disabled:opacity-50 cursor-pointer transition-colors text-(--text-secondary)'
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'
          >
            <polyline points='23 4 23 10 17 10' />
            <polyline points='1 20 1 14 7 14' />
            <path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' />
          </svg>
          <span className=''>{isRTL ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center min-h-[300px]'>
          <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-400'></div>
        </div>
      ) : error ? (
        <div className='p-6 text-center text-red-600'>{error}</div>
      ) : pharmacySessions.length === 0 ? (
        <div className='p-12 text-center text-(--text-secondary)'>
          {isRTL ? 'لا توجد أجهزة مسجلة حالياً داخل الصيدلية' : 'No active pharmacy sessions currently'}
        </div>
      ) : (
        <div className='space-y-3'>
          {pharmacySessions.map(session => {
            const displayDeviceName = getDeviceName(session.user_agent || '', session.device_info || '');
              const displayBrowserName = getBrowserName(session.user_agent || '');
              const isDesktopAppSession = isDesktopAppUserAgent(session.user_agent || '');
              const isOnline = isSessionOnline(session.last_seen_at);
              const language = isRTL ? 'AR' : 'EN';
              const relativeTime = isOnline ? '' : getRelativeTime(session.last_seen_at, language);
              const lastSeenInfo = formatDateWithRelativeLabel(session.last_seen_at, language);
              
              let IconComponent = Icons.Desktop;
              let iconColor = 'text-gray-600 dark:text-gray-400';

              if (displayDeviceName.includes('Android')) {
                IconComponent = Icons.Android;
                iconColor = 'text-green-600 dark:text-green-500';
              } else if (displayDeviceName.includes('iPhone') || displayDeviceName.includes('iPad') || displayDeviceName.includes('Mac')) {
                IconComponent = Icons.Apple;
              } else if (displayDeviceName.includes('Windows')) {
                IconComponent = Icons.Windows;
                iconColor = 'text-blue-600 dark:text-blue-500';
              } else if (displayDeviceName.includes('Linux') || displayDeviceName.includes('Ubuntu')) {
                IconComponent = Icons.Linux;
                iconColor = 'text-orange-600 dark:text-orange-500';
              }

              let BrowserIcon = Icons.Globe;
              let browserTooltip = displayBrowserName || (isRTL ? 'متصفح/تطبيق غير معروف' : 'Unknown App/Browser');
              if (isDesktopAppSession) {
                BrowserIcon = Icons.Desktop;
                browserTooltip = isRTL ? 'تطبيق ZINC' : 'ZINC App';
              } else if (displayBrowserName === 'Edge') {
                BrowserIcon = Icons.Edge;
              } else if (displayBrowserName === 'Chrome') {
                BrowserIcon = Icons.Chrome;
              } else if (displayBrowserName === 'Safari') {
                BrowserIcon = Icons.Safari;
              } else if (displayBrowserName === 'Firefox') {
                BrowserIcon = Icons.Firefox;
              }

              const workspaceName = getWorkspaceInfo(session.org_id, session.branch_id);

              return (
                <div key={session.id} className='p-5 bg-(--bg-card) border border-(--border-divider) rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center'>
                  <div className='flex gap-4 items-start'>
                    <div className={`mt-1 flex-shrink-0 ${iconColor}`}>
                      <IconComponent size={28} />
                    </div>
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <h4 className='font-medium text-(--text-primary)'>{displayDeviceName}</h4>
                      </div>
                      
                      <div className='text-sm text-(--text-secondary) space-y-1'>
                        <div className='flex items-center gap-1.5' title={browserTooltip}>
                          {isDesktopAppSession ? (
                            <img src='/app_icon_color.svg' alt='' className='w-5 h-5 shrink-0' />
                          ) : (
                            <BrowserIcon size={20} />
                          )}
                          <span dir="ltr">{session.ip_address || ''}</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <span className='material-symbols-rounded text-[16px]'>store</span>
                          <span>{workspaceName}</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <span className={`material-symbols-rounded text-[16px] ${isOnline ? 'text-green-500 dark:text-green-400' : ''}`}>schedule</span>
                          {isOnline ? (
                            <span className='text-green-600 dark:text-green-400 font-medium'>
                              {isRTL ? 'متصل الآن' : 'Online Now'}
                            </span>
                          ) : (
                            <span className='flex items-center gap-1 flex-wrap'>
                              <span className='opacity-70'>{isRTL ? 'آخر ظهور:' : 'Last seen:'}</span>
                              {relativeTime ? (
                                <>
                                  <span className='text-(--text-primary) font-medium'>{relativeTime}</span>
                                  <span className='opacity-70 text-xs'>· {lastSeenInfo.time}</span>
                                </>
                              ) : (
                                <>
                                  <span className='text-(--text-primary) font-medium'>{lastSeenInfo.label}</span>
                                  <span className='opacity-70 text-xs'>· {lastSeenInfo.time}</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {session.user_agent === currentUserAgent ? (
                    <span className='inline-flex items-center justify-center md:justify-end gap-2 text-xs font-medium text-green-600 dark:text-green-400 shrink-0 w-full md:w-auto'>
                      <Icons.Check size={14} />
                      {isRTL ? 'الجهاز الحالي' : 'Current'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleLogout(session)}
                      className='inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer whitespace-nowrap w-full md:w-auto justify-center'
                      title={isRTL ? 'إنهاء الجلسة' : 'Terminate'}
                    >
                      <Icons.Logout size={14} />
                      <span className='text-xs font-medium'>
                        {isRTL ? 'إنهاء' : 'End'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

EmployeeSessionsTab.displayName = 'EmployeeSessionsTab';
