import type React from 'react';
import { useMemo, useState } from 'react';
import type { Employee, EmploymentRequest, UserProfile } from '../../types';
import { DocumentsTab } from './tabs/DocumentsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ProfileTab } from './tabs/ProfileTab';

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
}

export type CachedDocs = {
  nationalIdCard?: string | null;
  nationalIdCardBack?: string | null;
  mainSyndicateCard?: string | null;
  subSyndicateCard?: string | null;
};

type ProfileTabType = 'profile' | 'history' | 'documents';

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
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [cachedDocs, setCachedDocs] = useState<CachedDocs | null>(null);
  const isRTL = language === 'AR';

  const tabs = useMemo(
    () => [
      { value: 'profile' as const, label: t.employeeProfile.profile, icon: 'person' },
      { value: 'history' as const, label: t.employeeProfile.workHistory, icon: 'work_history' },
      { value: 'documents' as const, label: t.employeeProfile.documents, icon: 'description' },
    ],
    [t]
  );

  return (
    <div className='animate-fade-in text-(--text-primary)'>
      {/* Tab Bar */}
      <div className='flex mb-6 overflow-x-auto hide-scrollbar max-sm:-mx-4'>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 sm:flex-none justify-center sm:justify-start flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 text-[13px] sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                isActive 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className='material-symbols-rounded text-[18px] sm:text-[18px]'>{tab.icon}</span>
              <span>{tab.label}</span>
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
    </div>
  );
};

EmployeePortalProfile.displayName = 'EmployeePortalProfile';
