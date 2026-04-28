import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useMemo } from 'react';
import { CASH_REGISTER_HELP } from '../../i18n/helpInstructions';
import type { CashTransaction, CashTransactionType, Employee, Language } from '../../types';
import { formatCurrencyParts } from '../../utils/currency';
import { CARD_BASE, INPUT_BASE } from '../../utils/themeStyles';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { useSmartDirection } from '../common/SmartInputs';
import { PageHeader } from '../common/PageHeader';
import { TanStackTable } from '../common/TanStackTable';
import { useCashRegister } from './useCashRegister';

interface CashRegisterProps {
  color: string;
  t: any;
  language?: Language;
  employees?: Employee[];
  currentEmployeeId?: string;
  onViewChange?: (view: string) => void;
}

export const CashRegister: React.FC<CashRegisterProps> = ({
  color,
  t,
  language = 'EN',
  employees,
  currentEmployeeId,
  onViewChange,
}) => {
  const helpContent = CASH_REGISTER_HELP[language];

  const {
    currentShift,
    isLoading,
    modalMode,
    setModalMode,
    amountInput,
    setAmountInput,
    reasonInput,
    setReasonInput,
    showHelp,
    setShowHelp,
    validationError,
    setValidationError,
    filterType,
    setFilterType,
    currentBalance,
    permissions,
    filteredTransactions,
    counts,
    handleOpenShift,
    handleCloseShift,
    handleCashTransaction,
    closeModal,
  } = useCashRegister({
    t,
    language,
    employees,
    currentEmployeeId,
  });

  const columns = useMemo<ColumnDef<CashTransaction>[]>(
    () => [
      {
        accessorKey: 'time',
        header: t.cashRegister?.transactions?.time || 'Time',
        meta: { align: 'center' },
      },
      {
        accessorKey: 'type',
        header: t.cashRegister?.transactions?.type || 'Type',
        cell: (info) => {
          const type = info.getValue() as CashTransactionType;
          return (
            <span
              className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-lg border border-current text-[10px] font-bold uppercase tracking-tight bg-transparent
                  ${type === 'in' || type === 'card_sale' || type === 'purchase_return' ? 'text-gray-700 dark:text-gray-400' : ''}
                  ${type === 'out' || type === 'closing' || type === 'purchase' ? 'text-red-700 dark:text-red-400' : ''}
                  ${type === 'sale' ? 'text-emerald-700 dark:text-emerald-400' : ''}
                  ${type === 'opening' ? 'text-violet-700 dark:text-violet-400' : ''}
                  ${type === 'return' ? 'text-orange-700 dark:text-orange-400' : ''}
                `}
            >
              <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>
                {type === 'opening'
                  ? 'lock_open'
                  : type === 'closing'
                    ? 'lock'
                    : type === 'in'
                      ? 'move_to_inbox'
                      : type === 'out'
                        ? 'outbox'
                        : type === 'sale'
                          ? 'receipt_long'
                          : type === 'card_sale'
                            ? 'credit_card'
                            : type === 'return'
                              ? 'assignment_return'
                              : type === 'purchase'
                                ? 'shopping_cart_checkout'
                                : type === 'purchase_return'
                                  ? 'keyboard_return'
                                  : 'receipt'}
              </span>
              {t.cashRegister.types[type] || type}
            </span>
          );
        },
      },
      {
        accessorKey: 'userId',
        header: t.cashRegister?.transactions?.user || 'User',
        cell: (info) => {
          const empIdOrName = info.getValue() as string;
          const employee = employees?.find((e) => e.id === empIdOrName);
          return (
            <span className='font-bold text-[10px] text-gray-500'>
              {employee ? employee.name : empIdOrName || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'reason',
        header: t.cashRegister?.transactions?.reason || 'Reason',
        cell: (info) => {
          const reason = info.getValue() as string;
          if (!reason) return '-';
          const match = reason.match(/^(Sale|Return|Return for Sale|Refund)\s*#(\d+)$/i);
          if (match) {
            return (
              <span className='flex items-center gap-1.5 font-medium'>
                <span className='material-symbols-rounded text-gray-400 dark:text-gray-500' style={{ fontSize: 'var(--icon-sm)' }}>
                  tag
                </span>
                <span className='tabular-nums tracking-normal text-[11px] text-gray-900 dark:text-gray-100'>
                  {match[2]}
                </span>
              </span>
            );
          }
          return (
            <span className='text-[11px] text-gray-700 dark:text-gray-300 max-w-xs truncate block'>
              {reason}
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: t.cashRegister?.transactions?.amount || 'Amount',
        cell: (info) => {
          const amountVal = info.getValue() as number;
          const row = info.row.original;
          const isPositive = ['in', 'opening', 'sale', 'card_sale', 'purchase_return'].includes(row.type);

          return (
            <div
              className={`text-[11px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : '-'}
              {(() => {
                const { amount, symbol } = formatCurrencyParts(
                  amountVal,
                  'EGP',
                  language === 'AR' ? 'ar-EG' : 'en-US'
                );
                return (
                  <>
                    {amount} <span className='text-[9px] opacity-60 font-normal'>{symbol}</span>
                  </>
                );
              })()}
            </div>
          );
        },
        meta: { align: 'end' },
      },
    ],
    [t, language, employees]
  );

  return (
    <div
      dir={language === 'AR' ? 'rtl' : 'ltr'}
      className={`h-full flex flex-col gap-6 animate-fade-in pb-10 ${language === 'AR' ? 'text-right' : 'text-left'}`}
    >
      {/* Header */}
      <PageHeader
        centerContent={
          <SegmentedControl
            size="md"
            shape="pill"
            iconSize="--icon-lg"
            useGraphicFont={true}
            options={[
              { label: t.cashRegister?.title || 'Register', value: 'cash-register', icon: 'point_of_sale' },
              { label: t.shiftHistory?.title || 'Shifts', value: 'shift-history', icon: 'history' },
            ]}
            value="cash-register"
            onChange={(val) => onViewChange?.(val as string)}
          />
        }
        rightContent={
          <div className='flex gap-3'>
            {isLoading ? (
              <>
                <div className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse flex items-center gap-2">
                  <div className="w-5 h-5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                  <div className="w-16 h-4 bg-zinc-300 dark:bg-zinc-600 rounded" />
                </div>
                <div className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse hidden md:flex items-center gap-2">
                  <div className="w-5 h-5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                  <div className="w-16 h-4 bg-zinc-300 dark:bg-zinc-600 rounded" />
                </div>
                <div className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse hidden lg:flex items-center gap-2">
                  <div className="w-5 h-5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                  <div className="w-16 h-4 bg-zinc-300 dark:bg-zinc-600 rounded" />
                </div>
              </>
            ) : currentShift ? (
              <>
                {permissions.canAddCash && (
                  <button
                    onClick={() => setModalMode('in')}
                    className={`px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold transition-colors flex items-center gap-2`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>add</span>
                    {t.cashRegister.actions.addCash}
                  </button>
                )}
                {permissions.canRemoveCash && (
                  <button
                    onClick={() => setModalMode('out')}
                    className={`px-4 py-2 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold transition-colors flex items-center gap-2`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>remove</span>
                    {t.cashRegister.actions.removeCash}
                  </button>
                )}
                {permissions.canCloseShift && (
                  <button
                    onClick={() => setModalMode('close')}
                    className={`px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-bold transition-colors flex items-center gap-2`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>lock</span>
                    {t.cashRegister.actions.closeShift}
                  </button>
                )}
              </>
            ) : (
              permissions.canOpenShift && (
                <button
                  onClick={() => setModalMode('open')}
                  className={`px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 hover:bg-black dark:hover:bg-zinc-100 font-bold transition-all flex items-center gap-2`}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>lock_open</span>
                  {t.cashRegister.actions.openShift}
                </button>
              )
            )}
          </div>
        }
      />

      {/* Main Content */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Left Column: Status & Summary */}
        <div className='md:col-span-1 space-y-4'>
          {/* Status Card */}
          <div className={`p-6 rounded-3xl ${CARD_BASE} relative overflow-hidden group`}>
            <div className='absolute -bottom-6 ltr:-right-6 rtl:-left-6 opacity-10 pointer-events-none select-none'>
              <span
                className={`material-symbols-rounded ${currentShift ? `text-emerald-500` : 'text-zinc-400'}`}
                style={{ fontSize: '180px' }}
              >
                {currentShift ? 'lock_open' : 'lock'}
              </span>
            </div>

            <p className='text-sm font-bold uppercase text-gray-500 mb-2'>
              {t.cashRegister.status.details}
            </p>
            <div className='flex items-center gap-3 mb-4'>
              <div
                className={`w-3 h-3 rounded-full ${isLoading ? 'bg-zinc-200 dark:bg-zinc-700 animate-pulse' : currentShift ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              ></div>
              <h3 className={`text-2xl font-bold ${isLoading ? 'h-8 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                {!isLoading && (currentShift ? t.cashRegister.status.open : t.cashRegister.status.closed)}
              </h3>
            </div>
            {(currentShift || isLoading) && (
              <div className='space-y-2'>
                {/* Time Badge */}
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {t.cashRegister.messages.started}:
                  </span>
                  {isLoading ? (
                    <div className='h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse' />
                  ) : (
                    <>
                      <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>schedule</span>
                        {(() => {
                          const timeStr = new Date(currentShift!.openTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          });

                          const parts = timeStr.split(' ');
                          const timeValue = parts[0];
                          const amPm = parts[1];

                          if (language === 'AR') {
                            const arabicMarker = amPm === 'AM' ? 'ص' : 'م';
                            return (
                              <span className='flex items-center gap-1'>
                                <span className='font-sans'>{timeValue}</span>
                                <span className='text-[10px] font-bold opacity-80 mt-1'>
                                  {arabicMarker}
                                </span>
                              </span>
                            );
                          }
                          return timeStr;
                        })()}
                      </span>
                      <span className='text-xs text-gray-400'>
                        {new Date(currentShift!.openTime).toLocaleDateString(
                          language === 'AR' ? 'ar-EG-u-nu-latn' : 'en-GB',
                          { day: 'numeric', month: 'short' }
                        )}
                      </span>
                    </>
                  )}
                </div>

                {/* User Badge */}
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {t.cashRegister.messages.by}:
                  </span>
                  {isLoading ? (
                    <div className='h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse' />
                  ) : (
                    <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
                      <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>person</span>
                      {employees?.find((e) => e.id === currentShift!.openedBy)?.name || currentShift!.openedBy}
                    </span>
                  )}
                </div>

                {/* Shift ID */}
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {t.cashRegister.messages.id}:
                  </span>
                  {isLoading ? (
                    <div className='h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse' />
                  ) : (
                    <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
                      <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>tag</span>
                      {currentShift!.id.slice(-6)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Balance Cards (Only if Open or Loading) */}
          {(currentShift || isLoading) ? (
            <div className='space-y-3'>
               {(isLoading || (currentShift && permissions.canViewExpectedBalance)) && (
                 <div
                   className={`p-5 rounded-3xl ${CARD_BASE} border-2 !border-gray-200 dark:!border-gray-800 relative overflow-hidden group transition-all hover:shadow-md`}
                 >
                   <div className='flex items-center gap-2 mb-1.5 relative z-10'>
                     <span className='material-symbols-rounded text-primary-600 dark:text-primary-400' style={{ fontSize: 'var(--icon-md)' }}>
                       account_balance_wallet
                     </span>
                     <p className={`text-xs font-bold uppercase text-primary-800 dark:text-primary-300`}>
                       {t.cashRegister.summary.expectedBalance}
                     </p>
                   </div>
                   <p
                     className={`text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums relative z-10 ${isLoading ? 'h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}
                   >
                     {!isLoading && (() => {
                       const { amount, symbol } = formatCurrencyParts(
                         currentBalance,
                         'EGP',
                         language === 'AR' ? 'ar-EG' : 'en-US'
                       );
                       return (
                         <>
                           {amount} <span className='text-base font-normal opacity-40 ml-1'>{symbol}</span>
                         </>
                       );
                     })()}
                   </p>
                 </div>
               )}

              <div className='grid grid-cols-2 gap-3'>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.openingBalance}
                  </p>
                  <p className={`text-base font-bold text-gray-700 dark:text-gray-300 ${isLoading ? 'h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (() => {
                      const { amount, symbol } = formatCurrencyParts(
                        currentShift?.openingBalance || 0,
                        'EGP',
                        language === 'AR' ? 'ar-EG' : 'en-US',
                        0
                      );
                      return (
                        <>
                          {amount}{' '}
                          <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                        </>
                      );
                    })()}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cashSales}
                  </p>
                  <p className={`text-base font-bold text-emerald-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>add</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cashSales || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cardSales}
                  </p>
                  <p className={`text-base font-bold text-violet-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>add</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cardSales || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cashIn}
                  </p>
                  <p className={`text-base font-bold text-orange-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>add</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cashIn || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cashOut}
                  </p>
                  <p className={`text-base font-bold text-red-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>remove</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cashOut || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cashPurchases || 'Cash Purchases'}
                  </p>
                  <p className={`text-base font-bold text-red-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>remove</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cashPurchases || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.cashPurchaseReturns || 'Cash Purch. Returns'}
                  </p>
                  <p className={`text-base font-bold text-primary-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>add</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.cashPurchaseReturns || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                  <p className='text-xs font-bold uppercase text-gray-500 mb-1'>
                    {t.cashRegister.summary.returns || 'Returns'}
                  </p>
                  <p className={`text-base font-bold text-orange-600 flex items-center gap-1.5 ${isLoading ? 'h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse' : ''}`}>
                    {!isLoading && (
                      <>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>remove</span>
                        {(() => {
                          const { amount, symbol } = formatCurrencyParts(
                            currentShift?.returns || 0,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US',
                            0
                          );
                          return (
                            <>
                              {amount}{' '}
                              <span className='text-[10px] opacity-60 font-normal'>{symbol}</span>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`p-8 rounded-3xl ${CARD_BASE} text-center flex flex-col items-center justify-center min-h-[430px] text-gray-400`}
            >
              <span className='material-symbols-rounded mb-3 opacity-50' style={{ fontSize: 'var(--icon-2xl)' }}>
                shopping_bag
              </span>
              <p>{t.cashRegister.messages.noShift}</p>
            </div>
          )}
        </div>

        {/* Right Column: Transaction Log */}
        <div className='md:col-span-2 flex flex-col md:h-0 md:min-h-full'>
          <div className={`rounded-3xl ${CARD_BASE} flex-1 flex flex-col h-full overflow-hidden`}>
            <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0'>
              <h3 className='font-bold text-lg'>{t.cashRegister.transactions.title}</h3>
              <SegmentedControl
                size='xs'
                fullWidth={false}
                value={filterType}
                onChange={(val) => setFilterType(val as string)}
                options={[
                  { label: t.cashRegister?.filters?.all || 'All', value: 'all', count: counts.all },
                  {
                    label: t.cashRegister?.filters?.sales || 'Sales',
                    value: 'sales',
                    count: counts.sales,
                    activeColor: 'green',
                  },
                  {
                    label: t.cashRegister?.filters?.returns || 'Returns',
                    value: 'returns',
                    count: counts.returns,
                    activeColor: 'orange',
                  },
                  {
                    label: t.cashRegister?.filters?.purchases || 'Purchases',
                    value: 'purchases',
                    count: counts.purchases,
                    activeColor: 'red',
                  },
                  {
                    label: t.cashRegister?.filters?.operations || 'Ops',
                    value: 'operations',
                    count: counts.operations,
                    activeColor: 'blue',
                  },
                ]}
              />
            </div>

            <div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
              <TanStackTable
                data={filteredTransactions}
                columns={columns}
                dense
                lite
                isLoading={isLoading}
                tableId='cash-register-table'
                searchPlaceholder={t.global?.actions?.search || 'Search...'}
                emptyMessage={t.cashRegister.messages.noTransactions}
                enablePagination={false}
                enableSearch={false}
                color={color}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logic Modal */}
      {modalMode && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          size='md'
          zIndex={50}
          title={
            modalMode === 'open'
              ? t.cashRegister.modal.openTitle
              : modalMode === 'close'
                ? t.cashRegister.modal.closeTitle
                : modalMode === 'in'
                  ? t.cashRegister.actions.addCash
                  : modalMode === 'out'
                    ? t.cashRegister.actions.removeCash
                    : ''
          }
        >
          <div className='space-y-4'>
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase mb-1 block'>
                {modalMode === 'close'
                  ? t.cashRegister.messages.countedCash
                  : t.cashRegister.modal.amount}
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold'>
                  $
                </span>
                <input
                  type='number'
                  autoFocus
                  className={`${INPUT_BASE} pl-7 text-lg font-bold`}
                  placeholder='0.00'
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setValidationError(null); // Clear error on change
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (modalMode === 'open') handleOpenShift();
                      if (modalMode === 'close') handleCloseShift();
                      if (modalMode === 'in' || modalMode === 'out') handleCashTransaction();
                    }
                  }}
                />
              </div>
              {/* Validation Error */}
              {validationError && (
                <p className='text-red-500 text-sm mt-2 flex items-center gap-1'>
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>error</span>
                  {validationError}
                </p>
              )}
            </div>

            <div>
              <label className='text-xs font-bold text-gray-500 uppercase mb-1 block'>
                {modalMode === 'in' || modalMode === 'out'
                  ? t.cashRegister.transactions.reason || 'Reason'
                  : t.cashRegister.modal.notes}
                {(modalMode === 'in' || modalMode === 'out') && (
                  <span className='text-red-500 ml-1'>*</span>
                )}
              </label>
              <textarea
                className={INPUT_BASE}
                rows={3}
                placeholder={
                  modalMode === 'in' || modalMode === 'out'
                    ? t.cashRegister.transactions.reason || 'Enter reason...'
                    : t.cashRegister.messages.optionalNotes
                }
                value={reasonInput}
                onChange={(e) => {
                  setReasonInput(e.target.value);
                  setValidationError(null); // Clear error on change
                }}
              />
            </div>

            {modalMode === 'close' && currentShift && permissions.canViewExpectedBalance && (
              <div className='p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-100 dark:border-yellow-900/50 text-sm'>
                <div className='flex justify-between'>
                  <span>{t.cashRegister.messages.expected}</span>
                  <span className='font-bold'>
                    {(() => {
                      const { amount, symbol } = formatCurrencyParts(
                        currentBalance,
                        'EGP',
                        language === 'AR' ? 'ar-EG' : 'en-US'
                      );
                      return (
                        <>
                          {amount}{' '}
                          <span className='text-[0.7em] opacity-60 font-normal ml-0.5'>
                            {symbol}
                          </span>
                        </>
                      );
                    })()}
                  </span>
                </div>
                {amountInput && !isNaN(parseFloat(amountInput)) && (
                  <div className='flex justify-between mt-1 pt-1 border-t border-yellow-200 dark:border-yellow-900'>
                    <span>{t.cashRegister.summary.variance}</span>
                    <span
                      className={`font-bold ${Math.abs(parseFloat(amountInput) - currentBalance) <= 50 ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {(() => {
                        const { amount, symbol } = formatCurrencyParts(
                          parseFloat(amountInput) - currentBalance,
                          'EGP',
                          language === 'AR' ? 'ar-EG' : 'en-US'
                        );
                        return (
                          <>
                            {amount}{' '}
                            <span className='text-[0.7em] opacity-60 font-normal ml-0.5'>
                              {symbol}
                            </span>
                          </>
                        );
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className='flex gap-3 pt-2'>
              <button
                onClick={closeModal}
                className='flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors'
              >
                {t.cashRegister.modal.cancel}
              </button>
              <button
                onClick={() => {
                  if (modalMode === 'open') handleOpenShift();
                  if (modalMode === 'close') handleCloseShift();
                  if (modalMode === 'in' || modalMode === 'out') handleCashTransaction();
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg shadow-primary-500/20
                           bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all`}
              >
                {t.cashRegister.modal.confirm}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
