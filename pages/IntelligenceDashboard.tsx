import type React from 'react';
import { useState } from 'react';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { AuditPage } from '../components/intelligence/audit/AuditPage';
import { FinancialsPage } from '../components/intelligence/financials/FinancialsPage';
import { ProcurementPage } from '../components/intelligence/procurement/ProcurementPage';
import { RiskPage } from '../components/intelligence/risk/RiskPage';
import { useRisk } from '../hooks/useRisk';

interface IntelligenceDashboardProps {
  t: any;
  language: string;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ t, language }) => {
  const [activeTab, setActiveTab] = useState<'procurement' | 'financials' | 'risk' | 'audit'>(
    'procurement'
  );
  const { summary } = useRisk(); // Fetch risk summary for badge count

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* Header Section (Centered Switcher, no title) */}
      <div className='mb-4 flex items-center justify-center shrink-0'>
        <div className='w-full md:w-auto flex justify-center'>
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            size='md'
            iconSize='--icon-lg'
            variant='onPage'
            shape='pill'
            options={[
              {
                label: t.intelligence.dashboard.tabs.procurement,
                value: 'procurement' as const,
                icon: 'shopping_cart',
              },
              {
                label: t.intelligence.dashboard.tabs.financials,
                value: 'financials' as const,
                icon: 'payments',
              },
              {
                label: t.intelligence.dashboard.tabs.risk,
                value: 'risk' as const,
                icon: 'warning',
                count: summary?.total_batches_at_risk || undefined,
              },
              {
                label: t.intelligence.dashboard.tabs.audit,
                value: 'audit' as const,
                icon: 'verified',
              },
            ]}
          />
        </div>
      </div>

      {/* Tab Content with Suspense */}
      <div className='flex-1 overflow-hidden'>
        {activeTab === 'procurement' && <ProcurementPage t={t} language={language} />}
        {activeTab === 'financials' && <FinancialsPage t={t} language={language} />}
        {activeTab === 'risk' && <RiskPage t={t} language={language} />}
        {activeTab === 'audit' && <AuditPage t={t} language={language} />}
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
