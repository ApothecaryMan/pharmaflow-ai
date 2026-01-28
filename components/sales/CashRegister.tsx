
import React, { useState, useMemo } from 'react';
import { Shift, CashTransaction, CashTransactionType, Language, Employee } from '../../types';
import { CARD_BASE, TABLE_HEADER_BASE, TABLE_ROW_BASE, BUTTON_BASE, INPUT_BASE, THEME_COLORS } from '../../utils/themeStyles';
import { canPerformAction } from '../../config/permissions';
import { useSmartDirection } from '../common/SmartInputs';
import { CASH_REGISTER_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { useStatusBar } from '../../components/layout/StatusBar';
import { useShift } from '../../hooks/useShift';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';

interface CashRegisterProps {
  color: string;
  t: any;
  language?: Language;
  employees?: Employee[];
  currentEmployeeId?: string;
}

export const CashRegister: React.FC<CashRegisterProps> = ({ color, t, language = 'EN', employees, currentEmployeeId }) => {
  const { getVerifiedDate } = useStatusBar();
  // Get help instructions based on language
  const helpContent = CASH_REGISTER_HELP[language];
  
  // Use the shared shift hook
  const { currentShift, shifts, isLoading, startShift, endShift, addTransaction } = useShift();
  
  // Local UI State
  const [modalMode, setModalMode] = useState<'open' | 'close' | 'in' | 'out' | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');

  // Current balance calculation
  // Expected balance = opening + sales + deposits - withdrawals - returns
  const currentBalance = useMemo(() => {
    if (!currentShift) return 0;
    return currentShift.openingBalance + currentShift.cashSales + currentShift.cashIn - currentShift.cashOut - (currentShift.returns || 0);
  }, [currentShift]);

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    if (!currentShift) return [];
    return currentShift.transactions.filter(tx => {
      if (filterType === 'all') return true;
      if (filterType === 'sales') return tx.type === 'sale' || tx.type === 'card_sale';
      if (filterType === 'returns') return tx.type === 'return';
      if (filterType === 'operations') return ['in', 'out', 'opening', 'closing'].includes(tx.type);
      return true;
    });
  }, [currentShift, filterType]);

  const counts = useMemo(() => {
    if (!currentShift) return { all: 0, sales: 0, returns: 0, operations: 0 };
    return {
      all: currentShift.transactions.length,
      sales: currentShift.transactions.filter(tx => tx.type === 'sale' || tx.type === 'card_sale').length,
      returns: currentShift.transactions.filter(tx => tx.type === 'return').length,
      operations: currentShift.transactions.filter(tx => ['in', 'out', 'opening', 'closing'].includes(tx.type)).length
    };
  }, [currentShift]);

  // Check if current user has permission to view expected balance
  const canViewExpectedBalance = useMemo(() => {
     if (!currentEmployeeId || !employees) return false;
     const user = employees.find(e => e.id === currentEmployeeId);
     if (!user) return false;
     
     return canPerformAction(user.role, 'shift.view_expected_balance');
  }, [currentEmployeeId, employees]);
  
  // Check if current user has permission to add/remove cash manually
  const canManageCash = useMemo(() => {
    if (!currentEmployeeId || !employees) return false;
    const user = employees.find(e => e.id === currentEmployeeId);
    if (!user) return false;
    
    return canPerformAction(user.role, 'shift.manage_cash');
  }, [currentEmployeeId, employees]);

  // Actions
  const handleOpenShift = () => {
    const amount = parseFloat(amountInput);
    
    // Validation
    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount < 0) {
      setValidationError(t.cashRegister.validation.negativeAmount);
      return;
    }

    // CHECK AUTH
    if (!currentEmployeeId) {
        setValidationError(language === 'AR' ? 'يجب تسجيل الدخول لفتح المناوبة' : 'You must login to open a shift');
        return;
    }

    const startUser = employees?.find(e => e.id === currentEmployeeId);
    const userName = startUser ? startUser.name : 'Pharmacist';

    const newShift: Shift = {
      id: getVerifiedDate().getTime().toString(),
      status: 'open',
      openTime: getVerifiedDate().toISOString(),
      openedBy: userName,
      openingBalance: amount,
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      cardSales: 0,
      returns: 0,  // Initialize returns counter
      transactions: [{
        id: getVerifiedDate().getTime().toString() + '-init',
        shiftId: getVerifiedDate().getTime().toString(),
        time: getVerifiedDate().toISOString(),
        type: 'opening',
        amount: amount,
        reason: reasonInput || 'Start of shift',
        userId: userName
      }]
    };

    startShift(newShift);
    closeModal();
  };

  const handleCloseShift = () => {
    if (!currentShift) return;
    const amount = parseFloat(amountInput);
    
    // Validation
    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount < 0) {
      setValidationError(t.cashRegister.validation.negativeAmount);
      return;
    }

    // CHECK AUTH
    if (!currentEmployeeId) {
        setValidationError(language === 'AR' ? 'يجب تسجيل الدخول لإغلاق المناوبة' : 'You must login to close a shift');
        return;
    }

    const startUser = employees?.find(e => e.id === currentEmployeeId);
    const userName = startUser ? startUser.name : 'Pharmacist';

    const closedShift: Shift = {
      ...currentShift,
      status: 'closed',
      closeTime: getVerifiedDate().toISOString(),
      closedBy: userName,
      closingBalance: amount,
      expectedBalance: currentBalance,
      notes: reasonInput,
      transactions: [...currentShift.transactions, {
        id: getVerifiedDate().getTime().toString() + '-close',
        shiftId: currentShift.id,
        time: getVerifiedDate().toISOString(),
        type: 'closing',
        amount: amount,
        reason: 'End of shift',
        userId: userName
      }]
    };

    endShift(closedShift);
    closeModal();
  };

  const handleCashTransaction = () => {
    if (!currentShift || !modalMode) return;
    const amount = parseFloat(amountInput);
    
    // Validation
    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount <= 0) {
      setValidationError(t.cashRegister.validation.positiveAmount);
      return;
    }
    if (modalMode === 'out') {
      // Protect opening balance - can only withdraw from sales + deposits
      const withdrawableBalance = currentShift.cashSales + currentShift.cashIn - currentShift.cashOut;
      if (amount > withdrawableBalance) {
        setValidationError(t.cashRegister.validation.protectedBalance);
        return;
      }
      if (!reasonInput.trim()) {
        setValidationError(t.cashRegister.validation.reasonRequired);
        return;
      }
    }

    const type: CashTransactionType = modalMode === 'in' ? 'in' : 'out';
    const transaction: CashTransaction = {
      id: getVerifiedDate().getTime().toString(),
      shiftId: currentShift.id,
      time: getVerifiedDate().toISOString(),
      type: type,
      amount: amount,
      reason: reasonInput,
      userId: employees?.find(e => e.id === currentEmployeeId)?.name || 'System'
    };

    addTransaction(currentShift.id, transaction, {
      cashIn: type === 'in' ? currentShift.cashIn + amount : currentShift.cashIn,
      cashOut: type === 'out' ? currentShift.cashOut + amount : currentShift.cashOut,
    });
    closeModal();
  };

  const closeModal = () => {
    setModalMode(null);
    setAmountInput('');
    setReasonInput('');
    setValidationError(null);
  };

  if (isLoading) return <div className="p-10 text-center">{t.cashRegister.messages.loading}</div>;

  return (
    <div 
      dir={language === 'AR' ? 'rtl' : 'ltr'}
      className={`h-full flex flex-col gap-6 animate-fade-in pb-10 ${language === 'AR' ? 'text-right' : 'text-left'}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.cashRegister.title}</h2>
          <p className="text-gray-500 text-sm mt-1">{t.cashRegister.subtitle}</p>
        </div>
        
        <div className="flex gap-3">
          {currentShift ? (
            <>
              {canManageCash && (
                <>
                  <button 
                    onClick={() => setModalMode('in')}
                    className={`px-4 py-2 rounded-xl bg-${color}-100 text-${color}-700 hover:bg-${color}-200 font-bold transition-colors flex items-center gap-2`}
                  >
                     <span className="material-symbols-rounded">add</span>
                     {t.cashRegister.actions.addCash}
                  </button>
                  <button 
                    onClick={() => setModalMode('out')}
                    className={`px-4 py-2 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold transition-colors flex items-center gap-2`}
                  >
                     <span className="material-symbols-rounded">remove</span>
                     {t.cashRegister.actions.removeCash}
                  </button>
                </>
              )}
              <button 
                onClick={() => setModalMode('close')}
                className={`px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-bold transition-colors flex items-center gap-2`}
              >
                 <span className="material-symbols-rounded">lock</span>
                 {t.cashRegister.actions.closeShift}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setModalMode('open')}
              className={`px-6 py-2.5 rounded-xl bg-${color}-600 text-white hover:bg-${color}-700 font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
            >
               <span className="material-symbols-rounded">lock_open</span>
               {t.cashRegister.actions.openShift}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Status & Summary */}
        <div className="md:col-span-1 space-y-4">
          
          {/* Status Card */}
          <div className={`p-6 rounded-3xl ${CARD_BASE} relative overflow-hidden group`}>
            <div className="absolute -bottom-6 ltr:-right-6 rtl:-left-6 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none select-none">
              <span className={`material-symbols-rounded text-[180px] ${currentShift ? `text-${color}-500` : 'text-gray-500'} -rotate-12`}>
                {currentShift ? 'lock_open' : 'lock'}
              </span>
            </div>
            
            <p className="text-sm font-bold uppercase text-gray-500 mb-2">{t.cashRegister.status.details}</p>
            <div className="flex items-center gap-3 mb-4">
               <div className={`w-3 h-3 rounded-full ${currentShift ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <h3 className="text-2xl font-bold">{currentShift ? t.cashRegister.status.open : t.cashRegister.status.closed}</h3>
            </div>
            {currentShift && (
               <div className="space-y-2">
                  {/* Time Badge */}
                  <div className="flex items-center gap-2">
                     <span className="text-sm text-gray-600 dark:text-gray-400">{t.cashRegister.messages.started}:</span>
                     <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider bg-transparent">
                        <span className="material-symbols-rounded text-sm">schedule</span>
                        {(() => {
                           const timeStr = new Date(currentShift.openTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                           });
                           
                           const parts = timeStr.split(' ');
                           const timeValue = parts[0];
                           const amPm = parts[1];

                           if (language === 'AR') {
                              const arabicMarker = amPm === 'AM' ? 'ص' : 'م';
                              return (
                                 <span className="flex items-center gap-1">
                                    <span className="font-sans">{timeValue}</span>
                                    <span className="text-[10px] font-bold opacity-80 mt-1">{arabicMarker}</span>
                                 </span>
                              );
                           }
                           return timeStr;
                        })()}
                     </span>
                     <span className="text-xs text-gray-400">
                        {new Date(currentShift.openTime).toLocaleDateString(language === 'AR' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' })}
                     </span>
                  </div>
                  
                  {/* User Badge */}
                  <div className="flex items-center gap-2">
                     <span className="text-sm text-gray-600 dark:text-gray-400">{t.cashRegister.messages.by}:</span>
                     <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider bg-transparent">
                        <span className="material-symbols-rounded text-sm">person</span>
                        {currentShift.openedBy}
                     </span>
                  </div>
                  
                  {/* Shift ID */}
                  <div className="flex items-center gap-2">
                     <span className="text-sm text-gray-600 dark:text-gray-400">{t.cashRegister.messages.id}:</span>
                     <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400 text-xs font-bold uppercase tracking-wider bg-transparent">
                        <span className="material-symbols-rounded text-sm">tag</span>
                        {currentShift.id.slice(-6)}
                     </span>
                  </div>
               </div>
            )}
          </div>

          {/* Balance Cards (Only if Open) */}
          {currentShift ? (
             <div className="space-y-3">
                {canViewExpectedBalance && (
                   <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}>
                      <p className={`text-xs font-bold uppercase text-${color}-800 dark:text-${color}-300 mb-1`}>{t.cashRegister.summary.expectedBalance}</p>
                      <p className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100 type-expressive`}>
                         {(() => {
                            const { amount, symbol } = formatCurrencyParts(currentBalance, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
                            return <>{amount} <span className="text-sm font-normal opacity-70">{symbol}</span></>;
                         })()}
                      </p>
                   </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.openingBalance}</p>
                      <p className="text-base font-bold text-gray-700 dark:text-gray-300">
                        {(() => {
                           const { amount, symbol } = formatCurrencyParts(currentShift.openingBalance, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                           return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashSales}</p>
                      <p className="text-base font-bold text-emerald-600 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-2xl">add</span>
                        {(() => {
                           const { amount, symbol } = formatCurrencyParts(currentShift.cashSales, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                           return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cardSales}</p>
                      <p className="text-base font-bold text-violet-600 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-2xl">add</span>
                        {(() => {
                           const { amount, symbol } = formatCurrencyParts(currentShift.cardSales || 0, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                           return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashIn}</p>
                      <p className="text-base font-bold text-orange-600 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-2xl">add</span>
                        {(() => {
                           const { amount, symbol } = formatCurrencyParts(currentShift.cashIn, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                           return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashOut}</p>
                      <p className="text-base font-bold text-red-600 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-2xl">remove</span>
                        {(() => {
                           const { amount, symbol } = formatCurrencyParts(currentShift.cashOut, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                           return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.returns || 'Returns'}</p>
                      <p className="text-base font-bold text-red-600 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-2xl">remove</span>
                        {(() => {
                          const returnTransactions = currentShift.transactions.filter(tx => tx.type === 'return');
                          const totalReturns = returnTransactions.reduce((sum, tx) => sum + tx.amount, 0);
                          const { amount, symbol } = formatCurrencyParts(totalReturns, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US', 0);
                          return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                        })()}
                      </p>
                   </div>
                </div>
             </div>
          ) : (
            <div className={`p-8 rounded-3xl ${CARD_BASE} text-center flex flex-col items-center justify-center min-h-[430px] text-gray-400`}>
                <span className="material-symbols-rounded text-5xl mb-3 opacity-50">shopping_bag</span>
                <p>{t.cashRegister.messages.noShift}</p>
            </div>
          )}
        </div>

        {/* Right Column: Transaction Log */}
        <div className="md:col-span-2 flex flex-col md:h-0 md:min-h-full">
             <div className={`rounded-3xl ${CARD_BASE} flex-1 flex flex-col h-full overflow-hidden`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
                   <h3 className="font-bold text-lg">{t.cashRegister.transactions.title}</h3>
                   <SegmentedControl
                      variant="onPage"
                      size="xs"
                      fullWidth={false}
                      value={filterType}
                      onChange={(val) => setFilterType(val as string)}
                      options={[
                        { label: t.cashRegister?.filters?.all || 'All', value: 'all', count: counts.all },
                        { label: t.cashRegister?.filters?.sales || 'Sales', value: 'sales', count: counts.sales, activeColor: 'green' },
                        { label: t.cashRegister?.filters?.returns || 'Returns', value: 'returns', count: counts.returns, activeColor: 'orange' },
                        { label: t.cashRegister?.filters?.operations || 'Ops', value: 'operations', count: counts.operations, activeColor: 'blue' },
                      ]}
                   />
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                   {currentShift && filteredTransactions.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                         <thead className="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
                            <tr>
                               <th className={`${TABLE_HEADER_BASE} text-start`}>{t.cashRegister.transactions.time}</th>
                               <th className={`${TABLE_HEADER_BASE} text-start`}>{t.cashRegister.transactions.type}</th>
                               <th className={TABLE_HEADER_BASE}>{t.cashRegister.transactions.user || 'User'}</th>
                               <th className={TABLE_HEADER_BASE}>{t.cashRegister.transactions.reason}</th>
                               <th className={`${TABLE_HEADER_BASE} text-end`}>{t.cashRegister.transactions.amount}</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredTransactions.map((tx) => (
                               <tr key={tx.id} className={TABLE_ROW_BASE}>
                                  <td className="py-3 px-4 text-sm text-gray-500 text-start">
                                     {(() => {
                                        const timeStr = new Date(tx.time).toLocaleTimeString('en-US', {
                                           hour: '2-digit',
                                           minute: '2-digit',
                                           hour12: true
                                        });
                                        
                                        const parts = timeStr.split(' '); // ["12:30", "PM"]
                                        const timeValue = parts[0];
                                        const amPm = parts[1];

                                        if (language === 'AR') {
                                           const arabicMarker = amPm === 'AM' ? 'ص' : 'م';
                                           return (
                                              <span className="flex items-center gap-1">
                                                 <span className="font-sans">{timeValue}</span>
                                                 <span className="text-[10px] font-bold opacity-80 mt-1">{arabicMarker}</span>
                                              </span>
                                           );
                                        }
                                        return timeStr;
                                     })()}
                                  </td>
                                  <td className="py-3 px-4 text-start">
                                     <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider bg-transparent
                                        ${(tx.type === 'in' || tx.type === 'opening') ? 'border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' : ''}
                                        ${(tx.type === 'out' || tx.type === 'closing') ? 'border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400' : ''}
                                        ${tx.type === 'sale' ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' : ''}
                                        ${tx.type === 'card_sale' ? 'border-violet-200 dark:border-violet-900/50 text-violet-700 dark:text-violet-400' : ''}
                                        ${tx.type === 'return' ? 'border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400' : ''}
                                     `}>
                                        <span className="material-symbols-rounded text-sm">
                                           {tx.type === 'opening' ? 'lock_open' : 
                                            tx.type === 'closing' ? 'lock' : 
                                            tx.type === 'in' ? 'login' : 
                                            tx.type === 'out' ? 'logout' : 
                                            tx.type === 'sale' ? 'point_of_sale' : 
                                            tx.type === 'card_sale' ? 'credit_card' : 
                                            tx.type === 'return' ? 'assignment_return' : 'receipt'}
                                        </span>
                                        {t.cashRegister.types[tx.type]}
                                     </span>
                                  </td>
                                  <td className="py-3 px-4 text-xs font-bold text-gray-500">
                                     {tx.userId || '-'}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                     {tx.reason || '-'}
                                  </td>
                                  <td className={`py-3 px-4 text-sm font-bold text-end
                                     ${(['in', 'opening', 'sale', 'card_sale'].includes(tx.type)) ? 'text-emerald-600' : 'text-red-600'}
                                  `}>
                                     {(['in', 'opening', 'sale', 'card_sale'].includes(tx.type)) ? '+' : '-'}
                                     {(() => {
                                        const { amount, symbol } = formatCurrencyParts(tx.amount, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
                                        return <>{amount} <span className="text-[10px] opacity-60 font-normal">{symbol}</span></>;
                                     })()}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                         <span className="material-symbols-rounded text-4xl mb-2 opacity-50">receipt_long</span>
                         <p>{t.cashRegister.messages.noTransactions}</p>
                      </div>
                   )}
                </div>
             </div>
        </div>
      </div>

      {/* Logic Modal */}
      {modalMode && (
        <Modal
            isOpen={true}
            onClose={closeModal}
            size="md"
            zIndex={50}
            title={
                modalMode === 'open' ? t.cashRegister.modal.openTitle :
                modalMode === 'close' ? t.cashRegister.modal.closeTitle :
                modalMode === 'in' ? t.cashRegister.actions.addCash :
                modalMode === 'out' ? t.cashRegister.actions.removeCash :
                ''
            }
        > 
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        {modalMode === 'close' ? t.cashRegister.messages.countedCash : t.cashRegister.modal.amount}
                     </label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input 
                           type="number" 
                           autoFocus
                           className={`${INPUT_BASE} pl-7 text-lg font-bold`}
                           placeholder="0.00"
                           value={amountInput}
                           onChange={e => {
                              setAmountInput(e.target.value);
                              setValidationError(null); // Clear error on change
                           }}
                           onKeyDown={e => {
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
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                           <span className="material-symbols-rounded text-[16px]">error</span>
                           {validationError}
                        </p>
                     )}
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        {t.cashRegister.modal.notes}
                     </label>
                     <textarea 
                        className={INPUT_BASE}
                        rows={3}
                        placeholder={t.cashRegister.messages.optionalNotes}
                        value={reasonInput}
                        onChange={e => {
                           setReasonInput(e.target.value);
                           setValidationError(null); // Clear error on change
                        }}
                     />
                  </div>

                  {modalMode === 'close' && currentShift && canViewExpectedBalance && (
                     <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-100 dark:border-yellow-900/50 text-sm">
                        <div className="flex justify-between">
                           <span>{t.cashRegister.messages.expected}</span>
                           <span className="font-bold">
                              {(() => {
                                 const { amount, symbol } = formatCurrencyParts(currentBalance, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
                                 return <>{amount} <span className="text-[0.7em] opacity-60 font-normal ml-0.5">{symbol}</span></>;
                              })()}
                           </span>
                        </div>
                        {amountInput && !isNaN(parseFloat(amountInput)) && (
                           <div className="flex justify-between mt-1 pt-1 border-t border-yellow-200 dark:border-yellow-900">
                              <span>{t.cashRegister.summary.variance}</span>
                              <span className={`font-bold ${Math.abs(parseFloat(amountInput) - currentBalance) <= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                 {(() => {
                                    const { amount, symbol } = formatCurrencyParts(parseFloat(amountInput) - currentBalance, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
                                    return <>{amount} <span className="text-[0.7em] opacity-60 font-normal ml-0.5">{symbol}</span></>;
                                 })()}
                              </span>
                           </div>
                        )}
                     </div>
                  )}

                  <div className="flex gap-3 pt-2">
                     <button 
                        onClick={closeModal}
                        className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                     >
                        {t.cashRegister.modal.cancel}
                     </button>
                     <button 
                        onClick={() => {
                           if (modalMode === 'open') handleOpenShift();
                           if (modalMode === 'close') handleCloseShift();
                           if (modalMode === 'in' || modalMode === 'out') handleCashTransaction();
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg shadow-${color}-500/20
                           bg-${color}-600 hover:bg-${color}-700 active:scale-95 transition-all`}
                     >
                        {t.cashRegister.modal.confirm}
                     </button>
                  </div>
               </div>
        </Modal>
      )}

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
    </div>
  );
};
