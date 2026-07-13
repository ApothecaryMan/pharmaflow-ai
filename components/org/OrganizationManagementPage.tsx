import type React from 'react';
import { useEffect, useState } from 'react';
import { PERMISSIONS_MAPPING } from '../../config/permissionsMapping';
import { useSettings } from '../../context';
import { usePageHelp } from '../../context/HelpContext';
import { ORG_MANAGEMENT_HELP } from '../../i18n/helpInstructions';
import { TRANSLATIONS } from '../../i18n/translations';
import { permissionsService } from '../../services/auth/permissionsService';
import { employeeService } from '../../services/hr/employeeService';
import { type OrgData, orgAggregationService } from '../../services/org/orgAggregationService';
import { orgService } from '../../services/org/orgService';
import { useAuthStore } from '../../stores/authStore';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { BranchMasterMonitor } from './BranchMasterMonitor';
import { MemberPermissionMatrix } from './MemberPermissionMatrix';
import { OrgPulseGrid } from './OrgPulseGrid';
import { QuotaMonitor } from './QuotaMonitor';
import { UpgradeTunnelTransition } from './UpgradeTunnelTransition';

interface OrganizationManagementPageProps {
  activeOrgId: string;
  language: 'EN' | 'AR';
  color?: string;
  onViewChange?: (view: string) => void;
}

export const OrganizationManagementPage: React.FC<OrganizationManagementPageProps> = ({
  activeOrgId,
  language,
  color = 'primary',
  onViewChange,
}) => {
  const { darkMode } = useSettings();
  const [data, setData] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentEmployee = useAuthStore((s) => s.currentEmployee);
  const [activeMatrixTab, setActiveMatrixTab] = useState<'managers' | 'staff'>('managers');

  // Upgrade Transition State
  const [showUpgradeTransition, setShowUpgradeTransition] = useState(false);
  const [upgradeTriggerRect, setUpgradeTriggerRect] = useState<DOMRect | null>(null);

  const t = TRANSLATIONS[language].orgManagement;
  const normalizedLang = language.toLowerCase() as 'en' | 'ar';

  usePageHelp(ORG_MANAGEMENT_HELP[language] || ORG_MANAGEMENT_HELP.EN);

  const fetchData = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const orgData = await orgAggregationService.aggregateOrgData(activeOrgId);
      setData(orgData);
    } catch (err) {
      console.error('Failed to fetch org data:', err);
      setError(t.fetchError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrgId]);

  const handleUpdateEmployee = async (employeeId: string, updates: any) => {
    try {
      const employee = data?.employees.find((e) => e.id === employeeId);

      // If updating orgRole, use orgService
      if (updates.orgRole && employee?.userId) {
        await orgService.updateMemberRole(activeOrgId, employee.userId, updates.orgRole);
        delete updates.orgRole; // Don't try to save orgRole to employees table
      }

      // If there are other updates, use employeeService
      if (Object.keys(updates).length > 0) {
        await employeeService.update(employeeId, updates);
      }

      // Re-fetch everything to ensure metrics and lists are consistent
      await fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  // Permission-based Tab Configuration (Defined early to show during loading)
  const availableTabs = [
    {
      value: 'org-management',
      label: t.organization,
      icon: 'corporate_fare',
      permission: PERMISSIONS_MAPPING['org-management'],
    },
    {
      value: 'branch-management',
      label: t.branches,
      icon: 'domain',
      permission: PERMISSIONS_MAPPING['branch-management'],
    },
  ];

  return (
    <div className='h-full flex flex-col overflow-hidden '>
      <PageHeader
        centerContent={
          <SegmentedControl
            options={availableTabs}
            value='org-management'
            onChange={(val) => onViewChange?.(val as any)}
            size='md'
            iconSize='--icon-lg'
            shape='pill'
            className='w-full sm:w-[480px]'
            useGraphicFont={true}
          />
        }
        dir={language === 'AR' ? 'rtl' : 'ltr'}
        mb='mb-0'
      />

      <div className='flex-1 overflow-y-auto p-page space-y-6'>
        {/* Primary Metrics Grid */}
        <OrgPulseGrid
          metrics={data?.metrics}
          language={normalizedLang}
          color={color}
          isLoading={isLoading}
        />

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch'>
          {/* Branch Monitoring Section - Constrained by the height of QuotaMonitor */}
          <div className='relative min-h-[300px] lg:min-h-0'>
            <div className='lg:absolute lg:inset-0'>
              <BranchMasterMonitor
                branches={data?.branches || []}
                language={normalizedLang}
                color={color}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Quota & Subscription Section - This defines the row height */}
          <QuotaMonitor
            metrics={data?.metrics}
            language={normalizedLang}
            color={color}
            isLoading={isLoading}
            onUpgrade={(rect) => {
              setUpgradeTriggerRect(rect);
              setShowUpgradeTransition(true);
            }}
          />
        </div>

        {/* Global Member & Permissions Matrix */}
        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500'>
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>
                  {activeMatrixTab === 'managers' ? 'admin_panel_settings' : 'badge'}
                </span>
              </div>
              <div>
                <h3 className='text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                  {activeMatrixTab === 'managers' ? t.permissionsTitle : t.allStaff}
                </h3>
                <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                  {activeMatrixTab === 'managers' ? t.permissionsSubtitle : t.allStaffSubtitle}
                </p>
              </div>
            </div>

            <div className='w-full sm:w-[280px]'>
              <SegmentedControl
                options={[
                  { value: 'managers', label: t.managers, icon: 'admin_panel_settings' },
                  { value: 'staff', label: t.staff, icon: 'group' },
                ]}
                value={activeMatrixTab}
                onChange={(val) => setActiveMatrixTab(val as any)}
                iconSize='--icon-sm'
              />
            </div>
          </div>

          <MemberPermissionMatrix
            employees={activeMatrixTab === 'managers' ? data?.managers || [] : data?.staff || []}
            branches={data?.branches || []}
            language={language}
            currentEmployeeId={currentEmployee?.id}
            onUpdate={handleUpdateEmployee}
            color={color}
            hideHeader={true}
            isLoading={isLoading}
          />
        </div>

        <UpgradeTunnelTransition
          isOpen={showUpgradeTransition}
          triggerRect={upgradeTriggerRect}
          language={normalizedLang}
          darkMode={darkMode}
          onComplete={() => {
            // Give it a bit more time to show the tunnel before actually switching
            setTimeout(() => {
              onViewChange?.('services');
              setShowUpgradeTransition(false);
            }, 3000);
          }}
        />
      </div>
    </div>
  );
};
