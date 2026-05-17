import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DrugApproval } from '../../types';
import { drugApprovalService } from '../../services/inventory/drugApprovalService';
import { formatCurrencyParts } from '../../utils/currency';
import { PageHeader, SegmentedControl, SearchInput } from '../common';
import { Modal } from '../common/Modal';
import { useStatusBar } from '../layout/StatusBar';

interface DrugApprovalQueueProps {
  color: string;
  t: any;
  language: 'en' | 'ar';
  onViewChange?: (view: string) => void;
}

export const DrugApprovalQueue: React.FC<DrugApprovalQueueProps> = ({
  color,
  t,
  language,
  onViewChange: _onViewChange,
}) => {
  const { addNotification } = useStatusBar();

  const [approvals, setApprovals] = useState<DrugApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'suspended' | 'approved'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'suspend' | 'reactivate';
    targetIds: string[];
  }>({
    isOpen: false,
    type: 'approve',
    targetIds: [],
  });

  const isRTL = language === 'ar';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await drugApprovalService.fetchPendingApprovals();
      setApprovals(data);
    } catch (err) {
      console.error('[DrugApprovalQueue] loadData failed:', err);
      addNotification({
        message: isRTL ? 'خطأ في تحميل قائمة الموافقات' : 'Error loading approval list',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [isRTL, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter approvals based on status segment and search query
  const filteredApprovals = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return approvals.filter((app) => {
      const matchesStatus = app.status === statusFilter;

      if (!matchesStatus) return false;
      if (!query) return true;

      const drug = app.globalDrug;
      if (!drug) return false;

      return (
        drug.name.toLowerCase().includes(query) ||
        drug.nameAr?.toLowerCase().includes(query) ||
        drug.activeSubstance?.toLowerCase().includes(query) ||
        drug.barcode?.includes(query) ||
        drug.manufacturer?.toLowerCase().includes(query)
      );
    });
  }, [approvals, statusFilter, searchTerm]);

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleIds = filteredApprovals.map((app) => app.id);
      setSelectedIds(new Set(allVisibleIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const isAllSelected =
    filteredApprovals.length > 0 && filteredApprovals.every((app) => selectedIds.has(app.id));

  // Modals and Actions
  const openConfirmation = (type: 'approve' | 'suspend' | 'reactivate', ids: string[]) => {
    setConfirmModal({
      isOpen: true,
      type,
      targetIds: ids,
    });
  };

  const closeConfirmation = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleExecuteAction = async () => {
    const { type, targetIds } = confirmModal;
    if (targetIds.length === 0) return;

    try {
      setLoading(true);
      closeConfirmation();

      if (type === 'approve') {
        await drugApprovalService.approveDrugs(targetIds);
        addNotification({
          message: t.drugApproval?.successApprove || 'Approved successfully!',
          type: 'success',
        });
      } else if (type === 'suspend') {
        await drugApprovalService.suspendDrugs(targetIds);
        addNotification({
          message: t.drugApproval?.successSuspend || 'Suspended successfully!',
          type: 'success',
        });
      } else if (type === 'reactivate') {
        await drugApprovalService.reactivateDrugs(targetIds);
        addNotification({
          message: t.drugApproval?.successReactivate || 'Reactivated successfully!',
          type: 'success',
        });
      }

      // Clear selection
      setSelectedIds(new Set());

      // Reload approvals list
      await loadData();
    } catch (err) {
      console.error(`[DrugApprovalQueue] Action ${type} failed:`, err);
      addNotification({
        message: isRTL
          ? 'فشلت معالجة الطلب. يرجى المحاولة مرة أخرى.'
          : 'Action execution failed. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Stats computation
  const stats = useMemo(() => {
    return approvals.reduce(
      (acc, app) => {
        if (app.status === 'pending') acc.pending++;
        else if (app.status === 'suspended') acc.suspended++;
        else if (app.status === 'approved') acc.approved++;
        return acc;
      },
      { pending: 0, suspended: 0, approved: 0 }
    );
  }, [approvals]);

  return (
    <div className='h-full flex flex-col gap-3 animate-fade-in pb-10 overflow-y-auto'>
      {/* Page Header */}
      <PageHeader
        mb='mb-0'
        leftContent={
          <div className='relative flex-1 max-w-md w-full'>
            <SearchInput
              value={searchTerm}
              onSearchChange={(val) => setSearchTerm(val)}
              onClear={() => setSearchTerm('')}
              placeholder={t.drugApproval?.searchPlaceholder || 'Search...'}
              color={color}
            />
          </div>
        }
        centerContent={
          <SegmentedControl
            options={[
              {
                label: `${t.drugApproval?.statusPending || 'Pending'} (${stats.pending})`,
                value: 'pending',
              },
              {
                label: `${t.drugApproval?.statusSuspended || 'Suspended'} (${stats.suspended})`,
                value: 'suspended',
              },
              {
                label: `${t.drugApproval?.statusApproved || 'Approved'} (${stats.approved})`,
                value: 'approved',
              },
            ]}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as 'pending' | 'suspended' | 'approved');
              setSelectedIds(new Set());
            }}
            size='md'
            shape='pill'
          />
        }
        showStatsToggle={false}
      />

      {/* Bulk Action Header Floating Bar */}
      {selectedIds.size > 0 && (
        <div className='flex items-center justify-between px-6 py-3 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-lg animate-slide-in'>
          <div className='flex items-center gap-2'>
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-${color}-500 text-white font-bold text-xs`}
            >
              {selectedIds.size}
            </span>
            <span className='text-xs text-gray-600 dark:text-gray-400 font-medium'>
              {isRTL ? 'عناصر محددة' : 'items selected'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {statusFilter === 'pending' && (
              <>
                <button
                  type='button'
                  onClick={() => openConfirmation('approve', Array.from(selectedIds))}
                  className={`flex items-center gap-1.5 px-4 h-9 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold rounded-xl transition-colors`}
                >
                  <span className='material-symbols-rounded text-sm'>done</span>
                  {t.drugApproval?.approveSelected || 'Approve Selected'}
                </button>
                <button
                  type='button'
                  onClick={() => openConfirmation('suspend', Array.from(selectedIds))}
                  className='flex items-center gap-1.5 px-4 h-9 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors'
                >
                  <span className='material-symbols-rounded text-sm'>pause</span>
                  {t.drugApproval?.suspendSelected || 'Suspend Selected'}
                </button>
              </>
            )}
            {statusFilter === 'suspended' && (
              <button
                type='button'
                onClick={() => openConfirmation('reactivate', Array.from(selectedIds))}
                className='flex items-center gap-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors'
              >
                <span className='material-symbols-rounded text-sm'>play_arrow</span>
                {t.drugApproval?.reactivateSelected || 'Reactivate Selected'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid / Table Card */}
      <div className='flex-1 rounded-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-md overflow-hidden flex flex-col'>
        {loading ? (
          // Custom beautiful skeleton layout
          <div className='p-6 flex flex-col gap-4 flex-1'>
            <div className='h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse' />
            <div className='flex-1 flex flex-col gap-3'>
              {['s1', 's2', 's3', 's4', 's5', 's6'].map((key) => (
                <div
                  key={key}
                  className='h-14 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between px-4 animate-pulse'
                >
                  <div className='w-1/3 h-4 bg-gray-200 dark:bg-gray-700 rounded' />
                  <div className='w-1/6 h-4 bg-gray-200 dark:bg-gray-700 rounded' />
                  <div className='w-1/6 h-4 bg-gray-200 dark:bg-gray-700 rounded' />
                  <div className='w-1/12 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg' />
                </div>
              ))}
            </div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          // Empty State view matching Ui Standards
          <div className='flex-1 flex flex-col items-center justify-center p-12 text-center'>
            <div className='w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-850 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4'>
              <span className='material-symbols-rounded text-3xl'>assignment_turned_in</span>
            </div>
            <h3 className='text-base font-bold text-gray-900 dark:text-gray-100 mb-1'>
              {t.drugApproval?.noPendingDrugs || 'No drugs in queue'}
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400 max-w-sm'>
              {isRTL
                ? 'لا توجد أدوية جديدة تتطابق مع التصفية الحالية.'
                : 'No global catalog drugs match the current filter.'}
            </p>
          </div>
        ) : (
          <div className='flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]'>
            <table className='w-full text-xs text-left border-collapse'>
              <thead>
                <tr className='border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50'>
                  <th className='p-4 w-12 text-center'>
                    <input
                      type='checkbox'
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className='w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer'
                    />
                  </th>
                  <th
                    className={`p-4 font-bold text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.drugApproval?.tableHeaders?.drug || 'Drug Name'}
                  </th>
                  <th
                    className={`p-4 font-bold text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.drugApproval?.tableHeaders?.barcode || 'Barcode'}
                  </th>
                  <th
                    className={`p-4 font-bold text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.drugApproval?.tableHeaders?.dosageForm || 'Dosage Form'}
                  </th>
                  <th
                    className={`p-4 font-bold text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.drugApproval?.tableHeaders?.category || 'Category'}
                  </th>
                  <th
                    className={`p-4 font-bold text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.drugApproval?.tableHeaders?.manufacturer || 'Manufacturer'}
                  </th>
                  <th className='p-4 font-bold text-gray-700 dark:text-gray-300 text-center'>
                    {t.drugApproval?.tableHeaders?.price || 'Price'}
                  </th>
                  <th className='p-4 font-bold text-gray-700 dark:text-gray-300 text-center w-24'>
                    {t.drugApproval?.tableHeaders?.status || 'Status'}
                  </th>
                  {statusFilter !== 'approved' && (
                    <th className='p-4 font-bold text-gray-700 dark:text-gray-300 text-center w-24'>
                      {t.drugApproval?.tableHeaders?.actions || 'Actions'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((app) => {
                  const drug = app.globalDrug;
                  if (!drug) return null;

                  const isSelected = selectedIds.has(app.id);
                  const priceParts = formatCurrencyParts(drug.publicPrice);

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-100 dark:border-gray-800/30 hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}
                    >
                      <td className='p-4 text-center'>
                        <input
                          type='checkbox'
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(app.id, e.target.checked)}
                          className='w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer'
                        />
                      </td>
                      <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className='flex flex-col gap-0.5'>
                          <span className='font-bold text-gray-900 dark:text-gray-100'>
                            {isRTL && drug.nameAr ? drug.nameAr : drug.name}
                          </span>
                          {!isRTL && drug.nameAr && (
                            <span className='text-[10px] text-gray-400'>{drug.nameAr}</span>
                          )}
                          {isRTL && drug.name && (
                            <span className='text-[10px] text-gray-400'>{drug.name}</span>
                          )}
                          {drug.activeSubstance && (
                            <span className='text-[10px] text-gray-500 dark:text-gray-400'>
                              {drug.activeSubstance}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`p-4 tabular-nums ${isRTL ? 'text-right' : 'text-left'}`}>
                        {drug.barcode || <span className='text-gray-400'>-</span>}
                      </td>
                      <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {drug.dosageForm || <span className='text-gray-400'>-</span>}
                      </td>
                      <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className='inline-flex items-center px-1.5 py-0.5 rounded-lg border border-current text-primary-700 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider bg-transparent'>
                          {drug.category || 'General'}
                        </span>
                      </td>
                      <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {drug.manufacturer || <span className='text-gray-400'>-</span>}
                      </td>
                      <td className='p-4 text-center font-bold tabular-nums'>
                        {priceParts.amount}{' '}
                        <span className='text-[10px] font-normal text-gray-400'>
                          {priceParts.symbol}
                        </span>
                      </td>
                      <td className='p-4 text-center'>
                        {app.status === 'pending' && (
                          <span className='badge-warning'>
                            {t.drugApproval?.statusPending || 'Pending'}
                          </span>
                        )}
                        {app.status === 'suspended' && (
                          <span className='badge-danger'>
                            {t.drugApproval?.statusSuspended || 'Suspended'}
                          </span>
                        )}
                        {app.status === 'approved' && (
                          <span className='badge-success'>
                            {t.drugApproval?.statusApproved || 'Approved'}
                          </span>
                        )}
                      </td>
                      {statusFilter !== 'approved' && (
                        <td className='p-4 text-center'>
                          <div className='flex items-center justify-center gap-1.5'>
                            {statusFilter === 'pending' && (
                              <>
                                <button
                                  type='button'
                                  onClick={() => openConfirmation('approve', [app.id])}
                                  className='w-7 h-7 flex items-center justify-center bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors border border-green-200/30'
                                >
                                  <span className='material-symbols-rounded text-lg'>done</span>
                                </button>
                                <button
                                  type='button'
                                  onClick={() => openConfirmation('suspend', [app.id])}
                                  className='w-7 h-7 flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg transition-colors border border-amber-200/30'
                                >
                                  <span className='material-symbols-rounded text-lg'>pause</span>
                                </button>
                              </>
                            )}
                            {statusFilter === 'suspended' && (
                              <button
                                type='button'
                                onClick={() => openConfirmation('reactivate', [app.id])}
                                className='w-7 h-7 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-200/30'
                              >
                                <span className='material-symbols-rounded text-lg'>play_arrow</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        title={
          confirmModal.type === 'approve'
            ? t.drugApproval?.confirmApproveTitle?.replace(
                '{{count}}',
                String(confirmModal.targetIds.length)
              ) || 'Approve Drug(s)?'
            : confirmModal.type === 'suspend'
              ? t.drugApproval?.confirmSuspendTitle?.replace(
                  '{{count}}',
                  String(confirmModal.targetIds.length)
                ) || 'Suspend Drug(s)?'
              : t.drugApproval?.confirmReactivateTitle || 'Reactivate Drug(s)?'
        }
        color={color}
      >
        <div className='flex flex-col gap-4'>
          <p className='text-xs text-gray-600 dark:text-gray-400'>
            {confirmModal.type === 'approve'
              ? t.drugApproval?.confirmApproveDesc ||
                'This will instantly add the selected drug(s) to all branches in your pharmacy network.'
              : confirmModal.type === 'suspend'
                ? t.drugApproval?.confirmSuspendDesc ||
                  'This will mark the selected drug(s) as suspended. You can reactivate them later.'
                : isRTL
                  ? 'هل أنت متأكد من إعادة تنشيط الأدوية المحددة؟ ستعود إلى حالة قيد المراجعة للقرار.'
                  : 'Are you sure you want to reactivate the selected drug(s)? They will return to pending review.'}
          </p>
          <div
            className={`flex items-center gap-2 justify-end ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <button
              type='button'
              onClick={closeConfirmation}
              className='px-4 h-9 border border-gray-200 dark:border-gray-800 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            >
              {t.common?.cancel || 'Cancel'}
            </button>
            <button
              type='button'
              onClick={handleExecuteAction}
              className={`px-4 h-9 text-xs font-bold rounded-xl text-white transition-colors ${
                confirmModal.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                  : confirmModal.type === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {confirmModal.type === 'approve'
                ? t.drugApproval?.approveSelected?.replace(' Selected', '') ||
                  t.pendingApproval?.approve ||
                  'Approve'
                : confirmModal.type === 'suspend'
                  ? t.drugApproval?.suspendSelected?.replace(' Selected', '') ||
                    t.pendingApproval?.reject ||
                    'Suspend'
                  : isRTL
                    ? 'إعادة تنشيط'
                    : 'Reactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
