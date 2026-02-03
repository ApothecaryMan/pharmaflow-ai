import type React from 'react';
import { useState } from 'react';
import { PENDING_APPROVAL_HELP } from '../../i18n/helpInstructions';
import { type Purchase, PurchaseItem } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import {
  checkExpiryStatus,
  formatExpiryDisplay,
  getExpiryStatusConfig,
} from '../../utils/expiryUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { useSmartDirection } from '../common/SmartInputs';

interface PendingApprovalProps {
  color: string;
  t: any;
  purchases: Purchase[];
  onApprovePurchase: (id: string, approverName: string) => void;
  onRejectPurchase: (id: string, reason?: string) => void;
  language: string;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({
  color,
  t,
  purchases,
  onApprovePurchase,
  onRejectPurchase,
  language,
}) => {
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
  const [approverName, setApproverName] = useState('');
  const direction = useSmartDirection(approverName, 'Enter Name'); // Call useSmartDirection
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [purchaseToApprove, setPurchaseToApprove] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Helper: Format time with Arabic AM/PM
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    // Use language prop for direct translation
    const am = language === 'AR' ? 'صباحاً' : 'AM';
    const pm = language === 'AR' ? 'مساءً' : 'PM';
    const period = hours >= 12 ? pm : am;
    return `${hour12}:${minuteStr} ${period}`;
  };

  const helpContent = PENDING_APPROVAL_HELP[language as 'EN' | 'AR'] || PENDING_APPROVAL_HELP.EN;

  const pendingPurchases = purchases.filter((p) => p.status === 'pending');

  // Reject Logic
  const handleOpenReject = (id: string, e?: React.MouseEvent) => {
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
    if (e) e.stopPropagation();
    setPurchaseToApprove(id);
    setIsApproveModalOpen(true);
  };

  const confirmApprove = () => {
    if (purchaseToApprove && approverName.trim()) {
      onApprovePurchase(purchaseToApprove, approverName);
      setIsApproveModalOpen(false);
      setPurchaseToApprove(null);
      setApproverName('');
      if (selectedPurchase) setSelectedPurchase(null);
    } else {
      alert("Please enter the approver's name.");
    }
  };

  return (
    <div className='h-full flex flex-col space-y-6 animate-fade-in p-2 md:p-6 lg:p-8 overflow-hidden'>
      {/* Header */}
      <div className='flex flex-col space-y-1'>
        <h2 className='text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100 flex items-center gap-3'>
          <span className='w-10 h-10 flex items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'>
            <span className='material-symbols-rounded text-2xl'>pending_actions</span>
          </span>
          {t.title || 'Pending Approvals'}
        </h2>
        <p className='text-gray-500 dark:text-gray-400 text-sm max-w-2xl'>
          {t.subtitle ||
            'Review and approve incoming purchase orders. Orders must be approved before inventory is updated.'}
        </p>
      </div>

      {/* Content */}
      {pendingPurchases.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 m-4'>
          <div className='w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center'>
            <span className='material-symbols-rounded text-5xl opacity-20'>
              assignment_turned_in
            </span>
          </div>
          <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-600 dark:text-gray-300'>
              {t.allCaughtUp || 'All caught up!'}
            </h3>
            <p className='text-sm opacity-60'>
              {t.noPendingOrders || 'No pending purchase orders requiring approval.'}
            </p>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto p-1'>
          {pendingPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className='bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col relative overflow-hidden group cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 transition-colors'
              onClick={() => setSelectedPurchase(purchase)}
            >
              {/* Status Badge */}
              <div className='absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-orange-500 animate-pulse'></span>
                {t.pendingReview || 'Pending Review'}
              </div>

              {/* Top Section */}
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

              {/* Grid Stats */}
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
                  <p className={`text-lg font-bold text-${color}-600 dark:text-${color}-400`}>
                    ${purchase.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className='col-span-2 flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
                  <span className='material-symbols-rounded text-gray-400 text-sm'>
                    shopping_basket
                  </span>
                  <span className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                    {purchase.items.reduce((acc, item) => acc + item.quantity, 0)}{' '}
                    {t.items || 'Items'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className='mt-auto grid grid-cols-2 gap-3' onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleOpenReject(purchase.id, e)}
                  className='py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-sm transition-colors flex items-center justify-center gap-2'
                >
                  <span className='material-symbols-rounded text-lg'>close</span>
                  {t.reject || 'Reject'}
                </button>
                <button
                  onClick={(e) => handleOpenApprove(purchase.id, e)}
                  className='py-2.5 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm'
                >
                  <span className='material-symbols-rounded text-lg'>check</span>
                  {t.approve || 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Details Modal - Redesigned to match History */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        size='4xl'
        zIndex={50}
        title={t.orderDetails || 'Purchase Order Details'}
        subtitle={
          selectedPurchase
            ? `${selectedPurchase.invoiceId} • ${new Date(selectedPurchase.date).toLocaleDateString()} ${formatTime(new Date(selectedPurchase.date))}`
            : ''
        }
        icon='receipt_long'
        footer={
          <div className='flex justify-end gap-3 w-full'>
            <button
              onClick={() => {
                if (approverName.trim()) {
                  if (selectedPurchase) {
                    onApprovePurchase(selectedPurchase.id, approverName);
                    setSelectedPurchase(null);
                    setApproverName('');
                  }
                } else {
                  alert(t.enterApproverName || "Please enter the approver's name.");
                }
              }}
              disabled={!approverName.trim()}
              className={`px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                approverName.trim()
                  ? `bg-${color}-600 text-white hover:bg-${color}-700 shadow-xl shadow-${color}-200 dark:shadow-none active:scale-95`
                  : `bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600`
              }`}
            >
              <span className='material-symbols-rounded'>check_circle</span>
              {t.approveOrder || 'Approve Order'}
            </button>
          </div>
        }
      >
        {selectedPurchase && (
          <>
            {/* Info Bar */}
            <div className='p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900 text-sm border-b border-gray-100 dark:border-gray-800'>
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                  {t.info?.supplier || 'Supplier'}
                </p>
                <p className='font-bold text-gray-800 dark:text-gray-100'>
                  {selectedPurchase.supplierName}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                  {t.info?.invId || 'Inv #'}
                </p>
                <p className='font-mono text-gray-800 dark:text-gray-100'>
                  {selectedPurchase.externalInvoiceId || '-'}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1.5'>
                  {t.info?.payment || 'Payment'}
                </p>
                {(() => {
                  const type = selectedPurchase.paymentType;
                  const config =
                    type === 'cash'
                      ? { color: 'emerald', icon: 'payments', label: t.info?.cash || 'Cash' }
                      : { color: 'blue', icon: 'credit_card', label: t.info?.credit || 'Credit' };
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                    >
                      <span className='material-symbols-rounded text-xs'>{config.icon}</span>
                      {config.label}
                    </span>
                  );
                })()}
              </div>
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                  {t.info?.totalCost || 'Total Cost'}
                </p>
                <p className={`font-bold text-lg text-${color}-600`}>
                  ${selectedPurchase.totalCost.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Items Table Header & Input */}
            <div className='px-4 py-2 bg-white dark:bg-gray-900 flex items-center justify-between'>
              <h4 className='font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2'>
                <span className='material-symbols-rounded text-gray-400 text-sm'>list_alt</span>
                {t.itemsList || 'Items List'}
              </h4>
              <div className='flex items-center gap-2'>
                <label className='text-[10px] font-bold text-gray-500 uppercase'>
                  {t.approvedBy || 'Approved By:'}
                </label>
                <div className='relative group'>
                  <input
                    type='text'
                    value={approverName}
                    dir={direction}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder={t.enterName || 'Enter Name'}
                    className='w-64 px-3 py-1 rounded-md bg-transparent border border-transparent hover:border-gray-300 outline-none text-sm font-medium transition-all'
                  />
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className='bg-gray-50 dark:bg-black/20 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800'>
              <table className='w-full text-left border-collapse'>
                <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-sm'>
                  <tr className='border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase'>
                    <th className='p-2 font-bold bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.item || 'Item'}
                    </th>
                    <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.expiry || 'Expiry'}
                    </th>
                    <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.qty || 'Qty'}
                    </th>
                    <th className='p-2 font-bold text-right bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.cost || 'Cost'}
                    </th>
                    <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.discount || 'Disc %'}
                    </th>
                    <th className='p-2 font-bold text-right bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.salePrice || 'Sale Price'}
                    </th>
                    <th className='p-2 font-bold text-right bg-gray-50 dark:bg-gray-900'>
                      {t.tableHeaders?.total || 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody className='text-sm'>
                  {selectedPurchase.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className='border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-gray-800 transition-colors'
                    >
                      <td className='p-2 font-bold text-gray-800 dark:text-gray-200'>
                        {getDisplayName(item)}
                      </td>
                      <td className='p-2 text-center'>
                        {item.expiryDate
                          ? (() => {
                              const status = checkExpiryStatus(item.expiryDate);
                              const config = getExpiryStatusConfig(status);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                                >
                                  {formatExpiryDisplay(item.expiryDate)}
                                </span>
                              );
                            })()
                          : '-'}
                      </td>
                      <td className='p-2 text-center font-bold'>{item.quantity}</td>
                      <td className='p-2 text-right'>${item.costPrice.toFixed(2)}</td>
                      <td className='p-2 text-center text-gray-500'>{item.discount || 0}%</td>
                      <td className='p-2 text-right'>${(item.salePrice || 0).toFixed(2)}</td>
                      <td className='p-2 text-right font-bold text-gray-800 dark:text-gray-200'>
                        ${(item.quantity * item.costPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        size='sm'
        zIndex={60}
      >
        <div className='p-6 text-center'>
          <div className='text-red-500 mx-auto mb-2 animate-bounce-short'>
            <span className='material-symbols-rounded text-7xl'>warning</span>
          </div>
          <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
            {t.rejectOrder?.title || 'Reject Purchase Order'}
          </h3>
          <p className='text-sm text-gray-500 mb-6'>
            {t.rejectOrder?.confirm ||
              'Are you sure you want to reject this order? This action cannot be undone.'}
          </p>

          <div className='text-left mb-6'>
            <label className='text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block'>
              {t.rejectOrder?.reason || 'Reason (Optional)'}
            </label>
            <input
              type='text'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={
                t.rejectOrder?.reasonPlaceholder || 'E.g., Incorrect pricing, wrong items...'
              }
              className='w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-red-500/50'
              dir={rejectReasonDir}
            />
          </div>

          <div className='flex w-full gap-3'>
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className='flex-1 py-3 rounded-xl font-bold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
            >
              {t.rejectOrder?.cancel || 'Cancel'}
            </button>
            <button
              onClick={confirmReject}
              className='flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors'
            >
              {t.rejectOrder?.reject || t.reject || 'Reject'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Help */}
      <HelpButton
        onClick={() => setShowHelp(true)}
        title={helpContent.title}
        color={color}
        isRTL={language === 'AR'}
      />
      <HelpModal
        show={showHelp}
        onClose={() => setShowHelp(false)}
        helpContent={helpContent as any}
        color={color}
        language={language}
      />
    </div>
  );
};
