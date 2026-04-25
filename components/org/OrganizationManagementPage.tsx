import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { orgAggregationService, type OrgData } from '../../services/org/orgAggregationService';
import { orgService } from '../../services/org/orgService';
import { OrgPulseGrid } from './OrgPulseGrid';
import { BranchMasterMonitor } from './BranchMasterMonitor';
import { QuotaMonitor } from './QuotaMonitor';
import { MemberPermissionMatrix } from './MemberPermissionMatrix';
import { employeeService } from '../../services/hr/employeeService';
import { useData } from '../../services/DataContext';
import { SegmentedControl } from '../common/SegmentedControl';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { ORG_MANAGEMENT_HELP } from '../../i18n/helpInstructions';

interface OrganizationManagementPageProps {
  activeOrgId: string;
  language: 'EN' | 'AR';
  color?: string;
}

export const OrganizationManagementPage: React.FC<OrganizationManagementPageProps> = ({
  activeOrgId,
  language,
  color = 'primary'
}) => {
  const [data, setData] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentEmployee } = useData();
  const [showHelp, setShowHelp] = useState(false);
  const [activeMatrixTab, setActiveMatrixTab] = useState<'managers' | 'staff'>('managers');

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center animate-pulse">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
            {language === 'AR' ? 'جاري التحميل...' : 'Loading Summary...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-xl)' }}>error</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{error || (language === 'AR' ? 'حدث خطأ ما' : 'Something went wrong')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {language === 'AR' ? 'تعذر تحميل بيانات المنظمة. يرجى المحاولة مرة أخرى.' : 'Could not load organization data. Please try again.'}
          </p>
          <button 
            onClick={fetchData}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded">refresh</span>
            {language === 'AR' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pe-2 space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight page-title">{t.title}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {language === 'AR' ? 'إدارة الفروع، الموظفين والحصص المركزية للمنظمة' : 'Manage branches, staff, and central quotas for the organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Header help button (mobile/desktop secondary) */}
          <button 
            onClick={() => setShowHelp(true)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-primary-600 transition-colors"
          >
            <span className="material-symbols-rounded">help</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <OrgPulseGrid 
        metrics={data.metrics} 
        language={normalizedLang} 
        color={color}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Branch Monitoring Section - Constrained by the height of QuotaMonitor */}
        <div className="relative min-h-[300px] lg:min-h-0">
          <div className="lg:absolute lg:inset-0">
            <BranchMasterMonitor 
              branches={data.branches} 
              language={normalizedLang} 
              color={color}
            />
          </div>
        </div>

        {/* Quota & Subscription Section - This defines the row height */}
        <QuotaMonitor 
          metrics={data.metrics} 
          language={normalizedLang} 
          color={color}
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
              color={color}
              iconSize="--icon-sm"
            />
          </div>
        </div>

        <MemberPermissionMatrix 
          employees={activeMatrixTab === 'managers' ? (data.managers || []) : (data.staff || [])}
          branches={data.branches}
          language={language}
          currentEmployeeId={currentEmployee?.id}
          onUpdate={handleUpdateEmployee}
          color={color}
          hideHeader={true} // We'll add this prop to avoid duplicate headers
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
    </div>
  );
};
