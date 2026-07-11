import { createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { type ExpenseFilterType, useExpenses } from '../../hooks/finance/useExpenses';
import { useShift } from '../../hooks/sales/useShift';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useAuthStore } from '../../stores/authStore';
import type { Employee, Expense, ExpenseCategory } from '../../types';
import { FilterDropdown } from '../common/FilterDropdown';
import { PageHeader } from '../common/PageHeader';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { TanStackTable } from '../common/TanStackTable';
import { RecordExpenseModal } from './RecordExpenseModal';

interface ExpenseTrackerProps {
  t: Translations;
  language: 'EN' | 'AR';
  currentEmployeeId: string;
  onViewChange: (view: string) => void;
}

const columnHelper = createColumnHelper<Expense>();

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  t,
  language,
  currentEmployeeId,
  onViewChange,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const { currentShift } = useShift();
  const {
    expenses,
    summary,
    isLoading,
    filterType,
    setFilterType,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    categoryFilter,
    setCategoryFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    recordExpense,
    deleteExpense,
  } = useExpenses();

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isRtl = language === 'AR';

  const categoryFilterOptions = useMemo(
    () => [
      { value: 'all', label: `${t.expenses.table.category} (${t.global.actions.all})` },
      { value: 'utilities', label: t.expenses.categories.utilities },
      { value: 'rent', label: t.expenses.categories.rent },
      { value: 'maintenance', label: t.expenses.categories.maintenance },
      { value: 'supplies', label: t.expenses.categories.supplies },
      { value: 'petty_cash', label: t.expenses.categories.petty_cash },
      { value: 'transportation', label: t.expenses.categories.transportation },
      { value: 'salaries', label: t.expenses.categories.salaries },
      { value: 'misc', label: t.expenses.categories.misc },
    ],
    [t]
  );

  const paymentFilterOptions = useMemo(
    () => [
      { value: 'all', label: `${t.expenses.modal.paymentMethod} (${t.global.actions.all})` },
      { value: 'cash', label: t.expenses.modal.cash },
      { value: 'bank_transfer', label: t.expenses.modal.bank_transfer },
      { value: 'card', label: t.expenses.modal.card },
    ],
    [t]
  );

  const selectedCategoryFilter = useMemo(() => {
    return (
      categoryFilterOptions.find((o) => o.value === categoryFilter) || categoryFilterOptions[0]
    );
  }, [categoryFilterOptions, categoryFilter]);

  const selectedPaymentFilter = useMemo(() => {
    return (
      paymentFilterOptions.find((o) => o.value === paymentMethodFilter) || paymentFilterOptions[0]
    );
  }, [paymentFilterOptions, paymentMethodFilter]);

  // Category to badge style & icon mapping
  const categoryStyleMap: Record<
    ExpenseCategory,
    { badgeClass: string; icon: string; color: string }
  > = {
    utilities: { badgeClass: 'badge-blue', icon: 'power', color: 'bg-blue-500' },
    rent: { badgeClass: 'badge-purple', icon: 'location_away', color: 'bg-purple-500' },
    maintenance: { badgeClass: 'badge-orange', icon: 'build', color: 'bg-amber-500' },
    supplies: { badgeClass: 'badge-green', icon: 'shopping_bag', color: 'bg-emerald-500' },
    petty_cash: { badgeClass: 'badge-orange', icon: 'payments', color: 'bg-orange-500' },
    transportation: { badgeClass: 'badge-teal', icon: 'local_shipping', color: 'bg-sky-500' },
    salaries: { badgeClass: 'badge-red', icon: 'badge', color: 'bg-rose-500' },
    misc: { badgeClass: 'badge-neutral', icon: 'more_horiz', color: 'bg-zinc-500' },
  };

  // Find employee name helper
  const getEmployeeName = useCallback(
    (empId: string) => {
      const emp = employees.find((e) => e.id === empId);
      return emp ? emp.name : empId;
    },
    [employees]
  );

  // Find largest expense category for header card
  const largestCategory = useMemo(() => {
    let largestCat: ExpenseCategory = 'misc';
    let maxAmount = 0;

    (Object.entries(summary.byCategory) as [ExpenseCategory, number][]).forEach(([cat, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        largestCat = cat;
      }
    });

    if (maxAmount === 0) return t.expenses.categories.misc;
    return t.expenses.categories[largestCat] || largestCat;
  }, [summary.byCategory, t]);

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('recordedAt', {
        header: t.expenses.table.time,
        cell: (info) => {
          const date = new Date(info.getValue());
          return (
            <span className='text-xs text-(--text-secondary) tabular-nums'>
              {date.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          );
        },
      }),
      columnHelper.accessor('category', {
        header: t.expenses.table.category,
        cell: (info) => {
          const cat = info.getValue() as ExpenseCategory;
          const style = categoryStyleMap[cat] || categoryStyleMap.misc;
          return (
            <span className={`gap-1.5 ${style.badgeClass}`}>
              <span
                className='material-symbols-rounded'
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {style.icon}
              </span>
              {t.expenses.categories[cat] || cat}
            </span>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: t.expenses.table.description,
        cell: (info) => (
          <span className='text-xs text-(--text-primary) font-medium block truncate max-w-[240px]'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('paymentMethod', {
        header: t.expenses.table.paymentMethod,
        cell: (info) => {
          const method = info.getValue();
          const label =
            method === 'cash'
              ? t.expenses.modal.cash
              : method === 'bank_transfer'
                ? t.expenses.modal.bank_transfer
                : t.expenses.modal.card;
          const badgeClass =
            method === 'cash'
              ? 'badge-green'
              : method === 'bank_transfer'
                ? 'badge-blue'
                : 'badge-purple';

          return <span className={badgeClass}>{label}</span>;
        },
      }),
      columnHelper.accessor('amount', {
        header: t.expenses.table.amount,
        cell: (info) => (
          <span className='text-xs font-bold text-(--text-primary) tabular-nums'>
            {info.getValue().toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor('employeeId', {
        header: t.expenses.table.employee,
        cell: (info) => (
          <span className='text-xs text-(--text-secondary)'>
            {getEmployeeName(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const row = info.row.original;
          // Allow deleting own unapproved expenses
          const canDelete =
            row.employeeId === currentEmployeeId || currentShift?.openedBy === currentEmployeeId;
          if (!canDelete) return null;

          return (
            <button
              onClick={() => {
                if (confirm(t.global.actions.delete + '?')) {
                  deleteExpense(row.id);
                }
              }}
              className='w-7 h-7 rounded-full grid place-items-center text-red-500 hover:bg-red-500/10 transition-all'
              title={t.global.actions.delete}
            >
              <span className='material-symbols-rounded text-base'>delete</span>
            </button>
          );
        },
      }),
    ],
    [t, language, employees, currentEmployeeId, currentShift, deleteExpense, getEmployeeName]
  );

  const categoryBreakdown = useMemo(() => {
    return (Object.entries(summary.byCategory) as [ExpenseCategory, number][])
      .map(([cat, amount]) => {
        const percentage = summary.total > 0 ? (amount / summary.total) * 100 : 0;
        return {
          category: cat,
          amount,
          percentage,
          label: t.expenses.categories[cat] || cat,
          style: categoryStyleMap[cat] || categoryStyleMap.misc,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [summary.byCategory, summary.total, t]);

  const timeFilterOptions = [
    { label: t.expenses.filters.today, value: 'today' },
    { label: t.expenses.filters.thisWeek, value: 'week' },
    { label: t.expenses.filters.thisMonth, value: 'month' },
    { label: t.expenses.filters.custom, value: 'custom' },
  ];

  return (
    <div className='h-full overflow-y-auto scrollbar-hide text-start' dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header with Segmented Period Filters */}
      <PageHeader
        title={t.expenses.title}
        subtitle={t.expenses.title}
        centerContent={
          <SegmentedControl
            options={timeFilterOptions}
            value={filterType}
            onChange={(val) => setFilterType(val as ExpenseFilterType)}
            size='md'
            shape='pill'
            useGraphicFont={true}
            className='min-w-[400px]'
          />
        }
        rightContent={
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className='h-10 px-4 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center gap-2 transition-all active:scale-95'
          >
            <span className='material-symbols-rounded'>receipt_long</span>
            {t.expenses.recordExpense}
          </button>
        }
        sticky={true}
        mb='mb-4'
        showBottom={true}
        bottomContent={
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <SmallCard
              title={t.expenses.summary.total}
              value={summary.total}
              icon='account_balance_wallet'
              iconColor='rose'
              type='currency'
              isLoading={isLoading}
            />
            <SmallCard
              title={t.expenses.summary.cashTotal}
              value={summary.cashTotal}
              icon='payments'
              iconColor='emerald'
              type='currency'
              isLoading={isLoading}
            />
            <SmallCard
              title={t.expenses.summary.count}
              value={summary.count}
              icon='tag'
              iconColor='blue'
              type='number'
              isLoading={isLoading}
            />
            <SmallCard
              title={t.expenses.summary.largestCategory}
              value={largestCategory}
              icon='bar_chart'
              iconColor='purple'
              type='text'
              isLoading={isLoading}
            />
          </div>
        }
      />

      {/* Main Grid Layout */}
      <div className='px-4'>
        {filterType === 'custom' && (
          <div className='mb-4 p-4 bg-(--bg-card) border border-(--border-divider) rounded-2xl flex flex-wrap gap-4 items-end'>
            <div>
              <label
                htmlFor='custom-date-from'
                className='block text-xs font-bold text-(--text-secondary) uppercase mb-1'
              >
                {t.date} ({t.common.actions})
              </label>
              <input
                id='custom-date-from'
                type='date'
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className='h-9 px-3 bg-zinc-500/5 dark:bg-zinc-400/10 border border-(--border-divider) rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs'
              />
            </div>
            <div>
              <label
                htmlFor='custom-date-to'
                className='block text-xs font-bold text-(--text-secondary) uppercase mb-1'
              >
                {t.date}
              </label>
              <input
                id='custom-date-to'
                type='date'
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className='h-9 px-3 bg-zinc-500/5 dark:bg-zinc-400/10 border border-(--border-divider) rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs'
              />
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-5'>
          {/* Left Summary Panel: Breakdown */}
          <div className='lg:col-span-1 space-y-4'>
            <div className='p-5 bg-(--bg-card) border border-(--border-divider) rounded-2xl'>
              <h3 className='text-sm font-bold text-(--text-primary) uppercase tracking-wide mb-4'>
                {t.expenses.summary.largestCategory}
              </h3>

              {summary.total === 0 ? (
                <div className='text-center py-6 text-xs text-(--text-tertiary)'>
                  {t.expenses.empty}
                </div>
              ) : (
                <div className='space-y-4'>
                  {categoryBreakdown.map((item) => {
                    if (item.amount === 0) return null;
                    return (
                      <div key={item.category} className='space-y-1'>
                        <div className='flex justify-between items-center text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className={`w-2 h-2 rounded-full ${item.style.color}`} />
                            <span className='font-semibold text-(--text-primary)'>
                              {item.label}
                            </span>
                          </div>
                          <span className='font-bold text-(--text-secondary) tabular-nums'>
                            {item.amount.toFixed(2)} ({item.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className='h-1.5 w-full bg-zinc-500/10 dark:bg-zinc-400/10 rounded-full overflow-hidden'>
                          <div
                            className={`h-full rounded-full ${item.style.color}`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className='p-5 bg-(--bg-card) border border-(--border-divider) rounded-2xl'>
              <h3 className='text-sm font-bold text-(--text-primary) uppercase tracking-wide mb-4'>
                {t.expenses.modal.paymentMethod}
              </h3>
              {summary.total === 0 ? (
                <div className='text-center py-6 text-xs text-(--text-tertiary)'>
                  {t.expenses.empty}
                </div>
              ) : (
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center'>
                    <span className='text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400'>
                      {t.expenses.modal.cash}
                    </span>
                    <p className='text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums'>
                      {summary.cashTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className='p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center'>
                    <span className='text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400'>
                      {t.expenses.modal.bank_transfer} / {t.expenses.modal.card}
                    </span>
                    <p className='text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1 tabular-nums'>
                      {summary.nonCashTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Log Table Panel */}
          <div className='lg:col-span-2 bg-(--bg-card) border border-(--border-divider) rounded-2xl overflow-hidden flex flex-col min-h-[400px]'>
            {/* Top Toolbar inside table block */}
            <div className='p-4 border-b border-(--border-divider) flex flex-wrap items-center justify-between gap-3 bg-(--bg-card)'>
              <div className='w-full flex items-center gap-2'>
                <SearchInput
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  compact
                  wrapperClassName='flex-1'
                  placeholder={t.global?.actions?.search || 'Search expenses...'}
                />

                {/* Category Filter */}
                <FilterDropdown
                  items={categoryFilterOptions}
                  selectedItem={selectedCategoryFilter}
                  onSelect={(item) => setCategoryFilter(item.value)}
                  keyExtractor={(item) => item.value}
                  renderSelected={(item) => <span>{item?.label}</span>}
                  renderItem={(item) => <span>{item.label}</span>}
                  variant='input'
                  dense={true}
                  className='w-48 shrink-0'
                  color='emerald'
                  floating={true}
                  minHeight={32}
                  rounded='lg'
                />

                {/* Payment Method Filter */}
                <FilterDropdown
                  items={paymentFilterOptions}
                  selectedItem={selectedPaymentFilter}
                  onSelect={(item) => setPaymentMethodFilter(item.value)}
                  keyExtractor={(item) => item.value}
                  renderSelected={(item) => <span>{item?.label}</span>}
                  renderItem={(item) => <span>{item.label}</span>}
                  variant='input'
                  dense={true}
                  className='w-48 shrink-0'
                  color='emerald'
                  floating={true}
                  minHeight={32}
                  rounded='lg'
                />
              </div>
            </div>

            <div className='flex-1'>
              <TanStackTable
                tableId='expenses_log'
                data={expenses}
                columns={columns}
                isLoading={isLoading}
                emptyMessage={t.expenses.empty}
                enablePagination={true}
                pageSize={10}
                dense={true}
                globalFilter={searchQuery}
                enableSearch={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Record New Expense Dialog Modal */}
      <RecordExpenseModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        t={t}
        language={language}
        onRecord={recordExpense}
        currentShift={currentShift}
      />
    </div>
  );
};
