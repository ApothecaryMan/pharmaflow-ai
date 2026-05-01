import React, { useState, useEffect } from 'react';
import { money, pricing } from '../../utils/money';
import { permissionsService } from '../../services/auth/permissions';
import { useSettings } from '../../context';
import { PENDING_APPROVAL_HELP } from '../../i18n/helpInstructions';
import { type Purchase, type Employee, type Shift } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatCurrencyParts } from '../../utils/currency';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { useSmartDirection } from '../common/SmartInputs';
import { PageHeader } from '../common/PageHeader';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';

// --- Sub-components (SalesHistory Style) ---

const CurrencyDisplay: React.FC<{ amount: number; className?: string }> = ({ amount, className = '' }) => {
  const parts = formatCurrencyParts(amount);
  return (
    <span className={`tabular-nums ${className}`}>
      {parts.amount}
      <span className='text-[10px] text-gray-400 font-medium ms-1'>{parts.symbol}</span>
    </span>
  );
};

interface PendingApprovalProps {
  color: string;
  t: any;
  purchases: Purchase[];
  onApprovePurchase: (id: string) => void;
  onMarkAsReceived?: (id: string) => void;
  onRejectPurchase: (id: string, reason?: string) => void;
  language: string;
  currentShift: Shift | null;
  currentEmployeeId: string | null;
  employees: Employee[];
  hideHeader?: boolean;
  externalSearch?: string;
  onViewChange?: (view: string, params?: any) => void;
  isLoading?: boolean;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({
  color,
  t,
  purchases,
  onApprovePurchase,
  onMarkAsReceived,
  onRejectPurchase,
  language,
  currentShift,
  currentEmployeeId,
  employees,
  hideHeader = false,
  externalSearch = '',
  onViewChange,
  isLoading,
}) => {
  const { textTransform } = useSettings();
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Reject State
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [purchaseToReject, setPurchaseToReject] = useState<string | null>(null);

  const rejectReasonDir = useSmartDirection(
    rejectReason,
    'E.g., Incorrect pricing, wrong items...'
  );

  // Approve State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [purchaseToApprove, setPurchaseToApprove] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [search, setSearch] = useState('');

  // Helper: Format time with Arabic AM/PM
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    const am = language === 'AR' ? 'صباحاً' : 'AM';
    const pm = language === 'AR' ? 'مساءً' : 'PM';
    const period = hours >= 12 ? pm : am;
    return `${hour12}:${minuteStr} ${period}`;
  };

  const helpContent = PENDING_APPROVAL_HELP[language as 'EN' | 'AR'] || PENDING_APPROVAL_HELP.EN;

  const pendingPurchases = purchases.filter((p) => p.status === 'pending');

  const filteredPendingPurchases = pendingPurchases.filter((p) => {
    const searchVal = externalSearch || search;
    const searchLower = searchVal.toLowerCase();
    return (
      p.supplierName.toLowerCase().includes(searchLower) ||
      p.invoiceId.toLowerCase().includes(searchLower) ||
      (p.externalInvoiceId && p.externalInvoiceId.toLowerCase().includes(searchLower))
    );
  });

  // Reject Logic
  const handleOpenReject = (id: string, e?: React.MouseEvent) => {
    if (!permissionsService.can('purchase.reject')) return;
    if (e) e.stopPropagation();
    setPurchaseToReject(id);
    setIsRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (purchaseToReject) {
      onRejectPurchase(purchaseToReject, rejectReason);
      setIsRejectModalOpen(false);
      setPurchaseToReject(null);
      setRejectReason('');
    }
  };

  // Approve Logic
  const handleOpenApprove = (id: string, e?: React.MouseEvent) => {
    if (!permissionsService.can('purchase.approve')) return;
    if (e) e.stopPropagation();
    setPurchaseToApprove(id);
    setIsApproveModalOpen(true);
  };

  const confirmApprove = () => {
    if (purchaseToApprove) {
      onApprovePurchase(purchaseToApprove);
      setIsApproveModalOpen(false);
      setPurchaseToApprove(null);
      if (selectedPurchase) setSelectedPurchase(null);
    }
  };

  // Removed Auto-fill effect for approverName as it is now handled by context

  return (
    <div className='h-full flex flex-col space-y-6 animate-fade-in overflow-hidden'>
      {/* Header */}
      {!hideHeader && (
        <PageHeader
          leftContent={
            <div className='w-48 xl:w-120'>
              <SearchInput
                value={search}
                onSearchChange={setSearch}
                placeholder={t.placeholders?.search || 'Search by supplier or ID...'}
                rounded='full'
                color={color}
                className='h-9 text-sm'
              />
            </div>
          }
          centerContent={
            <SegmentedControl
              options={[
                { value: 'create', label: t.newPurchase || 'New Purchase', icon: 'shopping_cart' },
                { value: 'approve', label: t.pendingApproval?.title || 'Approve', icon: 'assignment_turned_in' },
                { value: 'history', label: t.viewHistory || 'History', icon: 'history' },
              ]}
              value='approve'
              onChange={(val) => {
                if (val === 'approve') return;
                if (val === 'history') onViewChange?.('purchase-history');
                else onViewChange?.('purchases', { mode: val });
              }}
              shape="pill"
              size="md"
              iconSize="--icon-lg"
              useGraphicFont={true}
              className="w-full sm:w-[520px]"
            />
          }
          rightContent={
            <div className='flex items-center gap-2'>
              <div className='px-4 py-2 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full bg-orange-500 animate-pulse'></span>
                <span className='text-sm font-bold text-orange-600 dark:text-orange-400'>
                  {pendingPurchases.length} {t.pendingReview || 'Pending'}
                </span>
              </div>
            </div>
          }
        />
      )}

      {/* Loading & Content States */}
      {isLoading && filteredPendingPurchases.length === 0 ? (
        <div className='flex-1 overflow-auto p-4 lg:p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className='bg-white dark:bg-(--bg-card) rounded-3xl border border-gray-100 dark:border-(--border-divider) p-5 space-y-4 animate-pulse'>
                <div className='flex justify-between items-start'>
                  <div className='space-y-2'>
                    <div className='h-3 w-16 bg-gray-100 dark:bg-neutral-800 rounded' />
                    <div className='h-5 w-32 bg-gray-200 dark:bg-neutral-800/50 rounded' />
                  </div>
                  <div className='h-8 w-8 bg-gray-100 dark:bg-neutral-800 rounded-full' />
                </div>
                <div className='space-y-3 pt-2'>
                  {[1, 2, 3].map(j => (
                    <div key={j} className='flex justify-between'>
                      <div className='h-3 w-20 bg-gray-100 dark:bg-neutral-800 rounded' />
                      <div className='h-3 w-12 bg-gray-100 dark:bg-neutral-800 rounded' />
                    </div>
                  ))}
                </div>
                <div className='pt-4 flex gap-3'>
                  <div className='h-10 flex-1 bg-gray-100 dark:bg-neutral-800 rounded-xl' />
                  <div className='h-10 flex-1 bg-gray-100 dark:bg-neutral-800 rounded-xl' />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredPendingPurchases.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 m-4'>
          <div className='w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center'>
            <span className='material-symbols-rounded text-5xl opacity-20'>
              assignment_turned_in
            </span>
          </div>
          <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-600 dark:text-gray-300'>
              {(search || externalSearch) ? t.noResults || 'No matches found' : t.allCaughtUp || 'All caught up!'}
            </h3>
            <p className='text-sm opacity-60'>
              {(search || externalSearch)
                ? t.tryDifferentSearch || 'Try searching for another supplier or ID.'
                : t.noPendingOrders || 'No pending purchase orders requiring approval.'}
            </p>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto p-1'>
          {filteredPendingPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col relative overflow-hidden group cursor-pointer hover:border-gray-200 dark:hover:border-blue-800 transition-colors ${
                isLoading ? 'animate-pulse pointer-events-none opacity-80' : ''
              }`}
              onClick={() => setSelectedPurchase(purchase)}
            >
              <div className='absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-orange-500 animate-pulse'></span>
                {t.pendingReview || 'Pending Review'}
              </div>

              <div className='mb-6'>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1'>
                  {t.supplier || 'Supplier'}
                </p>
                <h3 className='text-xl font-bold text-gray-800 dark:text-gray-100 mb-1'>
                  {purchase.supplierName}
                </h3>
                <p className='text-xs text-gray-500 font-mono'>
                  {t.invCode || 'INV'}: {purchase.externalInvoiceId || purchase.invoiceId}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
                <div>
                  <p className='text-[10px] uppercase font-bold text-gray-400 mb-1'>
                    {t.date || 'Date'}
                  </p>
                  <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    {new Date(purchase.date).toLocaleDateString()}
                  </p>
                  <p className='text-[10px] text-gray-400'>{formatTime(new Date(purchase.date))}</p>
                </div>
                <div>
                  <p className='text-[10px] uppercase font-bold text-gray-400 mb-1'>
                    {t.totalCost || 'Total Cost'}
                  </p>
                  <p className={`text-lg font-bold text-primary-600 dark:text-primary-400`}>
                    <CurrencyDisplay amount={purchase.totalCost} />
                  </p>
                </div>
                <div className='col-span-2 flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center gap-2'>
                    <span className='material-symbols-rounded text-gray-400 text-sm'>
                      shopping_basket
                    </span>
                    <span className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                      {purchase.items.reduce((acc, item) => acc + item.quantity, 0)}{' '}
                      {t.items || 'Items'}
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500'>
                    <span className='material-symbols-rounded text-xs'>person</span>
                    {purchase.createdByName || t.unknown || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className='mt-auto grid grid-cols-2 gap-3' onClick={(e) => e.stopPropagation()}>
                {permissionsService.can('purchase.reject') && (
                  <button
                    onClick={(e) => handleOpenReject(purchase.id, e)}
                    className='py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-sm transition-colors flex items-center justify-center gap-2'
                  >
                    <span className='material-symbols-rounded text-lg'>close</span>
                    {t.reject || 'Reject'}
                  </button>
                )}
                {purchase.paymentMethod === 'cash' && !currentShift ? (
                  <div className='py-2.5 px-2 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400'>
                    <span className='material-symbols-rounded text-base'>warning</span>
                    <span className='text-[10px] font-bold leading-tight uppercase'>{t.noOpenShift || 'Open Shift First'}</span>
                  </div>
                ) : (
                  permissionsService.can('purchase.approve') && (
                    <button
                      onClick={(e) => handleOpenApprove(purchase.id, e)}
                      className='py-2.5 rounded-2xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs'
                    >
                      <span className='material-symbols-rounded text-lg'>check</span>
                      {t.approve || 'Approve'}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Details Modal */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={t.purchaseDetails || 'Purchase Details'}
        icon='visibility'
        size='4xl'
      >
        {selectedPurchase && (
          <div className='flex flex-col h-full'>
            <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
              <div className='grid grid-cols-1 sm:grid-cols-2 bg-gray-50/50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/5'>
                {[
                  { label: t.modal?.date || 'Date', icon: 'calendar_today', value: (
                      <span className='flex items-center gap-1.5'>
                        {new Date(selectedPurchase.date).toLocaleDateString()}
                        <span className='opacity-30 mx-0.5'>•</span>
                        {formatTime(new Date(selectedPurchase.date))}
                      </span>
                    )
                  },
                  { label: t.modal?.id || 'ID', icon: 'tag', value: selectedPurchase.invoiceId || selectedPurchase.id.slice(0, 8) },
                  { label: t.supplier || 'Supplier', icon: 'store', value: selectedPurchase.supplierName },
                  { 
                    label: language === 'AR' ? 'بواسطة:' : 'Created By:', 
                    icon: 'person_add', 
                    value: selectedPurchase.createdByName || t.unknown || 'Unknown' 
                  },
                  selectedPurchase.approvedBy && { 
                    label: t.approvedBy || 'Approved By:', 
                    icon: 'verified_user', 
                    value: selectedPurchase.approvedBy 
                  }
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className={`flex items-center justify-between py-2 px-4 bg-transparent transition-all border-b sm:border-b last:border-b-0 border-gray-100 dark:border-white/10`}>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='material-symbols-rounded text-base opacity-40'>{item.icon}</span>
                      <span className='text-[9px] font-bold uppercase tracking-wider opacity-50'>{item.label}</span>
                    </div>
                    <div className='text-[13px] font-bold text-right pl-2'>{item.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <p className='text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-widest pl-1'>
                  {t.itemsList || 'Items List'}
                </p>
                <div className='bg-gray-50 dark:bg-black/20 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5'>
                  <table className='w-full text-left border-collapse'>
                    <thead className='bg-gray-50 dark:bg-gray-950'>
                      <tr className='border-b border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 uppercase'>
                        <th className='p-2 font-bold'>{t.tableHeaders?.item || 'Item'}</th>
                        <th className='p-2 font-bold text-center'>{t.tableHeaders?.qty || 'Qty'}</th>
                        <th className='p-2 font-bold text-right'>{t.tableHeaders?.cost || 'Cost'}</th>
                        <th className='p-2 font-bold text-center'>{t.tableHeaders?.discount || 'Disc%'}</th>
                        <th className='p-2 font-bold text-right'>{t.tableHeaders?.publicPrice || 'Sale'}</th>
                        <th className='p-2 font-bold text-right'>{t.tableHeaders?.total || 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className='text-[13px]'>
                      {selectedPurchase.items.map((item, idx) => (
                        <tr key={idx} className='border-b border-gray-100 dark:border-gray-800 last:border-0'>
                          <td className='p-2 font-bold text-gray-800 dark:text-gray-200'>{getDisplayName(item, textTransform)}</td>
                          <td className='p-2 text-center font-bold'>{item.quantity}</td>
                          <td className='p-2 text-right'><CurrencyDisplay amount={item.costPrice} /></td>
                          <td className='p-2 text-center text-gray-500'>{item.discount || 0}%</td>
                          <td className='p-2 text-right text-primary-600 font-medium'><CurrencyDisplay amount={item.publicPrice || 0} /></td>
                          <td className='p-2 text-right font-bold'><CurrencyDisplay amount={money.multiply(item.costPrice, item.quantity, 2)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className='pt-2'>
                <div className='flex justify-between items-center py-3 px-6 bg-gray-100/50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5'>
                  <span className='font-bold text-base'>{language === 'AR' ? 'الإجمالي النهائي' : t.modal?.total || 'Total'}</span>
                  <CurrencyDisplay amount={selectedPurchase.totalCost} className='text-xl font-black tabular-nums' />
                </div>
              </div>
            </div>

            <div className='pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 mt-4 overflow-visible'>
              {selectedPurchase.paymentMethod === 'cash' && !currentShift ? (
                 <div className='flex-1 py-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center justify-center gap-2'>
                  <span className='material-symbols-rounded text-base animate-pulse'>warning</span>
                  <span className='font-bold text-xs uppercase'>{t.noOpenShift || 'Open Shift First'}</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (purchaseToApprove || selectedPurchase) {
                        onApprovePurchase(selectedPurchase!.id);
                        setSelectedPurchase(null);
                      }
                    }}
                    className='flex-1 py-3.5 rounded-2xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm'
                  >
                    <span className='material-symbols-rounded text-lg'>check_circle</span>
                    {t.approve || 'Approve'}
                  </button>
                  <button
                    onClick={() => {
                      onRejectPurchase(selectedPurchase.id, rejectReason);
                      setSelectedPurchase(null);
                      setRejectReason('');
                    }}
                    className='flex-1 py-3.5 rounded-2xl font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-700'
                  >
                    <span className='material-symbols-rounded text-lg'>cancel</span>
                    {t.reject || 'Reject'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        size='sm'
        zIndex={60}
      >
        <div className='p-6 text-center'>
          <div className='text-green-500 mx-auto mb-4 bg-green-50 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center'>
            <span className='material-symbols-rounded text-4xl'>check_circle</span>
          </div>
          <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
            {t.confirmApproval?.title || 'Confirm Approval'}
          </h3>
          <p className='text-xs text-gray-500 mb-6'>
            {t.confirmApproval?.subtitle || 'Are you sure you want to approve this purchase? Order will transition to Approved and wait for physical receipt.'}
          </p>

          <div className='text-left mb-6'>
            <label className='text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block'>
              {t.approvedBy || 'Approved By'}
            </label>
            <div className='flex items-center gap-2 justify-center py-2.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5'>
              <span className='material-symbols-rounded text-gray-400 text-base'>account_circle</span>
              <span className='text-base font-bold'>{employees?.find(e => e.id === currentEmployeeId)?.name || t.unknown || 'Unknown'}</span>
            </div>
          </div>

          <div className='flex w-full gap-3'>
            <button
              onClick={() => setIsApproveModalOpen(false)}
              className='flex-1 py-3 rounded-2xl font-bold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 text-sm'
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              onClick={confirmApprove}
              className='flex-1 py-3 rounded-2xl font-bold text-sm bg-green-600 text-white hover:bg-green-700'
            >
              {t.confirm || 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        size='sm'
        zIndex={60}
      >
        <div className='p-6 text-center'>
          <div className='text-red-500 mx-auto mb-4 bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center'>
            <span className='material-symbols-rounded text-4xl'>error</span>
          </div>
          <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
            {t.confirmRejection?.title || 'Confirm Rejection'}
          </h3>
          <p className='text-xs text-gray-500 mb-6'>
            {t.confirmRejection?.subtitle || 'Are you sure you want to reject this purchase? This action cannot be undone.'}
          </p>

          <div className='mb-6'>
            <input
              type='text'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.rejectOrder?.reasonPlaceholder || 'Reason (Optional)'}
              className='w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-red-500/50 text-sm'
              dir={rejectReasonDir}
            />
          </div>

          <div className='flex w-full gap-3'>
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className='flex-1 py-3 rounded-2xl font-bold border border-gray-200 dark:border-gray-700 text-gray-500 text-sm'
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              onClick={confirmReject}
              className='flex-1 py-3 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 text-sm'
            >
              {t.reject || 'Reject'}
            </button>
          </div>
        </div>
      </Modal>

      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
    </div>
  );
};
