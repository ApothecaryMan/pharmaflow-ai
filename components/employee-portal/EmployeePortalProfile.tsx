import type React from 'react';
import { useMemo, useState } from 'react';
import type { EmploymentRequest, UserProfile, Employee } from '../../types';
import { SegmentedControl } from '../common/SegmentedControl';
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
      { value: 'documents' as const, label: t.employeeProfile.documents, icon: 'description' }
    ],
    [t]
  );

  return (
    <div className='animate-fade-in text-(--text-primary)'>
      {/* Tab Bar */}
      <SegmentedControl
        options={tabs}
        value={activeTab}
        onChange={setActiveTab}
        size='xs'
        className='mb-6'
        iconSize='14px'
      />

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

      {activeTab === 'history' && <HistoryTab requests={requests} workspaces={workspaces} isLoading={isLoading} isRTL={isRTL} t={t} />}
    </div>
  );
};

EmployeePortalProfile.displayName = 'EmployeePortalProfile';
