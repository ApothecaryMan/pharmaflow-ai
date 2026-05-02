import React, { useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { StorageKeys } from '../config/storageKeys';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { SearchInput } from '../components/common/SearchInput';
import { PageHeader } from '../components/common/PageHeader';
import { AuditPage } from '../components/intelligence/audit/AuditPage';
import { FinancialsPage } from '../components/intelligence/financials/FinancialsPage';
import { ProcurementPage } from '../components/intelligence/procurement/ProcurementPage';
import { RiskPage } from '../components/intelligence/risk/RiskPage';

// Import hooks
import { useProcurement } from '../hooks/useProcurement';
import { useFinancials } from '../hooks/useFinancials';
import { useRisk } from '../hooks/useRisk';
import { useAudit } from '../hooks/useAudit';
import { type FinancialPeriod } from '../services/intelligence/intelligenceService';
import { ProcurementKPIs } from '../components/intelligence/procurement/ProcurementKPIs';
import { RiskKPIs } from '../components/intelligence/risk/RiskKPIs';
import { FinancialsKPIs } from '../components/intelligence/financials/FinancialsKPIs';
import type { FilterConfig } from '../components/common/FilterPill';
import { permissionsService } from '../services/auth/permissionsService';

interface IntelligenceDashboardProps {
  t: any;
  language: string;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ t, language }) => {
  const [activeTab, setActiveTab] = useState<'procurement' | 'financials' | 'risk' | 'audit'>(
    storage.get(StorageKeys.INTELLIGENCE_ACTIVE_TAB, 'procurement')
  );

  useEffect(() => {
    storage.set(StorageKeys.INTELLIGENCE_ACTIVE_TAB, activeTab);
  }, [activeTab]);

  const [showBottom, setShowBottom] = useState(() => storage.get<boolean>(StorageKeys.HEADER_STATS_VISIBLE, false));

  useEffect(() => {
    storage.set(StorageKeys.HEADER_STATS_VISIBLE, showBottom);
  }, [showBottom]);

  // --- Procurement State & Hook ---
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const procurement = useProcurement({
    supplierId: selectedSupplier,
    categoryId: selectedCategory,
  });

  // --- Financials State & Hook ---
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null);
  const [financialsSubTab, setFinancialsSubTab] = useState<'products' | 'categories'>(
    storage.get(StorageKeys.INTELLIGENCE_FINANCIALS_SUBTAB, 'products')
  );
  const financials = useFinancials(selectedPeriod || 'this_month');

  useEffect(() => {
    storage.set(StorageKeys.INTELLIGENCE_FINANCIALS_SUBTAB, financialsSubTab);
  }, [financialsSubTab]);

  // --- Risk Hook ---
  const risk = useRisk();

  // --- Audit State & Hook ---
  const [financialsSearch, setFinancialsSearch] = useState('');
  const [abcFilter, setAbcFilter] = useState<string[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const audit = useAudit();
  const canViewStats = permissionsService.can('reports.view_intelligence');

  // --- Tab Configuration ---
  const tabOptions = useMemo(() => [
    { label: t.intelligence.dashboard.tabs.procurement, value: 'procurement' as const, icon: 'shopping_cart', permission: 'reports.view_intelligence' as const },
    { label: t.intelligence.dashboard.tabs.financials, value: 'financials' as const, icon: 'payments', permission: 'reports.view_financial' as const },
    { label: t.intelligence.dashboard.tabs.risk, value: 'risk' as const, icon: 'warning', count: risk.summary?.total_batches_at_risk || undefined, permission: 'reports.view_intelligence' as const },
    { label: t.intelligence.dashboard.tabs.audit, value: 'audit' as const, icon: 'verified', permission: 'reports.view_intelligence' as const },
  ], [t, risk.summary]);

  // Auto-redirect if current tab is forbidden
  useEffect(() => {
    const isForbidden = !permissionsService.can(tabOptions.find(t => t.value === activeTab)?.permission || 'reports.view_intelligence');
    if (isForbidden) {
      const fallback = tabOptions.find(opt => permissionsService.can(opt.permission))?.value;
      if (fallback) setActiveTab(fallback);
    }
  }, [activeTab, tabOptions]);

  // --- Header Helpers ---
  const renderLeftActions = () => {
    switch (activeTab) {
      case 'procurement':
        return (
          <button
            onClick={() => (window as any).dispatchGlobalEvent?.('OPEN_PO_MODAL', procurement.filteredItems.map(i => i.product_id))}
            className='flex items-center gap-2 px-4 py-2 bg-emerald-100/80 dark:bg-emerald-900/20 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-900/50 rounded-xl text-sm font-semibold transition-all active:scale-95'
          >
            <span className='material-symbols-rounded font-icon' style={{ fontSize: 'var(--icon-lg)' }}>add_shopping_cart</span>
            {t.intelligence.procurement.actions.generatePO}
          </button>
        );
      case 'risk':
        return (
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => console.log('Create Return')}
              className='px-3 py-1.5 text-sm bg-red-100/80 dark:bg-red-900/20 hover:bg-red-200/80 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-900/50 rounded-xl transition-all font-semibold active:scale-95'
            >
              {t.intelligence.risk.actions.createReturn}
            </button>
            <button
              type='button'
              onClick={() => (window as any).dispatchGlobalEvent?.('OPEN_DISCOUNT_MODAL')}
              className='px-3 py-1.5 text-sm bg-amber-100/80 dark:bg-amber-900/20 hover:bg-amber-200/80 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-900/50 rounded-xl transition-all font-semibold flex items-center gap-1 active:scale-95'
            >
              <span className='material-symbols-rounded font-icon' style={{ fontSize: 'var(--icon-lg)' }}>sell</span>
              {t.intelligence.risk.actions.applyDiscount}
            </button>
          </div>
        );
      case 'financials':
        const periodFilterConfig: FilterConfig = {
          id: 'period',
          label: t.intelligence.financials.filters.period,
          icon: 'calendar_today',
          mode: 'single',
          options: [
            { label: t.intelligence.financials.filters.periods.this_month, value: 'this_month' },
            { label: t.intelligence.financials.filters.periods.last_month, value: 'last_month' },
            { label: t.intelligence.financials.filters.periods.last_3_months, value: 'last_3_months' },
            { label: t.intelligence.financials.filters.periods.this_year, value: 'this_year' },
          ]
        };

        const abcFilterConfig: FilterConfig = {
          id: 'abc_class',
          label: 'ABC Class',
          icon: 'category',
          mode: 'multiple',
          options: [
            { label: 'Class A', value: 'A' },
            { label: 'Class B', value: 'B' },
            { label: 'Class C', value: 'C' },
          ]
        };

        return (
          <div className='w-full max-w-md'>
            <SearchInput
              value={financialsSearch}
              onSearchChange={setFinancialsSearch}
              placeholder={t.intelligence.financials.filters.searchPlaceholder}
              className='w-full'
              rounded='xl'
              filterConfigs={[periodFilterConfig, abcFilterConfig]}
              activeFilters={{ 
                period: selectedPeriod ? [selectedPeriod] : [], 
                abc_class: abcFilter 
              }}
              onUpdateFilter={(id, vals) => {
                if (id === 'period') setSelectedPeriod(vals.length > 0 ? vals[0] as FinancialPeriod : null);
                if (id === 'abc_class') setAbcFilter(vals as string[]);
              }}
            />
          </div>
        );
      case 'audit':
        return (
          <div className='w-full max-w-md'>
            <SearchInput
              value={auditSearch}
              onSearchChange={setAuditSearch}
              placeholder={t.intelligence.audit.searchPlaceholder}
              className='w-full'
              rounded='xl'
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderBottomContent = () => {
    switch (activeTab) {
      case 'procurement':
        return <ProcurementKPIs summary={procurement.summary} t={t} isLoading={procurement.loading && !procurement.summary} />;
      case 'risk':
        return <RiskKPIs summary={risk.summary} t={t} isLoading={risk.loading && !risk.summary} />;
      case 'financials':
        return <FinancialsKPIs kpis={financials.kpis} t={t} isLoading={financials.loading && !financials.kpis} />;
      default:
        return null;
    }
  };

  const renderRightFilters = () => {
    let filters: React.ReactNode = null;
    switch (activeTab) {
      case 'procurement':
        const supplierOptions = [
          { label: t.intelligence.procurement.filters.all, value: 'all' },
          ...procurement.suppliers.map((s) => ({ label: s.name, value: s.id })),
        ];
        const categoryOptions = [
          { label: t.intelligence.procurement.filters.all, value: 'all' },
          ...procurement.categories.map((c) => ({ label: c.name, value: c.id })),
        ];
        filters = (
          <div className='flex gap-2 items-center'>
            <FilterDropdown
              items={supplierOptions}
              selectedItem={supplierOptions.find((i) => i.value === selectedSupplier)}
              onSelect={(item) => setSelectedSupplier(item.value)}
              keyExtractor={(item) => item.value}
              renderItem={(item, isSelected) => (
                <span
                  className={`${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {item.label}
                </span>
              )}
              renderSelected={(item) => (
                <div className='flex items-center gap-1.5'>
                  <span className='material-symbols-rounded text-gray-500' style={{ fontSize: 'var(--icon-base)' }}>
                    inventory_2
                  </span>
                  <span className='text-gray-900 dark:text-white text-xs font-medium'>
                    {item?.label}
                  </span>
                </div>
              )}
              variant='input'
              floating
              minHeight={36}
              className='min-w-32'
            />
            <FilterDropdown
              items={categoryOptions}
              selectedItem={categoryOptions.find((i) => i.value === selectedCategory)}
              onSelect={(item) => setSelectedCategory(item.value)}
              keyExtractor={(item) => item.value}
              renderItem={(item, isSelected) => (
                <span
                  className={`${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {item.label}
                </span>
              )}
              renderSelected={(item) => (
                <div className='flex items-center gap-1.5'>
                  <span className='material-symbols-rounded text-gray-500' style={{ fontSize: 'var(--icon-base)' }}>category</span>
                  <span className='text-gray-900 dark:text-white text-xs font-medium'>
                    {item?.label}
                  </span>
                </div>
              )}
              variant='input'
              floating
              minHeight={36}
              className='min-w-32'
            />
          </div>
        );
        break;
      case 'financials':
        filters = (
          <div className='flex gap-2 items-center'>
            <SegmentedControl
              value={financialsSubTab}
              onChange={(val) => setFinancialsSubTab(val as 'products' | 'categories')}
              options={[
                {
                  label: t.intelligence.financials.sections.productProfitability,
                  value: 'products',
                },
                {
                  label: t.intelligence.financials.sections.categoryBreakdown,
                  value: 'categories',
                },
              ]}
              size='sm'
              fullWidth={false}
              shape='pill'
            />
            <button
              className='w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95'
            >
              <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>file_download</span>
            </button>
          </div>
        );
        break;
      case 'audit':
        filters = (
          <button
            className='w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95'
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>file_download</span>
          </button>
        );
        break;
    }

    return (
      <div className='flex items-center gap-2'>
        {filters}
      </div>
    );
  };

  if (!canViewStats) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 border border-red-100 dark:border-red-900/30">
          <span className="material-symbols-rounded text-4xl text-red-500">lock</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
          {language === 'AR' ? 'غير مصرح بالدخول' : 'Access Denied'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
          {language === 'AR' 
            ? 'ليست لديك الصلاحيات الكافية لعرض لوحة تقارير الذكاء الاصطناعي والتحليلات المالية.' 
            : 'You do not have sufficient permissions to view the AI Intelligence and Financial Analytics dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      <PageHeader
        leftContent={renderLeftActions()}
        centerContent={
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            size='md'
            iconSize='--icon-lg'
            shape='pill'
            useGraphicFont={true}
            className="w-full sm:w-[540px]"
            options={tabOptions}
          />
        }
        rightContent={renderRightFilters()}
        bottomContent={canViewStats ? renderBottomContent() : null}
        showBottom={canViewStats && showBottom && activeTab !== 'audit'}
        showStatsToggle={canViewStats && activeTab !== 'audit'}
        onToggleBottom={() => setShowBottom(!showBottom)}
        toggleTooltip={showBottom ? t.global.actions.hideStats : t.global.actions.showStats}
        dir={language === 'AR' ? 'rtl' : 'ltr'}
        mb='mb-4'
      />

      {/* Tab Content */}
      <div className='flex-1 px-page pb-page overflow-y-auto main-content-scroll'>
        {activeTab === 'procurement' && (
          <ProcurementPage 
            t={t} 
            language={language}
            {...procurement}
          />
        )}
        {activeTab === 'financials' && (
          <FinancialsPage
            t={t}
            language={language}
            {...financials}
            activeTab={financialsSubTab}
            setActiveTab={setFinancialsSubTab}
            globalFilter={financialsSearch}
            columnFilters={abcFilter.length > 0 ? { abc_class: abcFilter } : {}}
          />
        )}
        {activeTab === 'risk' && (
          <RiskPage 
            t={t} 
            language={language}
            {...risk}
          />
        )}
        {activeTab === 'audit' && (
          <AuditPage 
            t={t} 
            language={language}
            globalFilter={auditSearch}
            {...audit}
          />
        )}
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
