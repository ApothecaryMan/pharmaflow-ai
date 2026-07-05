import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../common/PageHeader';
import { Icons } from '../common/Icons';
import { sessionRepository, type UserActiveSession } from '../../services/auth/repositories/sessionRepository';
import { supabase } from '../../lib/supabase';
import { getDeviceName, getBrowserName, getSessionUserAgent, isDesktopAppUserAgent } from '../../utils/platform';
import { formatDateWithRelativeLabel, getRelativeTime, getDurationMs, getDurationStr } from '../../utils/dateFormatter';
import { authService } from '../../services/auth/authService';
import { employeeService } from '../../services/hr/employeeService';
import { isSessionOnline } from '../../hooks/infrastructure/useSessionHeartbeat';
import { Tooltip } from '../common/Tooltip';
import { SearchInput } from '../common/SearchInput';

interface ActiveSessionsPageProps {
  color?: string;
  t: any;
  language?: string;
}

type SortKey = 'user' | 'device' | 'browser' | 'started' | 'duration' | 'ip' | 'lastSeen';

const SORT_LABELS: Record<SortKey, { en: string; ar: string }> = {
  user: { en: 'User', ar: 'المستخدم' },
  device: { en: 'Device', ar: 'الجهاز' },
  browser: { en: 'Browser', ar: 'المتصفح' },
  started: { en: 'Started', ar: 'البداية' },
  duration: { en: 'Duration', ar: 'المدة' },
  ip: { en: 'IP Address', ar: 'عنوان IP' },
  lastSeen: { en: 'Last Seen', ar: 'آخر ظهور' },
};

export const ActiveSessionsPage: React.FC<ActiveSessionsPageProps> = ({
  color = 'blue',
  t,
  language = 'EN',
}) => {
  const [sessions, setSessions] = useState<UserActiveSession[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [isEndingAll, setIsEndingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = authService.getCurrentUserSync();

  const currentUserAgent = typeof navigator !== 'undefined' ? getSessionUserAgent(navigator.userAgent) : '';

  // Tick counter — forces re-render to recalculate isSessionOnline() from cached data
  const [, setTick] = useState(0);

  const loadSessions = async () => {
    try {
      setLoading(true);
      // Scope to current user for faster indexed query
      const data = await sessionRepository.getActiveSessions(currentUser?.userId);
      setSessions(data);
    } catch (err) {
      console.error(err);
      setError(language === 'AR' ? 'فشل تحميل الجلسات' : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await sessionRepository.getActiveSessions(currentUser?.userId);
      setSessions(data);
      setError(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser?.userId]);

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
        sessionRepository.getActiveSessions(currentUser?.userId).then(setSessions);
      })
      .subscribe();

    // Local tick every 60s — recalculates online/offline without DB calls.
    // Actual data updates come from the postgres_changes subscription above.
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
      
    return () => {
      supabase.removeChannel(dbChannel);
      clearInterval(tickInterval);
    };
  }, [currentUser?.userId]);

  const handleLogout = async (sessionId: string) => {
    try {
      const terminatorName = currentUser?.employeeName;
      await sessionRepository.logoutSession(sessionId, terminatorName);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to logout session', err);
    }
  };

  const handleEndAllOther = async () => {
    const confirmMsg = language === 'AR'
      ? 'هل أنت متأكد من إنهاء جميع الجلسات الأخرى؟'
      : 'Are you sure you want to end all other sessions?';
    if (!window.confirm(confirmMsg)) return;
    setIsEndingAll(true);
    try {
      const others = sessions.filter(s => s.user_agent !== currentUserAgent);
      await Promise.all(others.map(s => sessionRepository.logoutSession(s.id, currentUser?.employeeName)));
      await refreshSessions();
    } catch (err) {
      console.error('Failed to end other sessions', err);
    } finally {
      setIsEndingAll(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const processedSessions = useMemo(() => {
    let result = [...sessions];

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(session => {
        const displayDeviceName = getDeviceName(session.user_agent || '', session.device_info || '');
        const displayBrowserName = getBrowserName(session.user_agent || '');
        const sessionEmployee = session.employee_id ? employees.find(e => e.id === session.employee_id) : null;
        const sessionUserName = sessionEmployee?.name || sessionEmployee?.en_name || '';
        return displayDeviceName.toLowerCase().includes(query)
          || displayBrowserName.toLowerCase().includes(query)
          || (session.ip_address || '').toLowerCase().includes(query)
          || sessionUserName.toLowerCase().includes(query)
          || (session.user_id || '').toLowerCase().includes(query);
      });
    }

    if (sortDir) {
      result.sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'user': {
            const empA = a.employee_id ? employees.find(e => e.id === a.employee_id) : null;
            const empB = b.employee_id ? employees.find(e => e.id === b.employee_id) : null;
            const nameA = (empA?.name || empA?.en_name || '').toLowerCase();
            const nameB = (empB?.name || empB?.en_name || '').toLowerCase();
            cmp = nameA.localeCompare(nameB);
            break;
          }
          case 'device': {
            const devA = getDeviceName(a.user_agent || '', a.device_info || '');
            const devB = getDeviceName(b.user_agent || '', b.device_info || '');
            cmp = devA.localeCompare(devB);
            break;
          }
          case 'browser': {
            const brA = getBrowserName(a.user_agent || '');
            const brB = getBrowserName(b.user_agent || '');
            cmp = brA.localeCompare(brB);
            break;
          }
          case 'started':
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'duration':
            const endA = a.logged_out_at || a.last_seen_at;
            const endB = b.logged_out_at || b.last_seen_at;
            cmp = getDurationMs(a.created_at, endA) - getDurationMs(b.created_at, endB);
            break;
          case 'ip':
            cmp = (a.ip_address || '').localeCompare(b.ip_address || '');
            break;
          case 'lastSeen':
          default:
            cmp = new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
            break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    // Always pin the current device to the top
    const currentIdx = result.findIndex(s => s.user_agent === currentUserAgent);
    if (currentIdx > 0) {
      const [currentSession] = result.splice(currentIdx, 1);
      result.unshift(currentSession);
    }

    return result;
  }, [sessions, searchQuery, sortKey, sortDir, employees, currentUserAgent]);

  const hasOtherSessions = sessions.some(s => s.user_agent !== currentUserAgent);

  const onlineCount = processedSessions.filter(s => isSessionOnline(s.last_seen_at)).length;
  const offlineCount = processedSessions.length - onlineCount;
  const currentCount = processedSessions.filter(s => s.user_agent === currentUserAgent).length;
  const staleCount = processedSessions.filter(s => {
    const age = Date.now() - new Date(s.created_at).getTime();
    return age > 86400000;
  }).length;

  const getSessionUserName = (session: UserActiveSession): string => {
    const emp = session.employee_id ? employees.find(e => e.id === session.employee_id) : null;
    return emp?.name || emp?.en_name || (language === 'AR' ? 'غير محدد' : 'Unassigned');
  };

  const onlineSessions = processedSessions.filter(s => isSessionOnline(s.last_seen_at));
  const offlineSessions = processedSessions.filter(s => !isSessionOnline(s.last_seen_at));
  const staleSessions = processedSessions.filter(s => {
    const age = Date.now() - new Date(s.created_at).getTime();
    return age > 86400000;
  });
  const currentSession = processedSessions.find(s => s.user_agent === currentUserAgent);

  const getPrevSession = useCallback((session: UserActiveSession): UserActiveSession | undefined => {
    return sessions
      .filter(s => s.created_at < session.created_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }, [sessions]);

  const SortArrow = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey || !sortDir) return (
      <span className='ml-1 rtl:mr-1 rtl:ml-0 w-4 inline-block text-gray-300 dark:text-gray-600'>
        <svg width='10' height='12' viewBox='0 0 10 12' className='inline-block align-middle' fill='currentColor'>
          <polygon points='5,1 9,5 1,5' opacity='0.4' />
          <polygon points='5,11 9,7 1,7' opacity='0.4' />
        </svg>
      </span>
    );
    if (sortDir === 'asc') return (
      <span className='ml-1 rtl:mr-1 rtl:ml-0 w-4 inline-block'>
        <svg width='10' height='12' viewBox='0 0 10 12' className='inline-block align-middle' fill='currentColor'>
          <polygon points='5,1 9,6 1,6' />
        </svg>
      </span>
    );
    return (
      <span className='ml-1 rtl:mr-1 rtl:ml-0 w-4 inline-block'>
        <svg width='10' height='12' viewBox='0 0 10 12' className='inline-block align-middle' fill='currentColor'>
          <polygon points='5,11 9,6 1,6' />
        </svg>
      </span>
    );
  };

  const SortableTh = ({ columnKey, children, className = '' }: { columnKey: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`${className} cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
      onClick={() => handleSort(columnKey)}
    >
      <div className='flex items-center gap-2'>
        {children}
        <SortArrow columnKey={columnKey} />
      </div>
    </th>
  );

  return (
    <div className='flex flex-col h-full bg-(--bg-page-surface)'>
      <div className='flex-1 px-4 sm:px-6 pt-4 sm:pt-6 overflow-hidden flex flex-col'>
        <div className='flex flex-col h-full w-full'>
          {error ? (
            <div className='p-4 bg-red-50 text-red-600 rounded-lg'>{error}</div>
          ) : (
            <>
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 flex-shrink-0'>
                <h2 
                  className='hidden md:block text-2xl !font-["GraphicSansFont"] tracking-tight leading-normal text-zinc-900 dark:text-zinc-100 me-2 sm:me-4'
                  style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
                >
                  {language === 'AR' ? 'الأجهزة المتصلة' : 'Active Sessions'}
                </h2>
                <div className='flex flex-wrap items-center gap-2'>
                  <Tooltip content={
                    <div className='whitespace-normal text-[11px] font-semibold'>
                      {processedSessions.length} {language === 'AR' ? 'جلسة' : 'sessions'} · {onlineCount} {language === 'AR' ? 'متصل' : 'Online'} · {offlineCount} {language === 'AR' ? 'غير متصل' : 'Offline'}{staleCount > 0 ? ` · ${staleCount} ${language === 'AR' ? 'قديم' : 'Stale'}` : ''}
                    </div>
                  } position='bottom'>
                  <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-lg text-sm font-medium'>
                    <span>{processedSessions.length}</span>
                    <span>{language === 'AR' ? 'نشط' : 'Active'}</span>
                  </div>
                  </Tooltip>

                  {onlineCount > 0 && (
                    <Tooltip content={
                      <div className='whitespace-normal text-[11px] font-semibold space-y-1'>
                        {onlineSessions.map(s => (
                          <div key={s.id} className='flex items-center gap-1'>
                            <span className='w-1 h-1 rounded-full bg-green-400 inline-block' />
                            {getSessionUserName(s)}{s.user_agent === currentUserAgent ? ` (${language === 'AR' ? 'هذا الجهاز' : 'this device'})` : ''}
                          </div>
                        ))}
                      </div>
                    } position='bottom'>
                    <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium'>
                      <span className='w-1.5 h-1.5 rounded-full bg-green-500 inline-block' />
                      <span>{onlineCount}</span>
                      <span>{language === 'AR' ? 'متصل' : 'Online'}</span>
                    </div>
                    </Tooltip>
                  )}

                  {offlineCount > 0 && (
                    <Tooltip content={
                      <div className='whitespace-normal text-[11px] font-semibold space-y-1'>
                        {offlineSessions.map(s => (
                          <div key={s.id} className='flex items-center gap-1'>
                            <span className='w-1 h-1 rounded-full bg-gray-400 inline-block' />
                            {getSessionUserName(s)} · {getRelativeTime(s.last_seen_at, language) || formatDateWithRelativeLabel(s.last_seen_at, language).label}
                          </div>
                        ))}
                      </div>
                    } position='bottom'>
                    <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium'>
                      <span className='w-1.5 h-1.5 rounded-full bg-gray-400 inline-block' />
                      <span>{offlineCount}</span>
                      <span>{language === 'AR' ? 'غير متصل' : 'Offline'}</span>
                    </div>
                    </Tooltip>
                  )}

                  {currentCount > 0 && (
                    <Tooltip content={
                      <div className='whitespace-normal text-[11px] font-semibold'>
                        {currentSession ? `${getDeviceName(currentSession.user_agent || '', currentSession.device_info || '')} · ${getBrowserName(currentSession.user_agent || '')}` : ''}
                        <br />{language === 'AR' ? 'جهازك الحالي' : 'Your current device'}
                      </div>
                    } position='bottom'>
                    <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium'>
                      <svg className='w-2.5 h-2.5' fill='currentColor' viewBox='0 0 10 10'>
                        <circle cx='5' cy='5' r='4' />
                      </svg>
                      <span>{currentCount}</span>
                      <span>{language === 'AR' ? 'الحالي' : 'Current'}</span>
                    </div>
                    </Tooltip>
                  )}

                  {staleCount > 0 && (
                    <Tooltip content={
                      <div className='whitespace-normal text-[11px] font-semibold space-y-1'>
                        <div className='opacity-70 text-[10px]'>{language === 'AR' ? 'نشط لأكثر من 24 ساعة' : 'Running for more than 24h'}:</div>
                        {staleSessions.map(s => {
                          const end = s.logged_out_at || s.last_seen_at;
                          const dur = getDurationStr(s.created_at, end, language === 'AR' ? 'AR' : 'EN');
                          return <div key={s.id} className='flex items-center gap-1'><span className='w-1 h-1 rounded-full bg-amber-400 inline-block' />{getSessionUserName(s)} · {dur}</div>;
                        })}
                        <div className='opacity-70 text-[10px] pt-1 border-t border-white/20 dark:border-black/20 mt-1'>{language === 'AR' ? 'يُفضل إنهاء الجلسات القديمة' : 'Consider ending stale sessions'}</div>
                      </div>
                    } position='bottom'>
                    <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium'>
                      <svg className='w-2.5 h-2.5' fill='currentColor' viewBox='0 0 10 10'>
                        <circle cx='5' cy='5' r='4' />
                      </svg>
                      <span>{staleCount}</span>
                      <span>{language === 'AR' ? 'قديم' : 'Stale'}</span>
                    </div>
                    </Tooltip>
                  )}
                </div>

                <div className='flex-1 flex items-center gap-2 w-full'>
                  <SearchInput
                    compact
                    value={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder={language === 'AR' ? 'بحث بالاسم أو الجهاز أو IP...' : 'Search by name, device, or IP...'}
                    wrapperClassName='w-full'
                  />

                  <Tooltip content={
                    <div className='whitespace-normal text-[11px] font-semibold'>
                      {language === 'AR' ? 'تحديث' : 'Refresh'}
                    </div>
                  } position='bottom'>
                  <button
                    onClick={refreshSessions}
                    disabled={refreshing}
                    className='p-2 border border-(--border-divider) rounded-lg bg-gray-50 dark:bg-gray-800 disabled:opacity-50 cursor-pointer flex-shrink-0'
                  >
                    <svg
                      className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
                      fill='none' stroke='currentColor' viewBox='0 0 24 24'
                    >
                      <polyline points='23 4 23 10 17 10' />
                      <polyline points='1 20 1 14 7 14' />
                      <path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' />
                    </svg>
                  </button>
                  </Tooltip>

                  {hasOtherSessions && (
                    <button
                      onClick={handleEndAllOther}
                      disabled={isEndingAll}
                      className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0'
                    >
                      {isEndingAll && <div className='animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-700 dark:border-red-300'></div>}
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' />
                      </svg>
                      <span className='hidden sm:inline'>{language === 'AR' ? 'إنهاء الكل' : 'End All Others'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className='flex-1 overflow-y-auto md:bg-(--bg-card) md:border border-(--border-divider)'>
                {(loading || refreshing) ? (
                  <div className='flex items-center justify-center min-h-[400px]'>
                    <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-400'></div>
                  </div>
                ) : (
                  <table className='w-full text-sm text-left rtl:text-right block md:table'>
                    <thead className='hidden md:table-header-group md:sticky md:top-0 z-10 text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400'>
                    <tr>
                      <SortableTh columnKey='user' className='px-6 py-4 font-medium'>{language === 'AR' ? 'المستخدم' : 'User'}</SortableTh>
                      <SortableTh columnKey='device' className='px-6 py-4 font-medium'>{language === 'AR' ? 'الجهاز' : 'Device'}</SortableTh>
                      <SortableTh columnKey='browser' className='px-6 py-4 font-medium'>{language === 'AR' ? 'المتصفح' : 'Browser'}</SortableTh>
                      <SortableTh columnKey='started' className='px-6 py-4 font-medium'>{language === 'AR' ? 'البداية' : 'Started'}</SortableTh>
                      <SortableTh columnKey='duration' className='px-6 py-4 font-medium'>{language === 'AR' ? 'المدة' : 'Duration'}</SortableTh>
                      <SortableTh columnKey='ip' className='px-6 py-4 font-medium'>{language === 'AR' ? 'IP' : 'IP'}</SortableTh>
                      <SortableTh columnKey='lastSeen' className='px-6 py-4 font-medium'>{language === 'AR' ? 'آخر ظهور' : 'Last Seen'}</SortableTh>
                      <th className='px-6 py-4 text-center font-medium'>{language === 'AR' ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className='block md:table-row-group space-y-4 md:space-y-0 md:divide-y divide-(--border-divider)'>
                    {processedSessions.length === 0 ? (
                      <tr className='block md:table-row md:h-[72px]'>
                        <td colSpan={8} className='block md:table-cell px-6 py-8 text-center text-gray-500 md:h-[72px] md:align-middle'>
                          {searchQuery
                            ? (language === 'AR' ? 'لا توجد نتائج تطابق البحث' : 'No sessions match your search')
                            : (language === 'AR' ? 'لا توجد جلسات نشطة' : 'No active sessions found')}
                        </td>
                      </tr>
                    ) : (
                      processedSessions.map((session) => {
                        const displayDeviceName = getDeviceName(session.user_agent || '', session.device_info || '');
                        const displayBrowserName = getBrowserName(session.user_agent || '');
                        const isDesktopAppSession = isDesktopAppUserAgent(session.user_agent || '');
                        
                        const sessionEmployee = session.employee_id ? employees.find(e => e.id === session.employee_id) : null;
                        const hasEmployee = !!sessionEmployee;
                        const sessionUserName = sessionEmployee?.name || sessionEmployee?.en_name || (language === 'AR' ? 'غير محدد' : 'Unassigned');
                        const sessionUserImage = sessionEmployee?.image || null;
                        const isOnline = isSessionOnline(session.last_seen_at);
                        
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

                        const relativeTime = isOnline ? '' : getRelativeTime(session.last_seen_at, language);
                        const startedInfo = formatDateWithRelativeLabel(session.created_at, language);
                        const lastSeenInfo = formatDateWithRelativeLabel(session.last_seen_at, language);
                        const sessionEnd = session.logged_out_at || session.last_seen_at;
                        const durationStr = getDurationStr(session.created_at, sessionEnd, language);
                        
                        const isCurrentDevice = session.user_agent === currentUserAgent;
                        
                      return (
                      <tr key={session.id} className={`block md:table-row rounded-xl md:rounded-none md:h-[72px] border border-(--border-divider) md:border-none bg-(--bg-card) md:bg-transparent ${isCurrentDevice ? 'md:bg-gray-50 md:dark:bg-gray-800/60' : ''}`}>
                        <td className='block md:table-cell px-4 pt-4 pb-2 md:px-6 md:h-[72px] md:align-middle'>
                          <div className='group relative'>
                            <div className='flex items-center gap-3'>
                              <div className="relative shrink-0">
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
                              <div className='flex flex-col min-w-0'>
                                <span className={`font-medium truncate ${hasEmployee ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 italic'}`}>
                                  {sessionUserName}
                                </span>
                                <div className='md:hidden mt-0.5 text-xs'>
                                  {isOnline ? (
                                    <span className='text-green-600 dark:text-green-400 font-medium'>
                                      {language === 'AR' ? 'متصل الآن' : 'Online Now'}
                                    </span>
                                  ) : (
                                    <span className='text-gray-500'>
                                      {relativeTime ? relativeTime : lastSeenInfo.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {(() => {
                              const prevSession = getPrevSession(session);
                              const startedLabel = formatDateWithRelativeLabel(session.created_at, language);
                              return (
                                <div className={`absolute ${language === 'AR' ? 'right-0' : 'left-0'} top-full pt-1.5 z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none`}>
                                  <div className='bg-(--bg-card) border border-(--border-divider) rounded-lg shadow-xl p-3 min-w-[240px] space-y-2'>
                                    <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                      {language === 'AR' ? 'معلومات الجلسة' : 'Session Info'}
                                    </div>
                                    <div className='text-xs text-gray-600 dark:text-gray-400'>
                                      {language === 'AR' ? 'دخل' : 'Logged in'} {getRelativeTime(session.created_at, language) || startedLabel.label} · {startedLabel.time}
                                    </div>
                                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                                      {getDeviceName(session.user_agent || '', session.device_info || '')} · {getBrowserName(session.user_agent || '')}
                                    </div>

                                    {prevSession && (() => {
                                      const prevEmp = prevSession.employee_id ? employees.find(e => e.id === prevSession.employee_id) : null;
                                      const prevName = prevEmp?.name || prevEmp?.en_name || (language === 'AR' ? 'غير محدد' : 'Unassigned');
                                      const prevImg = prevEmp?.image || null;
                                      const prevStartedLabel = formatDateWithRelativeLabel(prevSession.created_at, language);
                                      return (
                                        <>
                                          <div className='border-t border-(--border-divider) pt-2 mt-2'>
                                            <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                              {language === 'AR' ? 'السابق' : 'Previously'}
                                            </div>
                                            <div className='flex items-center gap-2 mt-1.5'>
                                              <div className='shrink-0'>
                                                {prevImg ? (
                                                  <img src={prevImg} alt={prevName} className='w-6 h-6 rounded-full object-cover border border-(--border-divider)' />
                                                ) : (
                                                  <div className='w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'>
                                                    {prevName.charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                              </div>
                                              <div className='flex flex-col min-w-0'>
                                                <span className='text-xs font-medium text-gray-900 dark:text-gray-100 truncate'>{prevName}</span>
                                                <span className='text-[11px] text-gray-500 dark:text-gray-400'>
                                                  {getDeviceName(prevSession.user_agent || '', prevSession.device_info || '')} · {getRelativeTime(prevSession.created_at, language) || prevStartedLabel.label}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle'>
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
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            {(() => {
                              if (isDesktopAppSession) {
                                return <img src='/app_icon_color.svg' alt='' className='w-6 h-6 md:w-4 md:h-4 inline-block shrink-0' />;
                              }
                              const bn = displayBrowserName.toLowerCase();
                              let BrowserIcon = null;
                              if (bn.includes('edge')) BrowserIcon = Icons.Edge;
                              else if (bn.includes('chrome')) BrowserIcon = Icons.Chrome;
                              else if (bn.includes('safari')) BrowserIcon = Icons.Safari;
                              else if (bn.includes('firefox')) BrowserIcon = Icons.Firefox;
                              return BrowserIcon ? <BrowserIcon className='w-6 h-6 md:w-4 md:h-4 inline-block shrink-0' /> : null;
                            })()}
                            <span className='hidden md:inline'>{displayBrowserName}</span>
                            <span dir="ltr" className="md:hidden font-mono text-sm">{session.ip_address || '-'}</span>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'البداية:' : 'Started:'}</span>
                            <div className='flex items-center gap-1 md:block'>
                              <div className='text-gray-900 dark:text-gray-100 text-xs'>{startedInfo.label}</div>
                              <div className='text-xs text-gray-500 hidden md:block'>{startedInfo.time}</div>
                              <div className='text-xs text-gray-500 md:hidden'>· {startedInfo.time}</div>
                            </div>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'المدة:' : 'Duration:'}</span>
                            <span>{durationStr}</span>
                          </div>
                        </td>

                        <td className='hidden md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle text-gray-600 dark:text-gray-400'>
                          <div className='flex items-center gap-2'>
                            <span dir="ltr">{session.ip_address || '-'}</span>
                          </div>
                        </td>
                        <td className='hidden md:table-cell px-4 py-1.5 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle'>
                          <div className='flex items-center gap-2 md:block'>
                            <span className='md:hidden text-xs font-semibold uppercase opacity-70'>{language === 'AR' ? 'آخر ظهور:' : 'Seen:'}</span>
                            <div className='flex items-center gap-2 md:block'>
                              {isOnline ? (
                                <div className='text-green-600 dark:text-green-400 font-medium'>
                                  {language === 'AR' ? 'متصل الآن' : 'Online Now'}
                                </div>
                              ) : (
                                <>
                                  {relativeTime ? (
                                    <div className='text-gray-500'>
                                      <span className='text-gray-900 dark:text-gray-100'>{relativeTime}</span>
                                      <span className='text-xs text-gray-500 block'>{lastSeenInfo.time}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className='text-gray-900 dark:text-gray-100'>
                                        {lastSeenInfo.label}
                                      </div>
                                      <div className='text-xs text-gray-500'>
                                        {lastSeenInfo.time}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='block md:table-cell px-4 pb-4 pt-3 mt-2 border-t border-(--border-divider) md:border-none md:mt-0 md:px-6 md:h-[72px] md:overflow-hidden md:align-middle'>
                          <div className='flex justify-start md:justify-center'>
                            {session.user_agent === currentUserAgent ? (
                              <span className='inline-flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400'>
                                <Icons.Check size={14} />
                                {language === 'AR' ? 'الجهاز الحالي' : 'Current'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLogout(session.id)}
                                className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer whitespace-nowrap w-full md:w-auto justify-center'
                                title={language === 'AR' ? 'إنهاء الجلسة' : 'Terminate'}
                              >
                                <Icons.Logout size={14} />
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
            )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
};
