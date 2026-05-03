import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { orgAggregationService, type OrgData } from '../../services/org/orgAggregationService';
import { orgService } from '../../services/org/orgService';
import { OrgPulseGrid } from './OrgPulseGrid';
import { BranchMasterMonitor } from './BranchMasterMonitor';
import { QuotaMonitor } from './QuotaMonitor';
import { MemberPermissionMatrix } from './MemberPermissionMatrix';
import { employeeService } from '../../services/hr/employeeService';
import { useData } from '../../context/DataContext';
import { SegmentedControl } from '../common/SegmentedControl';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { ORG_MANAGEMENT_HELP } from '../../i18n/helpInstructions';
import { useSettings } from '../../context';
import { PageHeader } from '../common/PageHeader';
import { permissionsService } from '../../services/auth/permissionsService';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
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
  onViewChange
}) => {
  const { darkMode } = useSettings();
  const [data, setData] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentEmployee } = useData();
  const [showHelp, setShowHelp] = useState(false);
  const [activeMatrixTab, setActiveMatrixTab] = useState<'managers' | 'staff'>('managers');
  
  // Upgrade Transition State
  const [showUpgradeTransition, setShowUpgradeTransition] = useState(false);
  const [upgradeTriggerRect, setUpgradeTriggerRect] = useState<DOMRect | null>(null);

  const t = TRANSLATIONS[language].orgManagement;
  const normalizedLang = language.toLowerCase() as 'en' | 'ar';

  const fetchData = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const orgData = await orgAggregationService.aggregateOrgData(activeOrgId);
      setData(orgData);
    } catch (err) {
      console.error('Failed to fetch org data:', err);
      setError(language === 'AR' ? 'فشل جلب البيانات' : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrgId]);

  const handleUpdateEmployee = async (employeeId: string, updates: any) => {
    try {
      const employee = data?.employees.find(e => e.id === employeeId);
      
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
      label: language === 'AR' ? 'إدارة المنظمة' : 'Organization',
      icon: 'corporate_fare',
      permission: PAGE_REGISTRY['org-management']?.permission
    },
    { 
      value: 'branch-management', 
      label: language === 'AR' ? 'إدارة الفروع' : 'Branches',
      icon: 'domain',
      permission: PAGE_REGISTRY['branch-management']?.permission
    }
  ];



  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">
      <PageHeader
        centerContent={
          <SegmentedControl
            options={availableTabs}
            value="org-management"
            onChange={(val) => onViewChange?.(val as any)}
            size="md"
            iconSize="--icon-lg"
            shape="pill"
            className="w-full sm:w-[480px]"
            useGraphicFont={true}
          />
        }
        rightContent={
          <button 
            onClick={() => setShowHelp(true)}
            className="w-10 h-10 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-primary-600 transition-colors"
          >
            <span className="material-symbols-rounded">help</span>
          </button>
        }
        dir={language === 'AR' ? 'rtl' : 'ltr'}
        mb="mb-0"
      />

      <div className="flex-1 overflow-y-auto p-page space-y-6 pb-10">
        {/* Primary Metrics Grid */}
        <OrgPulseGrid 
          metrics={data?.metrics} 
          language={normalizedLang} 
          color={color}
          isLoading={isLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Branch Monitoring Section - Constrained by the height of QuotaMonitor */}
          <div className="relative min-h-[300px] lg:min-h-0">
            <div className="lg:absolute lg:inset-0">
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>
                  {activeMatrixTab === 'managers' ? 'admin_panel_settings' : 'badge'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {activeMatrixTab === 'managers' ? t.permissionsTitle : (language === 'AR' ? 'كافة الموظفين' : 'All Staff')}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeMatrixTab === 'managers' ? t.permissionsSubtitle : (language === 'AR' ? 'قائمة الموظفين المسجلين في كافة الفروع' : 'List of employees registered across all branches')}
                </p>
              </div>
            </div>
            
            <div className="w-full sm:w-[280px]">
              <SegmentedControl
                options={[
                  { value: 'managers', label: language === 'AR' ? 'المدراء' : 'Managers', icon: 'admin_panel_settings' },
                  { value: 'staff', label: language === 'AR' ? 'الموظفين' : 'Staff', icon: 'group' }
                ]}
                value={activeMatrixTab}
                onChange={(val) => setActiveMatrixTab(val as any)}
                iconSize="--icon-sm"
              />
            </div>
          </div>

          <MemberPermissionMatrix 
            employees={activeMatrixTab === 'managers' ? (data?.managers || []) : (data?.staff || [])}
            branches={data?.branches || []}
            language={language}
            currentEmployeeId={currentEmployee?.id}
            onUpdate={handleUpdateEmployee}
            color={color}
            hideHeader={true}
            isLoading={isLoading}
          />
        </div>

        <HelpButton 
          onClick={() => setShowHelp(true)}
          title={ORG_MANAGEMENT_HELP[language].title}
          color={color}
          isRTL={language === 'AR'}
        />

        <HelpModal 
          show={showHelp}
          onClose={() => setShowHelp(false)}
          helpContent={ORG_MANAGEMENT_HELP[language] as any}
          color={color}
          language={language}
        />

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
