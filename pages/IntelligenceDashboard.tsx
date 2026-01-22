import React, { useState } from 'react';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { useRisk } from '../hooks/useRisk';

import { ProcurementPage } from '../components/intelligence/procurement/ProcurementPage';
import { FinancialsPage } from '../components/intelligence/financials/FinancialsPage';
import { RiskPage } from '../components/intelligence/risk/RiskPage';
import { AuditPage } from '../components/intelligence/audit/AuditPage';

interface IntelligenceDashboardProps {
  t: any;
  language: string;
}



export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ t, language }) => {
  const [activeTab, setActiveTab] = useState<'procurement' | 'financials' | 'risk' | 'audit'>('procurement');
  const { summary } = useRisk(); // Fetch risk summary for badge count

  return (
    <div className="h-full p-4 lg:p-6 flex flex-col overflow-hidden" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t.intelligence.dashboard.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.intelligence.dashboard.subtitle}</p>
         </div>
         
         <div className="w-full md:w-auto">
             <SegmentedControl
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
                size="md"
                variant="onPage"
                shape="pill"
                options={[
                    { label: t.intelligence.dashboard.tabs.procurement, value: 'procurement' as const, icon: 'shopping_cart' },
                    { label: t.intelligence.dashboard.tabs.financials, value: 'financials' as const, icon: 'payments' },
                    { label: t.intelligence.dashboard.tabs.risk, value: 'risk' as const, icon: 'warning', count: summary?.total_batches_at_risk || undefined },
                    { label: t.intelligence.dashboard.tabs.audit, value: 'audit' as const, icon: 'verified' }
                ]}
             />
         </div>
      </div>

      {/* Tab Content with Suspense */}
      <div className="flex-1 overflow-hidden">
         {activeTab === 'procurement' && <ProcurementPage t={t} language={language} />}
         {activeTab === 'financials' && <FinancialsPage t={t} language={language} />}
         {activeTab === 'risk' && <RiskPage t={t} language={language} />}
         {activeTab === 'audit' && <AuditPage t={t} language={language} />}
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
