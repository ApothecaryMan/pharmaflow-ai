import React, { useState, Suspense, lazy } from 'react';
import { SegmentedControl } from '../components/common/SegmentedControl';

// Dynamic imports for performance (React Best Practices)
const ProcurementPage = lazy(() => import('../components/intelligence/procurement/ProcurementPage').then(module => ({ default: module.ProcurementPage })));
const FinancialsPage = lazy(() => import('../components/intelligence/financials/FinancialsPage').then(module => ({ default: module.FinancialsPage })));
const RiskPage = lazy(() => import('../components/intelligence/risk/RiskPage').then(module => ({ default: module.RiskPage })));
const AuditPage = lazy(() => import('../components/intelligence/audit/AuditPage').then(module => ({ default: module.AuditPage })));

interface IntelligenceDashboardProps {
  t: any;
  language: string;
}

// Loading component
const TabLoading = ({ text }: { text: string }) => (
  <div className="w-full h-96 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">{text}</span>
    </div>
  </div>
);

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ t, language }) => {
  const [activeTab, setActiveTab] = useState<'procurement' | 'financials' | 'risk' | 'audit'>('procurement');

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
                    { label: t.intelligence.dashboard.tabs.risk, value: 'risk' as const, icon: 'warning', count: 3 },
                    { label: t.intelligence.dashboard.tabs.audit, value: 'audit' as const, icon: 'verified' }
                ]}
             />
         </div>
      </div>

      {/* Tab Content with Suspense */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<TabLoading text={t.intelligence.dashboard.loading} />}>
           {activeTab === 'procurement' && <ProcurementPage t={t} language={language} />}
           {activeTab === 'financials' && <FinancialsPage t={t} language={language} />}
           {activeTab === 'risk' && <RiskPage t={t} language={language} />}
           {activeTab === 'audit' && <AuditPage t={t} language={language} />}
        </Suspense>
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
