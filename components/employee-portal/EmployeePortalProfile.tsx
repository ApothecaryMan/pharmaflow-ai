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
  workspaces?: (Employee & { branches?: { name: string } })[];
  language?: string;
  t: Translations;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}

type ProfileTabType = 'profile' | 'history' | 'documents';

export const EmployeePortalProfile: React.FC<EmployeePortalProfileProps> = ({
  profile,
  sessionName,
  sessionUsername,
  requests,
  workspaces = [],
  language = 'EN',
  t,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const isRTL = language === 'AR';

  const hasDocuments = !!(
    profile?.nationalIdCard ||
    profile?.nationalIdCardBack ||
    profile?.mainSyndicateCard ||
    profile?.subSyndicateCard
  );

  const tabs = useMemo(
    () => [
      { value: 'profile' as const, label: t.employeeProfile.profile, icon: 'person' },
      { value: 'history' as const, label: t.employeeProfile.workHistory, icon: 'work_history' },
      ...(hasDocuments || isEditing
        ? [{ value: 'documents' as const, label: t.employeeProfile.documents, icon: 'description' }]
        : []),
    ],
    [hasDocuments, isEditing, t]
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
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab profile={profile} t={t} onUpdateProfile={onUpdateProfile} />
      )}

      {activeTab === 'history' && <HistoryTab requests={requests} isRTL={isRTL} t={t} />}
    </div>
  );
};

EmployeePortalProfile.displayName = 'EmployeePortalProfile';
