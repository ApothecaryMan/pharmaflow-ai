import { useState, useMemo, useCallback } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import { permissionsService } from '../../services/auth/permissions';
import { useShift } from '../../hooks/useShift';
import type { CashTransaction, CashTransactionType, Employee, Language, Shift } from '../../types';
import { useData } from '../../services';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { generateShiftReceiptHTML } from './ShiftReceiptTemplate';
import { getPrinterSettings, printReceiptSilently } from '../../utils/qzPrinter';
import { idGenerator } from '../../utils/idGenerator';

interface UseCashRegisterProps {
  t: any;
  language: Language;
  employees?: Employee[];
  currentEmployeeId?: string;
}

export const useCashRegister = ({
  t,
  language,
  employees,
  currentEmployeeId,
}: UseCashRegisterProps) => {
  const { getVerifiedDate } = useStatusBar();
  const { currentShift, isLoading, startShift, endShift, addTransaction } = useShift();
  const { purchases, purchaseReturns, sales, activeBranchId, branches } = useData();

  // --- Local UI State ---
  const [modalMode, setModalMode] = useState<'open' | 'close' | 'in' | 'out' | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');

  // --- Derived State: Balance ---
  const currentBalance = useMemo(() => {
    if (!currentShift) return 0;
    return (
      currentShift.openingBalance +
      currentShift.cashSales +
      currentShift.cashIn +
      (currentShift.cashPurchaseReturns || 0) -
      currentShift.cashOut -
      (currentShift.returns || 0) -
      (currentShift.cashPurchases || 0)
    );
  }, [currentShift]);

  // --- Permission Checks ---
  const permissions = useMemo(() => {
    if (!currentEmployeeId || !employees) {
      return {
        canViewExpectedBalance: false,
        canAddCash: false,
        canRemoveCash: false,
        canOpenShift: false,
        canCloseShift: false,
      };
    }

    return {
      canViewExpectedBalance: permissionsService.can('shift.view_expected_balance'),
      canAddCash: permissionsService.can('shift.cash_in'),
      canRemoveCash: permissionsService.can('shift.cash_out'),
      canOpenShift: permissionsService.can('shift.open'),
      canCloseShift: permissionsService.can('shift.close'),
    };
  }, [currentEmployeeId, employees]);

  // --- Filter & Summary ---
  const filteredTransactions = useMemo(() => {
    if (!currentShift) return [];
    return currentShift.transactions.filter((tx) => {
      if (filterType === 'all') return true;
      if (filterType === 'sales') return tx.type === 'sale' || tx.type === 'card_sale';
      if (filterType === 'returns') return tx.type === 'return';
      if (filterType === 'purchases') return tx.type === 'purchase' || tx.type === 'purchase_return';
      if (filterType === 'operations') return ['in', 'out', 'opening', 'closing'].includes(tx.type);
      return true;
    });
  }, [currentShift, filterType]);

  const counts = useMemo(() => {
    if (!currentShift) return { all: 0, sales: 0, returns: 0, operations: 0, purchases: 0 };
    return {
      all: currentShift.transactions.length,
      sales: currentShift.transactions.filter((tx) => tx.type === 'sale' || tx.type === 'card_sale').length,
      returns: currentShift.transactions.filter((tx) => tx.type === 'return').length,
      purchases: currentShift.transactions.filter((tx) => tx.type === 'purchase' || tx.type === 'purchase_return').length,
      operations: currentShift.transactions.filter((tx) => ['in', 'out', 'opening', 'closing'].includes(tx.type)).length,
    };
  }, [currentShift]);

  // --- Handlers ---
  const closeModal = useCallback(() => {
    setModalMode(null);
    setAmountInput('');
    setReasonInput('');
    setValidationError(null);
  }, []);

  const handleOpenShift = useCallback(() => {
    const amount = parseFloat(amountInput);

    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount < 0) {
      setValidationError(t.cashRegister.validation.negativeAmount);
      return;
    }

    if (!currentEmployeeId || !permissions.canOpenShift) {
      setValidationError(
        language === 'AR'
          ? 'غير مصرح لك بفتح المناوبة'
          : 'You do not have permission to open a shift'
      );
      return;
    }

    const startUser = employees?.find((e) => e.id === currentEmployeeId);
    const userName = startUser ? startUser.name : 'Pharmacist';
    const newShiftId = idGenerator.uuid();
    const activeBranch = branches.find(b => b.id === activeBranchId);
    const branchCode = activeBranch?.code || 'PF';

    const newShift: Shift = {
      id: newShiftId,
      branchId: activeBranchId,
      branchName: activeBranch?.name,
      status: 'open',
      openTime: getVerifiedDate().toISOString(),
      openedBy: currentEmployeeId, // Use ID for DB
      openingBalance: amount,
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      cardSales: 0,
      returns: 0,
      transactions: [
        {
          id: idGenerator.uuid(),
          branchId: activeBranchId,
          shiftId: newShiftId,
          time: getVerifiedDate().toISOString(),
          type: 'opening',
          amount: amount,
          reason: reasonInput || 'Start of shift',
          userId: currentEmployeeId || 'System',
        },
      ],
    };

    startShift(newShift).then(() => {
      closeModal();
    }).catch(err => {
      setValidationError(err.message || 'Failed to open shift');
    });
  }, [amountInput, currentEmployeeId, permissions.canOpenShift, t, language, activeBranchId, branches, getVerifiedDate, reasonInput, startShift, closeModal]);

  const handleCloseShift = useCallback(() => {
    if (!currentShift) return;
    const amount = parseFloat(amountInput);

    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount < 0) {
      setValidationError(t.cashRegister.validation.negativeAmount);
      return;
    }

    if (!currentEmployeeId || !permissions.canCloseShift) {
      setValidationError(
        language === 'AR'
          ? 'غير مصرح لك بإغلاق المناوبة'
          : 'You do not have permission to close a shift'
      );
      return;
    }

    const startUser = employees?.find((e) => e.id === currentEmployeeId);
    const userName = startUser ? startUser.name : 'Pharmacist';

    const closeTs = getVerifiedDate();
    const shiftStart = new Date(currentShift.openTime).getTime();
    const shiftEnd = closeTs.getTime();

    const cashPurchases = purchases
      .filter((p) => p.paymentMethod === 'cash' && new Date(p.date).getTime() >= shiftStart && new Date(p.date).getTime() <= shiftEnd)
      .reduce((sum, p) => sum + p.totalCost, 0);

    const cashPurchaseReturns = purchaseReturns
      .filter((pr) => new Date(pr.date).getTime() >= shiftStart && new Date(pr.date).getTime() <= shiftEnd)
      .reduce((sum, pr) => sum + pr.totalRefund, 0);

    const cashInvoiceCount = currentShift.transactions.filter((tx) => tx.type === 'sale').length;
    const cardInvoiceCount = currentShift.transactions.filter((tx) => tx.type === 'card_sale').length;

    const totalDiscounts = sales
      .filter((s) => new Date(s.date).getTime() >= shiftStart && new Date(s.date).getTime() <= shiftEnd)
      .reduce((sum, s) => sum + (s.globalDiscount || 0), 0);

    const shiftDurationMinutes = Math.round((shiftEnd - shiftStart) / 60000);

    const counterKey = `${StorageKeys.SHIFT_RECEIPT_COUNTER}_${currentShift.branchId || 'default'}`;
    const prevCounter = storage.get<number>(counterKey, 0);
    const handoverReceiptNumber = prevCounter + 1;
    storage.set(counterKey, handoverReceiptNumber);

    const closedShift: Shift = {
      ...currentShift,
      status: 'closed',
      closeTime: closeTs.toISOString(),
      closedBy: currentEmployeeId, // Use ID for DB
      closingBalance: amount,
      expectedBalance: currentBalance,
      cashPurchases,
      cashPurchaseReturns,
      totalDiscounts,
      cashInvoiceCount,
      cardInvoiceCount,
      shiftDurationMinutes,
      handoverReceiptNumber,
      notes: reasonInput,
      printCount: 1,
      transactions: [
        ...currentShift.transactions,
        {
          id: getVerifiedDate().getTime().toString() + '-close',
          branchId: activeBranchId,
          shiftId: currentShift.id,
          time: getVerifiedDate().toISOString(),
          type: 'closing',
          amount: amount,
          reason: 'End of shift',
          userId: currentEmployeeId || 'System',
        },
      ],
    };

    endShift(closedShift).then(() => {
      closeModal();
    }).catch(err => {
      setValidationError(err.message || 'Failed to close shift');
    });

    // Printing Logic
    setTimeout(async () => {
      try {
        const html = generateShiftReceiptHTML(closedShift, language, employees);
        const printerSettings = getPrinterSettings();
        const shouldTrySilent = printerSettings.enabled && printerSettings.silentMode !== 'off';
        let printedSilently = false;

        if (shouldTrySilent && printerSettings.receiptPrinter) {
          try {
            const silentPrinted = await printReceiptSilently(html);
            if (silentPrinted) {
              printedSilently = true;
            }
          } catch (silentErr) {
            console.warn('Silent print failed, falling back:', silentErr);
          }
        }

        if (!printedSilently) {
          const printWindow = window.open('', '_blank', 'width=400,height=600');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }
        }
      } catch (e) {
        console.error('Print failed:', e);
      }
    }, 500);
  }, [currentShift, amountInput, currentEmployeeId, permissions.canCloseShift, t, language, employees, getVerifiedDate, purchases, purchaseReturns, sales, currentBalance, reasonInput, activeBranchId, endShift, closeModal]);

  const handleCashTransaction = useCallback(() => {
    if (!currentShift || !modalMode) return;
    const amount = parseFloat(amountInput);

    if (amountInput === '' || isNaN(amount)) {
      setValidationError(t.cashRegister.validation.amountRequired);
      return;
    }
    if (amount <= 0) {
      setValidationError(t.cashRegister.validation.positiveAmount);
      return;
    }

    if (modalMode === 'in' && !permissions.canAddCash) {
      setValidationError(language === 'AR' ? 'غير مصرح لك بإضافة نقدية' : 'You do not have permission to add cash');
      return;
    }
    if (modalMode === 'out' && !permissions.canRemoveCash) {
      setValidationError(language === 'AR' ? 'غير مصرح لك بسحب نقدية' : 'You do not have permission to remove cash');
      return;
    }

    if (modalMode === 'out') {
      const withdrawableBalance =
        currentShift.cashSales +
        currentShift.cashIn -
        currentShift.cashOut -
        (currentShift.returns || 0);
      if (amount > withdrawableBalance) {
        setValidationError(t.cashRegister.validation.protectedBalance);
        return;
      }
    }

    if (!reasonInput.trim()) {
      setValidationError(t.cashRegister.validation.reasonRequired);
      return;
    }

    const type: CashTransactionType = modalMode === 'in' ? 'in' : 'out';
    const transaction: CashTransaction = {
      id: getVerifiedDate().getTime().toString(),
      branchId: activeBranchId,
      shiftId: currentShift.id,
      time: getVerifiedDate().toISOString(),
      type: type,
      amount: amount,
      reason: reasonInput,
      userId: currentEmployeeId || 'System',
    };

    addTransaction(currentShift.id, transaction).then(() => {
      closeModal();
    }).catch(err => {
      setValidationError(err.message || 'Failed to add transaction');
    });
  }, [currentShift, modalMode, amountInput, permissions.canAddCash, permissions.canRemoveCash, t, language, reasonInput, getVerifiedDate, activeBranchId, employees, currentEmployeeId, addTransaction, closeModal]);

  return {
    // State
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
    
    // Derived
    currentBalance,
    permissions,
    filteredTransactions,
    counts,
    
    // Actions
    handleOpenShift,
    handleCloseShift,
    handleCashTransaction,
    closeModal,
  };
};
