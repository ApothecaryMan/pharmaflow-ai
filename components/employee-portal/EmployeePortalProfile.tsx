import type React from 'react';
import { useMemo, useState, useEffect } from 'react';
import type { Employee, EmploymentRequest, UserProfile } from '../../types';
import { DocumentsTab } from './tabs/DocumentsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ProfileTab } from './tabs/ProfileTab';
import { EmployeeSessionsTab } from './tabs/EmployeeSessionsTab';
import { supabase } from '../../lib/supabase';
import { sessionRepository, type UserActiveSession } from '../../services/auth/repositories/sessionRepository';
import { isSessionOnline } from '../../hooks/infrastructure/useSessionHeartbeat';

interface EmployeePortalProfileProps {
  profile: UserProfile | null;
  sessionName: string | undefined;
  sessionUsername: string | undefined;
  requests: EmploymentRequest[];
  workspaces?: (Employee & { branches?: { name: string }; organizations?: { name: string } })[];
  language?: string;
  t: Translations;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  onUpdateWorkspacePassword?: (employeeId: string, newPassword: string) => Promise<void>;
  onRegisterWorkspaceFingerprint?: (employeeId: string, username: string) => Promise<void>;
  isLoading?: boolean;
  currentBranchId?: string;
  currentOrgId?: string;
}

export type CachedDocs = {
  nationalIdCard?: string | null;
  nationalIdCardBack?: string | null;
  mainSyndicateCard?: string | null;
  subSyndicateCard?: string | null;
};

type ProfileTabType = 'profile' | 'history' | 'documents' | 'sessions';

export const EmployeePortalProfile: React.FC<EmployeePortalProfileProps> = ({
  profile,
  sessionName,
  sessionUsername,
  requests,
  workspaces = [],
  language = 'EN',
  t,
  isLoading,
  onUpdateProfile,
  onUpdateWorkspacePassword,
  onRegisterWorkspaceFingerprint,
  currentBranchId,
  currentOrgId,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [cachedDocs, setCachedDocs] = useState<CachedDocs | null>(null);
  const isRTL = language === 'AR';

  const [sessions, setSessions] = useState<UserActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const workspaceIdsString = workspaces.map(w => w.id).sort().join(',');

  const reloadSessions = useMemo(() => async () => {
    try {
      setLoadingSessions(true);
      const data = await sessionRepository.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      setSessionsError(isRTL ? 'فشل تحميل الجلسات' : 'Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  }, [isRTL]);

  useEffect(() => {
    let isMounted = true;
    reloadSessions();

    if (!profile?.id) return;

    const employeeIds = workspaceIdsString ? workspaceIdsString.split(',') : [];
    const uniqueChannelName = `employee_sessions_changes_profile_${Math.random().toString(36).substring(7)}`;
    
    let dbChannel = supabase.channel(uniqueChannelName);

    // Listen to their own portal sessions
    dbChannel = dbChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_active_sessions', filter: `user_id=eq.${profile.id}` }, () => {
      sessionRepository.getActiveSessions().then(data => { if (isMounted) setSessions(data); });
    });

    // Listen to their POS sessions
    if (employeeIds.length > 0) {
      dbChannel = dbChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_active_sessions', filter: `employee_id=in.(${employeeIds.join(',')})` }, () => {
        sessionRepository.getActiveSessions().then(data => { if (isMounted) setSessions(data); });
      });
    }

    dbChannel.subscribe();

    const tickInterval = setInterval(() => { if (isMounted) setTick(t => t + 1); }, 60_000);
      
    return () => {
      isMounted = false;
      supabase.removeChannel(dbChannel);
      clearInterval(tickInterval);
    };
  }, [profile?.id, workspaceIdsString, isRTL]);

  // Refresh sessions when the sessions tab is opened
  useEffect(() => {
    if (activeTab === 'sessions') {
      reloadSessions();
    }
  }, [activeTab, reloadSessions]);

  const employeeIds = useMemo(() => workspaces.map(w => w.id), [workspaces]);

  const mySessions = useMemo(() => sessions.filter(session => {
    if (!session.org_id || !session.branch_id) return false;
    if (currentOrgId && session.org_id !== currentOrgId) return false;
    if (currentBranchId && session.branch_id !== currentBranchId) return false;
    if (session.user_id === profile?.id) return true;
    if (session.employee_id && employeeIds.includes(session.employee_id)) return true;
    return false;
  }), [sessions, profile?.id, employeeIds, currentBranchId, currentOrgId]);

  const onlineCount = mySessions.filter(session => isSessionOnline(session.last_seen_at)).length;
  const offlineCount = mySessions.length - onlineCount;

  const tabs = useMemo(
    () => [
      { value: 'profile' as const, label: t.employeeProfile.profile, icon: 'person' },
      { value: 'history' as const, label: t.employeeProfile.workHistory, icon: 'work_history' },
      { value: 'documents' as const, label: t.employeeProfile.documents, icon: 'description' },
      { value: 'sessions' as const, label: t.employeeProfile.sessions || 'Active Sessions', icon: 'devices' },
    ],
    [t]
  );

  return (
    <div className='animate-fade-in text-(--text-primary) -mt-2 sm:-mt-4'>
      {/* Tab Bar */}
      <div className='flex mb-6 overflow-x-auto hide-scrollbar max-sm:-mx-4'>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 sm:flex-none justify-center sm:justify-start flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 text-[13px] sm:text-sm font-medium transition-colors relative whitespace-nowrap !font-['GraphicSansFont'] ${
                isActive 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
            >
              <div className='flex items-center gap-0.5'>
                <div className='relative flex items-center justify-center'>
                  <span className='material-symbols-rounded text-[18px] sm:text-[20px]'>{tab.icon}</span>
                  {tab.value === 'sessions' && (onlineCount > 0 || offlineCount > 0) && (
                    <div className='absolute -top-2 -end-[-10px] flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-gray-100 dark:bg-[#25282c] ring-2 ring-white dark:ring-[#1a1c1e] shadow-sm min-h-[14px] z-10'>
                      {onlineCount > 0 && (
                        <div className='flex items-center gap-0.5' title={isRTL ? 'متصل' : 'Online'}>
                          <span className='w-1.5 h-1.5 rounded-full bg-green-500 relative'>
                            <span className='absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75'></span>
                          </span>
                          <span className='text-gray-800 dark:text-gray-200 font-bold text-[9px] leading-none mt-[1px]'>{onlineCount}</span>
                        </div>
                      )}
                      {offlineCount > 0 && (
                        <div className='flex items-center gap-0.5' title={isRTL ? 'غير متصل' : 'Offline'}>
                          <span className='w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500'></span>
                          <span className='text-gray-800 dark:text-gray-200 font-bold text-[9px] leading-none mt-[1px]'>{offlineCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span>{tab.label}</span>
              </div>

              {isActive && (
                <span className='absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 dark:bg-white rounded-t-full' />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && (
        <ProfileTab
          profile={profile}
          sessionName={sessionName}
          sessionUsername={sessionUsername}
          requests={requests}
          workspaces={workspaces}
          isRTL={isRTL}
          t={t}
          onUpdateProfile={onUpdateProfile}
          onUpdateWorkspacePassword={onUpdateWorkspacePassword}
          onRegisterWorkspaceFingerprint={onRegisterWorkspaceFingerprint}
          isLoading={isLoading}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab
          profile={profile}
          t={t}
          onUpdateProfile={onUpdateProfile}
          cachedDocs={cachedDocs}
          setCachedDocs={setCachedDocs}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          requests={requests}
          workspaces={workspaces}
          isLoading={isLoading}
          isRTL={isRTL}
          t={t}
        />
      )}

      {activeTab === 'sessions' && (
        <EmployeeSessionsTab
          profile={profile}
          t={t}
          isRTL={isRTL}
          workspaces={workspaces}
          sessions={sessions}
          loading={loadingSessions}
          error={sessionsError}
          onReloadSessions={reloadSessions}
          currentBranchId={currentBranchId}
          currentOrgId={currentOrgId}
        />
      )}
    </div>
  );
};

EmployeePortalProfile.displayName = 'EmployeePortalProfile';
