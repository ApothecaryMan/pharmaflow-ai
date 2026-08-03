import { createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  useRecordSupplierPayment,
  useVoidSupplierPayment,
} from '../../hooks/mutations/useSupplierAccountMutations';
import {
  useSupplierBalance,
  useSupplierOpenPayables,
  useSupplierPaymentsList,
} from '../../hooks/suppliers/useSupplierAccount';
import { useSuppliers } from '../../hooks/queries/useInventoryQuery';
import { permissionsService } from '../../services/auth/permissionsService';
import { useAuthStore } from '../../stores/authStore';
import type { SupplierPayment, SupplierPaymentMethod } from '../../types';
import { MODAL_FOOTER_BTN_CANCEL, MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_PRIMARY } from '../../utils/themeStyles';
import { DatePicker } from '../common/DatePicker';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput, SmartTextarea, useSmartDirection } from '../common/SmartInputs';
import { TanStackTable } from '../common/TanStackTable';
import { Tooltip } from '../common/Tooltip';
import { SupplierSelect } from '../suppliers/SupplierSelect';

interface SupplierPaymentsProps {
  color: string;
  t: any;
  language: 'EN' | 'AR';
  currentEmployeeId: string;
}

const columnHelper = createColumnHelper<SupplierPayment>();

export const SupplierPayments: React.FC<SupplierPaymentsProps> = ({
  color,
  t,
  language: _language,
  currentEmployeeId: _currentEmployeeId,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: suppliers = [] } = useSuppliers(activeBranchId);

  const [activeTab, setActiveTab] = useState<'payables' | 'history'>('payables');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<SupplierPayment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const recordPayment = useRecordSupplierPayment();
  const voidPayment = useVoidSupplierPayment();

  const { data: balance } = useSupplierBalance(selectedSupplierId);
  const { data: openPayables = [] } = useSupplierOpenPayables(selectedSupplierId, activeBranchId);
  const { data: paymentsHistory = [] } = useSupplierPaymentsList({
    supplierId: selectedSupplierId || undefined,
    branchId: activeBranchId,
  });

  const canPay = permissionsService.can('supplier.pay');

  const parsedAmount = parseFloat(amount);
  const totalAllocated = useMemo(
    () =>
      Object.values(allocations as Record<string, number>).reduce(
        (sum: number, v: number) => sum + (Number(v) || 0),
        0
      ),
    [allocations]
  );
  const remaining = Number.isNaN(parsedAmount) ? 0 : Math.max(parsedAmount - totalAllocated, 0);

  const handleSupplierChange = (id: string) => {
    setSelectedSupplierId(id);
    setAllocations({});
    setAmount('');
    setReference('');
    setNotes('');
    setValidationError(null);
  };

  const toggleAllocation = (purchaseId: string, max: number) => {
    setAllocations((prev) => {
      const next = { ...prev };
      if (next[purchaseId] !== undefined && next[purchaseId] === max) {
        delete next[purchaseId];
      } else {
        next[purchaseId] = max;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setValidationError(null);
    if (!selectedSupplierId) {
      setValidationError(t.supplier || 'Supplier is required');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError(t.invalidAmount || 'Enter a valid amount');
      return;
    }
    if (totalAllocated > parsedAmount) {
      setValidationError(t.allocationsExceed || 'Allocated amount cannot exceed payment');
      return;
    }
    if (!date) {
      setValidationError(t.invalidDate || 'Please select a date');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment.mutateAsync({
        supplierId: selectedSupplierId,
        amount: parsedAmount,
        date,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
        allocations: Object.entries(allocations)
          .filter(([, v]) => Number(v) > 0)
          .map(([purchaseId, amt]) => ({ purchaseId, amount: Number(amt) })),
      });
      setIsModalOpen(false);
      setAmount('');
      setReference('');
      setNotes('');
      setAllocations({});
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    setIsSubmitting(true);
    try {
      await voidPayment.mutateAsync({
        paymentId: voidTarget.id,
        supplierId: voidTarget.supplierId,
        reason: voidReason || undefined,
      });
      setVoidTarget(null);
      setVoidReason('');
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to void payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('serialId', {
        header: t.serialId || 'Serial',
        cell: (info) => info.getValue() || info.row.original.id.slice(0, 8),
      }),
      columnHelper.accessor('supplierName', {
        header: t.supplier || 'Supplier',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('date', { header: t.date || 'Date' }),
      columnHelper.accessor('amount', {
        header: t.amount || 'Amount',
        cell: (info) => Number(info.getValue()).toLocaleString(),
      }),
      columnHelper.accessor('paymentMethod', {
        header: t.paymentMethod || 'Method',
        cell: (info) =>
          t[(info.getValue() as string)] || (info.getValue() as string) || '—',
      }),
      columnHelper.display({
        id: 'actions',
        header: t.actions || 'Actions',
        cell: (info) =>
          canPay && !info.row.original.voidedAt ? (
            <button
              type='button'
              onClick={() => setVoidTarget(info.row.original)}
              className='text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer'
            >
              {t.voidPayment || 'Void'}
            </button>
          ) : (
            <span className='text-xs text-zinc-400'>{t.voided || 'Voided'}</span>
          ),
      }),
    ],
    [t, canPay]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (value: string) => setSearchTerm(value);

  return (
    <div className='flex flex-col h-full'>
      <div className='flex-1 overflow-hidden flex flex-col transition-opacity duration-300 opacity-100'>
        <PageHeader
          mb='mb-0'
          leftContent={
            <SearchInput
              compact
              value={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder={
                _language === 'AR'
                  ? 'بحث برقم الفاتورة، المرجع، أو القيمة...'
                  : 'Search invoices, references, or amounts...'
              }
              wrapperClassName='w-full sm:w-[320px] lg:w-[400px]'
            />
          }
          centerContent={
            <SegmentedControl
              options={[
                { label: t.openPayables || 'Open Payables', value: 'payables', icon: 'receipt_long' },
                { label: t.paymentHistory || 'Payment History', value: 'history', icon: 'history' }
              ]}
              value={activeTab}
              onChange={(val) => setActiveTab(val as 'payables' | 'history')}
              size='sm'
              shape='pill'
              useGraphicFont={true}
            />
          }
          rightContent={
            <div className='flex items-center gap-2'>
              <SupplierSelect
                value={selectedSupplierId}
                onChange={handleSupplierChange}
                suppliers={suppliers}
                placeholder={t.selectSupplier || 'Select a supplier'}
                color={color}
                className='w-full sm:w-[200px] h-pageheader shrink-0'
              />
              {canPay && (
                <button
                  type='button'
                  onClick={() => {
                    setValidationError(null);
                    setIsModalOpen(true);
                  }}
                  className='inline-flex items-center justify-center gap-2 px-3 text-sm font-medium rounded-lg bg-blue-600 text-white border border-transparent hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0 h-pageheader'
                >
                  <span className='material-symbols-rounded text-lg'>payments</span>
                  <span className='hidden lg:inline'>{t.recordPayment || 'Record Payment'}</span>
                </button>
              )}
            </div>
          }
        />

        <div className='flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col gap-4 pb-6'>
          {selectedSupplierId && (
            <div className='flex items-center gap-2 text-sm'>
              <span className='text-zinc-500 dark:text-zinc-400'>
                {t.currentBalance || 'Current Balance'}:
              </span>
              <span
                className={`font-semibold ${Number(balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {Number(balance ?? 0).toLocaleString()}
              </span>
            </div>
          )}

          {activeTab === 'payables' && (
            <div className='flex flex-col gap-3'>
              <TanStackTable
                data={openPayables}
                columns={[
                  {
                    accessorKey: 'invoiceId',
                    header: t.invoice || 'Invoice',
                    cell: (info: any) => info.getValue() || info.row.original.purchaseId.slice(0, 8),
                  },
                  { accessorKey: 'date', header: t.date || 'Date' },
                  { accessorKey: 'dueDate', header: t.dueDate || 'Due' },
                  {
                    accessorKey: 'totalCost',
                    header: t.total || 'Total',
                    cell: (info: any) => Number(info.getValue()).toLocaleString(),
                  },
                  {
                    accessorKey: 'openAmount',
                    header: t.openAmount || 'Open',
                    cell: (info: any) => Number(info.getValue()).toLocaleString(),
                  },
                ]}
                emptyMessage={t.noPayables || 'No open invoices for this supplier'}
                enableSearch={false}
                globalFilter={searchTerm}
                onSearchChange={handleSearchChange}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className='flex flex-col gap-3'>
              <TanStackTable
                data={paymentsHistory}
                columns={columns}
                emptyMessage={t.noPayments || 'No payments recorded yet'}
                enableSearch={false}
                globalFilter={searchTerm}
                onSearchChange={handleSearchChange}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.recordPayment || 'Record Payment'}
        icon='payments'
        size='md'
        position='sidebar'
        footer={
          <div className='flex gap-3 w-full'>
            <button
              type='button'
              className={MODAL_FOOTER_BTN_CANCEL}
              onClick={() => setIsModalOpen(false)}
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type='button'
              className={`${MODAL_FOOTER_BTN_PRIMARY} disabled:opacity-50`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t.loading || 'Loading...' : t.recordPayment || 'Record Payment'}
            </button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className='flex flex-col gap-3 h-full'
        >
          {validationError && (
            <div className='text-xs text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2'>
              {validationError}
            </div>
          )}

          <div className='flex flex-col sm:flex-row gap-2 shrink-0'>
            <div className='flex-1 min-w-0'>
              <SupplierSelect
                value={selectedSupplierId}
                onChange={handleSupplierChange}
                suppliers={suppliers}
                placeholder={t.selectSupplier || 'Select a supplier'}
                color={color}
                className='w-full'
                rounded='xl'
                dense={false}
                portal={true}
              />
            </div>
            <div className='sm:w-1/3 shrink-0'>
              <SmartInput
                type='number'
                min='0'
                step='0.01'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t.amount || 'Amount'}
                className='w-full'
              />
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-2 shrink-0'>
            <div className='flex-[2] min-w-0'>
              <DatePicker
                value={date}
                onChange={setDate}
                label={t.date || 'Date'}
                color={color}
                maxDate={new Date().toISOString().slice(0, 10)}
                variant='input'
                rounded='xl'
                className='w-full'
              />
            </div>
          </div>

          <div className='flex gap-2 shrink-0'>
            {(['cash', 'bank', 'visa'] as SupplierPaymentMethod[]).map((method) => (
              <button
                key={method}
                type='button'
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                  paymentMethod === method
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {t[method] || method}
              </button>
            ))}
          </div>

          <div
            className='relative w-full group shrink-0'
            dir={useSmartDirection(reference, t.reference || 'Reference')}
          >
            <SmartInput
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t.reference || 'Reference'}
              className='w-full pe-10'
            />
            <div className='absolute top-1/2 -translate-y-1/2 end-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-help'>
              <Tooltip
                content={t.referenceTooltip || 'أدخل رقم الإيصال أو الشيك أو أي مرجع آخر'}
                position='top'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  info
                </span>
              </Tooltip>
            </div>
          </div>

          <SmartTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notes || 'Notes'}
            className='w-full flex-1 min-h-[80px] resize-none'
          />

          {openPayables.length > 0 && (
            <div className='flex flex-col gap-1.5'>
              <p className='text-xs font-semibold text-zinc-500'>
                {t.allocations || 'Allocations'}
              </p>
              {openPayables.map((payable) => {
                const checked =
                  allocations[payable.purchaseId] !== undefined &&
                  allocations[payable.purchaseId] === payable.openAmount;
                return (
                  <label
                    key={payable.purchaseId}
                    className='flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-pointer'
                  >
                    <span className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => toggleAllocation(payable.purchaseId, payable.openAmount)}
                        className='accent-blue-600'
                      />
                      <span>
                        {payable.invoiceId || payable.purchaseId.slice(0, 8)}
                        <span className='text-zinc-400 text-xs'> · {payable.date}</span>
                      </span>
                    </span>
                    <span className='text-sm font-medium'>
                      {payable.openAmount.toLocaleString()}
                    </span>
                  </label>
                );
              })}
              <div className='flex justify-between text-xs text-zinc-500 px-1'>
                <span>
                  {t.totalAllocated || 'Total Allocated'}: {totalAllocated.toLocaleString()}
                </span>
                {remaining > 0 && (
                  <span className='text-amber-600'>
                    {remaining.toLocaleString()} {t.applyToOldest}
                  </span>
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        title={t.voidPayment || 'Void Payment'}
        icon='undo'
        size='sm'
        footer={
          <div className='flex gap-3 w-full'>
            <button
              type='button'
              className={MODAL_FOOTER_BTN_CANCEL}
              onClick={() => setVoidTarget(null)}
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type='button'
              className={`${MODAL_FOOTER_BTN_DANGER} disabled:opacity-50`}
              onClick={handleVoid}
              disabled={isSubmitting}
            >
              {t.confirmVoid || 'Void'}
            </button>
          </div>
        }
      >
        <div className='flex flex-col gap-3'>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>
            {t.confirmVoid || 'Void this payment?'}
          </p>
          <SmartInput
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder={t.voidReason || 'Reason'}
            className='w-full'
          />
        </div>
      </Modal>
    </div>
  );
};
