import type React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { sessionRepository, type UserActiveSession } from '../../../services/auth/repositories/sessionRepository';
import { getDeviceName, getBrowserName, isDesktopAppUserAgent } from '../../../utils/platform';
import { isSessionOnline } from '../../../hooks/infrastructure/useSessionHeartbeat';
import { Icons } from '../../common/Icons';
import type { Employee, UserProfile } from '../../../types';

interface EmployeeSessionsTabProps {
  profile: UserProfile | null;
  t: any;
  isRTL?: boolean;
  workspaces?: (Employee & { branches?: { name: string }; organizations?: { name: string } })[];
}

export const EmployeeSessionsTab: React.FC<EmployeeSessionsTabProps> = ({
  profile,
  t,
  isRTL,
  workspaces = [],
}) => {
  const [sessions, setSessions] = useState<UserActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tick counter — forces re-render to recalculate isSessionOnline() from cached data
  const [, setTick] = useState(0);

  const loadSessions = async () => {
    try {
      setLoading(true);
      // No userId scope needed — RLS filters via employee_id subquery
      const data = await sessionRepository.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      setError(isRTL ? 'فشل تحميل الجلسات' : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };
  const workspaceIdsString = workspaces.map(w => w.id).sort().join(',');

  useEffect(() => {
    loadSessions();

    if (!profile?.id) return;

    const employeeIds = workspaceIdsString ? workspaceIdsString.split(',') : [];
    const uniqueChannelName = `employee_sessions_changes_${Math.random().toString(36).substring(7)}`;
    
    let dbChannel = supabase.channel(uniqueChannelName);

    // Listen to their own portal sessions
    dbChannel = dbChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_active_sessions', filter: `user_id=eq.${profile.id}` }, () => {
      sessionRepository.getActiveSessions().then(setSessions);
    });

    // Listen to their POS sessions
    if (employeeIds.length > 0) {
      dbChannel = dbChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_active_sessions', filter: `employee_id=in.(${employeeIds.join(',')})` }, () => {
        sessionRepository.getActiveSessions().then(setSessions);
      });
    }

    dbChannel.subscribe();

    // Local tick every 60s — recalculates online/offline without DB calls.
    // Actual data updates come from the postgres_changes subscription above.
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
      
    return () => {
      supabase.removeChannel(dbChannel);
      clearInterval(tickInterval);
    };
  }, [profile?.id, workspaceIdsString]);

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
      await loadSessions();
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
      <div className='flex items-center gap-3 px-1'>
        <span className='material-symbols-rounded text-3xl text-(--text-secondary)'>devices</span>
        <div className='flex items-center gap-2'>
          <h3 className='text-lg font-semibold text-(--text-primary)'>
            {t.employeeProfile.sessions || 'Active Sessions'}
          </h3>
          <div className='flex items-center gap-1.5'>
            {onlineCount > 0 && (
              <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800 flex items-center gap-1.5' title={isRTL ? 'متصل الآن' : 'Online'}>
                <span className='w-1.5 h-1.5 rounded-full bg-green-500 relative'>
                  <span className='absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75'></span>
                </span>
                {onlineCount}
              </span>
            )}
            {offlineCount > 0 && (
              <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5' title={isRTL ? 'غير متصل' : 'Offline'}>
                <span className='w-1.5 h-1.5 rounded-full bg-gray-400'></span>
                {offlineCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center p-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
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
                            <span>
                              {isRTL ? 'آخر ظهور:' : 'Last seen:'} {new Date(session.last_seen_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleLogout(session)}
                    className='w-full md:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors font-medium text-sm'
                  >
                    <span className='material-symbols-rounded text-[18px]'>logout</span>
                    {/* fallback to simple string if t.employeeProfile.signOut is not added */}
                    {isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

EmployeeSessionsTab.displayName = 'EmployeeSessionsTab';
