import { useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { StorageKeys } from '../config/storageKeys';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { SearchInput } from '../components/common/SearchInput';
import { AuditPage } from '../components/intelligence/audit/AuditPage';
import { FinancialsPage } from '../components/intelligence/financials/FinancialsPage';
import { ProcurementPage } from '../components/intelligence/procurement/ProcurementPage';
import { RiskPage } from '../components/intelligence/risk/RiskPage';

// Import hooks
import { useProcurement } from '../hooks/useProcurement';
import { useFinancials } from '../hooks/useFinancials';
import { useRisk } from '../hooks/useRisk';
import { useAudit } from '../hooks/useAudit';
import type { FinancialPeriod } from '../services/intelligence/intelligenceService';

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

  // --- Procurement State & Hook ---
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const procurement = useProcurement({
    supplierId: selectedSupplier,
    categoryId: selectedCategory,
  });

  // --- Financials State & Hook ---
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod>('this_month');
  const [financialsSubTab, setFinancialsSubTab] = useState<'products' | 'categories'>(
    storage.get(StorageKeys.INTELLIGENCE_FINANCIALS_SUBTAB, 'products')
  );
  const financials = useFinancials(selectedPeriod);

  useEffect(() => {
    storage.set(StorageKeys.INTELLIGENCE_FINANCIALS_SUBTAB, financialsSubTab);
  }, [financialsSubTab]);

  // --- Risk Hook ---
  const risk = useRisk();

  // --- Audit State & Hook ---
  const [auditSearch, setAuditSearch] = useState('');
  const audit = useAudit();

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
        return (
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
            color='primary'
            fullWidth={false}
            variant='onPage'
            shape='pill'
          />
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

  const renderRightFilters = () => {
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
        return (
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
      case 'financials':
        const periodOptions = [
          { label: t.intelligence.financials.filters.periods.this_month, value: 'this_month' as FinancialPeriod },
          { label: t.intelligence.financials.filters.periods.last_month, value: 'last_month' as FinancialPeriod },
          { label: t.intelligence.financials.filters.periods.last_3_months, value: 'last_3_months' as FinancialPeriod },
          { label: t.intelligence.financials.filters.periods.this_year, value: 'this_year' as FinancialPeriod },
        ];
        return (
          <div className='flex gap-2'>
            <FilterDropdown
              items={periodOptions}
              selectedItem={periodOptions.find((p) => p.value === selectedPeriod)}
              onSelect={(item) => setSelectedPeriod(item.value)}
              keyExtractor={(item) => item.value}
              renderItem={(item, isSelected) => (
                <span
                  className={`${isSelected ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {item.label}
                </span>
              )}
              renderSelected={(item) => (
                <div className='flex items-center gap-2'>
                  <span className='material-symbols-rounded text-gray-400' style={{ fontSize: 'var(--icon-base)' }}>
                    calendar_today
                  </span>
                  <span className='font-medium text-gray-700 dark:text-gray-300 text-xs'>
                    {item?.label}
                  </span>
                </div>
              )}
              variant='input'
              floating
              minHeight={36}
            />
            <button
              className='w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95'
            >
              <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>file_download</span>
            </button>
          </div>
        );
      case 'audit':
        return (
          <button
            className='w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95'
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>file_download</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* Header Section (Three-column layout) */}
      <div className='mb-4 flex items-center justify-between shrink-0 px-1'>
        {/* Left Side: Actions */}
        <div className='flex-1 flex justify-start items-center min-w-0'>
          {renderLeftActions()}
        </div>

        {/* Center: Main Switcher */}
        <div className='flex-none mx-4'>
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
                count: risk.summary?.total_batches_at_risk || undefined,
              },
              {
                label: t.intelligence.dashboard.tabs.audit,
                value: 'audit' as const,
                icon: 'verified',
              },
            ]}
          />
        </div>

        {/* Right Side: Filters */}
        <div className='flex-1 flex justify-end items-center min-w-0'>
          {renderRightFilters()}
        </div>
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-hidden'>
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
