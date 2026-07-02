import React, { useEffect, useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { Icons } from '../common/Icons';
import { sessionRepository, type UserActiveSession } from '../../services/auth/repositories/sessionRepository';
import { supabase } from '../../lib/supabase';
import { getDeviceName, getBrowserName } from '../../utils/platform';
import { authService } from '../../services/auth/authService';
import { employeeService } from '../../services/hr/employeeService';

interface ActiveSessionsPageProps {
  color?: string;
  t: any;
  language?: string;
}

export const ActiveSessionsPage: React.FC<ActiveSessionsPageProps> = ({
  color = 'blue',
  t,
  language = 'EN',
}) => {
  const [sessions, setSessions] = useState<UserActiveSession[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineSessionIds, setOnlineSessionIds] = useState<Set<string>>(new Set());

  const currentUser = authService.getCurrentUserSync();
  const userName = currentUser?.employeeName || currentUser?.username || 'Unknown';

  const currentUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionRepository.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      setError(language === 'AR' ? 'فشل تحميل الجلسات' : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    const loadEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to load employees for sessions", err);
      }
    };
    loadEmployees();
    
    const uniqueChannelName = `active_sessions_changes_${Math.random().toString(36).substring(7)}`;
    const dbChannel = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_active_sessions' }, () => {
        sessionRepository.getActiveSessions().then(setSessions);
      })
      .subscribe();
      
    const handlePresence = (e: any) => {
      const state = e.detail;
      const onlineIds = new Set<string>();
      for (const key in state) {
        state[key].forEach((presence: any) => {
          if (presence.session_id) onlineIds.add(presence.session_id);
        });
      }
      setOnlineSessionIds(onlineIds);
    };
    
    window.addEventListener('presence_sync', handlePresence);
    
    // Read initial state if the channel is already active globally
    const channelTopic = `presence:user_${currentUser?.userId}`;
    const existingPresenceChannel = supabase.getChannels().find(c => c.topic.includes(channelTopic));
    if (existingPresenceChannel) {
      handlePresence({ detail: existingPresenceChannel.presenceState() });
    }
      
    return () => {
      supabase.removeChannel(dbChannel);
      window.removeEventListener('presence_sync', handlePresence);
    };
  }, [currentUser?.userId]);

  const handleLogout = async (sessionId: string) => {
    try {
      const terminatorName = currentUser?.employeeName;
      await sessionRepository.logoutSession(sessionId, terminatorName);
      await loadSessions();
    } catch (err) {
      console.error('Failed to logout session', err);
    }
  };

  return (
    <div className='flex flex-col h-full bg-(--bg-page-surface)'>
      <PageHeader
        title={language === 'AR' ? 'الأجهزة المتصلة' : 'Active Sessions'}
        icon='devices'
        color={color}
      />
      <div className='flex-1 p-4 sm:p-6 overflow-y-auto'>
        <div className='max-w-4xl mx-auto'>
          {loading ? (
            <div className='flex items-center justify-center p-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
            </div>
          ) : error ? (
            <div className='p-4 bg-red-50 text-red-600 rounded-lg'>{error}</div>
          ) : (
            <div className='md:bg-(--bg-card) md:border border-(--border-divider)'>
              <table className='w-full text-sm text-left rtl:text-right block md:table'>
                <thead className='hidden md:table-header-group text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400'>
                  <tr>
                    <th className='px-6 py-4 font-medium'>{language === 'AR' ? 'المستخدم' : 'User'}</th>
                    <th className='px-6 py-4 font-medium'>{language === 'AR' ? 'الجهاز' : 'Device'}</th>
                    <th className='px-6 py-4 font-medium'>{language === 'AR' ? 'المتصفح' : 'Browser'}</th>
                    <th className='px-6 py-4 font-medium'>{language === 'AR' ? 'عنوان IP' : 'IP Address'}</th>
                    <th className='px-6 py-4 font-medium'>{language === 'AR' ? 'آخر ظهور' : 'Last Seen'}</th>
                    <th className='px-6 py-4 text-center font-medium'>{language === 'AR' ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className='block md:table-row-group space-y-4 md:space-y-0 md:divide-y divide-(--border-divider)'>
                  {sessions.length === 0 ? (
                    <tr className='block md:table-row'>
                      <td colSpan={6} className='block md:table-cell px-6 py-8 text-center text-gray-500'>
                        {language === 'AR' ? 'لا توجد جلسات نشطة' : 'No active sessions found'}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => {
                      const displayDeviceName = getDeviceName(session.user_agent || '', session.device_info || '');
                      const displayBrowserName = getBrowserName(session.user_agent || '');
                      
                      const sessionEmployee = session.employee_id ? employees.find(e => e.id === session.employee_id) : null;
                      const hasEmployee = !!sessionEmployee;
                      const sessionUserName = sessionEmployee?.name || sessionEmployee?.en_name || (language === 'AR' ? 'غير محدد (الحساب الرئيسي)' : 'Unassigned (Main Account)');
                      const sessionUserImage = sessionEmployee?.image || null;
                      const isOnline = onlineSessionIds.has(session.id);
                      
                      let IconComponent = Icons.Desktop;
                      let iconColor = 'text-primary-600';
                      let iconBg = 'bg-primary-50 dark:bg-primary-900/20';

                      if (displayDeviceName.includes('Android')) {
                        IconComponent = Icons.Android;
                        iconColor = 'text-green-600';
                      } else if (displayDeviceName.includes('iPhone') || displayDeviceName.includes('iPad') || displayDeviceName.includes('Mac')) {
                        IconComponent = Icons.Apple;
                        iconColor = 'text-gray-600 dark:text-gray-300';
                      } else if (displayDeviceName.includes('Windows')) {
                        IconComponent = Icons.Windows;
                        iconColor = 'text-blue-600';
                      } else if (displayDeviceName.includes('Linux') || displayDeviceName.includes('Ubuntu')) {
                        IconComponent = Icons.Linux;
                        iconColor = 'text-orange-600';
                      }
                      
                      return (
                      <tr key={session.id} className='block md:table-row bg-(--bg-card) border border-(--border-divider) rounded-xl md:bg-transparent md:rounded-none md:border-none'>
                        <td className='block md:table-cell px-4 pt-4 pb-2 md:px-6 md:py-4'>
                          <div className='flex items-center gap-3'>
                            <div className="relative" title={isOnline ? (language === 'AR' ? 'متصل الآن' : 'Online') : (language === 'AR' ? 'غير متصل' : 'Offline')}>
                              {sessionUserImage ? (
                                <img src={sessionUserImage} alt={sessionUserName} className={`w-8 h-8 rounded-full object-cover ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900' : 'border border-(--border-divider)'}`} />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900' : 'border border-(--border-divider)'} ${
                                  hasEmployee 
                                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                  {hasEmployee ? sessionUserName.charAt(0).toUpperCase() : '?'}
                                </div>
                              )}
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className={`font-medium ${hasEmployee ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 italic'}`}>
                                {sessionUserName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:py-4'>
                          <div className='flex items-center gap-3'>
                            <div className={`${iconColor} flex-shrink-0`}>
                              <IconComponent size={24} className='md:w-[28px] md:h-[28px]' />
                            </div>
                            <div className='flex flex-col'>
                              <div dir="auto" className='font-medium text-gray-900 dark:text-gray-100'>
                                {displayDeviceName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:py-4 text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'المتصفح:' : 'Browser:'}</span>
                            <span>{displayBrowserName}</span>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:py-4 text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'عنوان IP:' : 'IP:'}</span>
                            <span dir="ltr">{session.ip_address || '-'}</span>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:py-4'>
                          <div className='flex items-center gap-2 md:block'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'آخر ظهور:' : 'Seen:'}</span>
                            <div className='flex items-center gap-2 md:block'>
                              {isOnline ? (
                                <div className='text-green-600 dark:text-green-400 font-medium'>
                                  {language === 'AR' ? 'متصل الآن' : 'Online Now'}
                                </div>
                              ) : (
                                <>
                                  <div className='text-gray-900 dark:text-gray-100'>
                                    {new Date(session.last_seen_at).toLocaleDateString()}
                                  </div>
                                  <div className='text-xs text-gray-500'>
                                    {new Date(session.last_seen_at).toLocaleTimeString()}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 pb-4 pt-3 mt-2 border-t border-(--border-divider) md:border-none md:mt-0 md:pt-4 md:px-6 md:py-4'>
                          <div className='flex justify-start md:justify-center'>
                            {session.user_agent === currentUserAgent ? (
                              <span className='inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400'>
                                <Icons.Check size={14} />
                                {language === 'AR' ? 'الجهاز الحالي' : 'Current'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLogout(session.id)}
                                className='text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 px-3 py-1.5 flex items-center justify-center w-full md:w-auto gap-2 cursor-pointer'
                                title={language === 'AR' ? 'إنهاء الجلسة' : 'Terminate'}
                              >
                                <Icons.Logout size={15} />
                                <span className='text-xs font-medium'>
                                  {language === 'AR' ? 'إنهاء' : 'End'}
                               </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
