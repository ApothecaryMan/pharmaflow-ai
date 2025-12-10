
import React, { useState, useEffect, useMemo } from 'react';
import { Shift, CashTransaction, CashTransactionType, Language } from '../types';
import { CARD_BASE, TABLE_HEADER_BASE, TABLE_ROW_BASE, BUTTON_BASE, INPUT_BASE, THEME_COLORS } from '../utils/themeStyles';
import { useSmartDirection } from '../hooks/useSmartDirection';
import { CASH_REGISTER_HELP } from '../cashRegisterHelp';

interface CashRegisterProps {
  color: string;
  t: any;
  language?: Language;
}

export const CashRegister: React.FC<CashRegisterProps> = ({ color, t, language = 'EN' }) => {
  // Get help instructions based on language
  const helpContent = CASH_REGISTER_HELP[language];
  // State
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [modalMode, setModalMode] = useState<'open' | 'close' | 'in' | 'out' | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedShifts = localStorage.getItem('pharma_shifts');
    if (savedShifts) {
      const parsedShifts: Shift[] = JSON.parse(savedShifts);
      setShifts(parsedShifts);
      // Find active open shift
      const active = parsedShifts.find(s => s.status === 'open');
      if (active) setCurrentShift(active);
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('pharma_shifts', JSON.stringify(shifts));
    }
  }, [shifts, isLoading]);

  // Current balance calculation
  const currentBalance = useMemo(() => {
    if (!currentShift) return 0;
    return currentShift.openingBalance + currentShift.cashSales + currentShift.cashIn - currentShift.cashOut;
  }, [currentShift]);

  // Actions
  const handleOpenShift = () => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount)) return;

    const newShift: Shift = {
      id: Date.now().toString(),
      status: 'open',
      openTime: new Date().toISOString(),
      openedBy: 'Pharmacist', // Mock User
      openingBalance: amount,
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      transactions: [{
        id: Date.now().toString() + '-init',
        shiftId: Date.now().toString(),
        time: new Date().toISOString(),
        type: 'opening',
        amount: amount,
        reason: reasonInput || 'Start of shift',
        userId: 'Pharmacist'
      }]
    };

    setShifts(prev => [newShift, ...prev]);
    setCurrentShift(newShift);
    closeModal();
  };

  const handleCloseShift = () => {
    if (!currentShift) return;
    const amount = parseFloat(amountInput); // Actual counted cash
    if (isNaN(amount)) return;

    const closedShift: Shift = {
      ...currentShift,
      status: 'closed',
      closeTime: new Date().toISOString(),
      closedBy: 'Pharmacist',
      closingBalance: amount,
      expectedBalance: currentBalance,
      notes: reasonInput,
      transactions: [...currentShift.transactions, {
        id: Date.now().toString() + '-close',
        shiftId: currentShift.id,
        time: new Date().toISOString(),
        type: 'closing',
        amount: amount,
        reason: 'End of shift',
        userId: 'Pharmacist'
      }]
    };

    setShifts(prev => prev.map(s => s.id === closedShift.id ? closedShift : s));
    setCurrentShift(null);
    closeModal();
  };

  const handleCashTransaction = () => {
    if (!currentShift || !modalMode) return;
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    const type: CashTransactionType = modalMode === 'in' ? 'in' : 'out';
    const transaction: CashTransaction = {
      id: Date.now().toString(),
      shiftId: currentShift.id,
      time: new Date().toISOString(),
      type: type,
      amount: amount,
      reason: reasonInput,
      userId: 'Pharmacist'
    };

    const updatedShift: Shift = {
      ...currentShift,
      cashIn: type === 'in' ? currentShift.cashIn + amount : currentShift.cashIn,
      cashOut: type === 'out' ? currentShift.cashOut + amount : currentShift.cashOut,
      transactions: [transaction, ...currentShift.transactions] // Newest first
    };

    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
    setCurrentShift(updatedShift);
    closeModal();
  };

  const closeModal = () => {
    setModalMode(null);
    setAmountInput('');
    setReasonInput('');
  };

  if (isLoading) return <div className="p-10 text-center">{t.cashRegister.messages.loading}</div>;

  return (
    <div className={`h-full flex flex-col gap-6 animate-fade-in pb-10 ${language === 'AR' ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.cashRegister.title}</h2>
          <p className="text-gray-500 text-sm mt-1">{t.cashRegister.subtitle}</p>
        </div>
        
        <div className="flex gap-3">
          {currentShift ? (
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
            {currentShift ? (
               <div className="absolute top-0 ltr:right-0 rtl:left-0 p-4 opacity-10">
                  <span className={`material-symbols-rounded text-9xl text-${color}-500`}>lock_open</span>
               </div>
            ) : (
                <div className="absolute top-0 ltr:right-0 rtl:left-0 p-4 opacity-10">
                  <span className="material-symbols-rounded text-9xl text-gray-500">lock</span>
               </div>
            )}
            
            <p className="text-sm font-bold uppercase text-gray-500 mb-2">{t.cashRegister.status.details}</p>
            <div className="flex items-center gap-3 mb-4">
               <div className={`w-3 h-3 rounded-full ${currentShift ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <h3 className="text-2xl font-bold">{currentShift ? t.cashRegister.status.open : t.cashRegister.status.closed}</h3>
            </div>
            {currentShift && (
               <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p>{t.cashRegister.messages.started}: <span dir="ltr">{new Date(currentShift.openTime).toLocaleTimeString()}</span></p>
                  <p>{t.cashRegister.messages.by}: {currentShift.openedBy}</p>
                  <p>{t.cashRegister.messages.id}: <span dir="ltr">#{currentShift.id.slice(-6)}</span></p>
               </div>
            )}
          </div>

          {/* Balance Cards (Only if Open) */}
          {currentShift ? (
             <div className="space-y-3">
                <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}>
                   <p className={`text-xs font-bold uppercase text-${color}-800 dark:text-${color}-300 mb-1`}>{t.cashRegister.summary.expectedBalance}</p>
                   <p className={`text-3xl font-bold text-${color}-900 dark:text-${color}-100 type-expressive`}>${currentBalance.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.openingBalance}</p>
                      <p className="text-lg font-bold">${currentShift.openingBalance.toFixed(2)}</p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashSales}</p>
                      <p className="text-lg font-bold text-green-600">+${currentShift.cashSales.toFixed(2)}</p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashIn}</p>
                      <p className="text-lg font-bold text-orange-600">+${currentShift.cashIn.toFixed(2)}</p>
                   </div>
                   <div className={`p-4 rounded-2xl ${CARD_BASE}`}>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{t.cashRegister.summary.cashOut}</p>
                      <p className="text-lg font-bold text-orange-600">-${currentShift.cashOut.toFixed(2)}</p>
                   </div>
                </div>
             </div>
          ) : (
            <div className={`p-8 rounded-3xl ${CARD_BASE} text-center flex flex-col items-center justify-center h-64 text-gray-400`}>
                <span className="material-symbols-rounded text-5xl mb-3 opacity-50">shopping_bag</span>
                <p>{t.cashRegister.messages.noShift}</p>
            </div>
          )}
        </div>

        {/* Right Column: Transaction Log */}
        <div className="md:col-span-2 space-y-4">
             <div className={`rounded-3xl ${CARD_BASE} min-h-[500px] flex flex-col`}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                   <h3 className="font-bold text-lg">{t.cashRegister.transactions.title}</h3>
                   <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">
                      {currentShift ? currentShift.transactions.length : 0} items
                   </span>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                   {currentShift && currentShift.transactions.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                         <thead className="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
                            <tr>
                               <th className={TABLE_HEADER_BASE}>{t.cashRegister.transactions.time}</th>
                               <th className={TABLE_HEADER_BASE}>{t.cashRegister.transactions.type}</th>
                               <th className={TABLE_HEADER_BASE}>{t.cashRegister.transactions.reason}</th>
                               <th className={`${TABLE_HEADER_BASE} text-end`}>{t.cashRegister.transactions.amount}</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {currentShift.transactions.map((tx) => (
                               <tr key={tx.id} className={TABLE_ROW_BASE}>
                                  <td className="py-3 px-4 text-sm text-gray-500 font-mono" dir="ltr">
                                     {new Date(tx.time).toLocaleTimeString()}
                                  </td>
                                  <td className="py-3 px-4">
                                     <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase
                                        ${tx.type === 'in' || tx.type === 'opening' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                                        ${tx.type === 'out' || tx.type === 'closing' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}
                                        ${tx.type === 'sale' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''}
                                     `}>
                                        {t.cashRegister.types[tx.type]}
                                     </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                     {tx.reason || '-'}
                                  </td>
                                  <td className={`py-3 px-4 text-sm font-bold text-end font-mono
                                     ${(['in', 'opening', 'sale'].includes(tx.type)) ? 'text-green-600' : 'text-red-600'}
                                  `}>
                                     {(['in', 'opening', 'sale'].includes(tx.type)) ? '+' : '-'}${tx.amount.toFixed(2)}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col scale-in">
               <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900`}>
                  <h3 className={`text-lg font-bold text-${color}-900 dark:text-${color}-100`}>
                     {modalMode === 'open' && t.cashRegister.modal.openTitle}
                     {modalMode === 'close' && t.cashRegister.modal.closeTitle}
                     {modalMode === 'in' && t.cashRegister.actions.addCash}
                     {modalMode === 'out' && t.cashRegister.actions.removeCash}
                  </h3>
               </div>
               
               <div className="p-6 space-y-4">
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
                           onChange={e => setAmountInput(e.target.value)}
                           onKeyDown={e => {
                              if (e.key === 'Enter') {
                                 if (modalMode === 'open') handleOpenShift();
                                 if (modalMode === 'close') handleCloseShift();
                                 if (modalMode === 'in' || modalMode === 'out') handleCashTransaction();
                              }
                           }}
                        />
                     </div>
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
                        onChange={e => setReasonInput(e.target.value)}
                     />
                  </div>

                  {modalMode === 'close' && currentShift && (
                     <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-100 dark:border-yellow-900/50 text-sm">
                        <div className="flex justify-between">
                           <span>{t.cashRegister.messages.expected}</span>
                           <span className="font-bold">${currentBalance.toFixed(2)}</span>
                        </div>
                        {amountInput && !isNaN(parseFloat(amountInput)) && (
                           <div className="flex justify-between mt-1 pt-1 border-t border-yellow-200 dark:border-yellow-900">
                              <span>{t.cashRegister.summary.variance}</span>
                              <span className={`font-bold ${Math.abs(parseFloat(amountInput) - currentBalance) <= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                 ${(parseFloat(amountInput) - currentBalance).toFixed(2)}
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
            </div>
         </div>
      )}

      {/* Help Button - Bottom Corner */}
      <button
        onClick={() => setShowHelp(true)}
        className={`fixed ${language === 'AR' ? 'left-6' : 'right-6'} bottom-6 w-10 h-10 rounded-full bg-${color}-600 text-white shadow-md transition-colors flex items-center justify-center z-40`}
        title={helpContent.title}
      >
        <span className="material-symbols-rounded text-lg">help</span>
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className={`p-6 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
              <h2 className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100 flex items-center gap-3`}>
                <span className="material-symbols-rounded text-3xl">help</span>
                {helpContent.title}
              </h2>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <span className="material-symbols-rounded text-gray-500 text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className={`material-symbols-rounded text-${color}-600`}>lock_open</span>
                  {helpContent.openShift.title}
                </h3>
                <ol className="space-y-2 list-decimal list-inside text-gray-700 dark:text-gray-300">
                  {helpContent.openShift.steps.map((step: string, i: number) => (
                    <li key={i} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>

              <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className={`material-symbols-rounded text-${color}-600`}>swap_horiz</span>
                  {helpContent.transactions.title}
                </h3>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">{helpContent.transactions.addCash.title}</h4>
                  <ol className="space-y-1 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 ml-4">
                    {helpContent.transactions.addCash.steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">{helpContent.transactions.removeCash.title}</h4>
                  <ol className="space-y-1 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 ml-4">
                    {helpContent.transactions.removeCash.steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-red-600">lock</span>
                  {helpContent.closeShift.title}
                </h3>
                <ol className="space-y-2 list-decimal list-inside text-gray-700 dark:text-gray-300">
                  {helpContent.closeShift.steps.map((step: string, i: number) => (
                    <li key={i} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                  <span className="material-symbols-rounded text-yellow-600">lightbulb</span>
                  {helpContent.tips.title}
                </h3>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  {helpContent.tips.items.map((tip: string, i: number) => (
                    <li key={i} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
