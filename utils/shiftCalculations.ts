import type { Shift } from '../types';

export const calculateShiftBalances = (shift: Shift | null) => {
  if (!shift) {
    return {
      currentBalance: 0,
      availableAboveBase: 0,
      cashInTotal: 0,
      cashOutTotal: 0,
      cashSalesTotal: 0,
      cashPurchaseReturnsTotal: 0,
      returnsTotal: 0,
      cashPurchasesTotal: 0,
    };
  }

  const openingBalance = Number(shift.openingBalance || 0);
  const cashInTotal = Number(shift.cashIn || 0);
  const cashSalesTotal = Number(shift.cashSales || 0);
  const cashPurchaseReturnsTotal = Number(shift.cashPurchaseReturns || 0);
  const cashOutTotal = Number(shift.cashOut || 0);
  const returnsTotal = Number(shift.returns || 0);
  const cashPurchasesTotal = Number(shift.cashPurchases || 0);

  // Cash generated/spent during the shift excluding the opening balance
  const availableAboveBase =
    cashInTotal +
    cashSalesTotal +
    cashPurchaseReturnsTotal -
    (cashOutTotal + returnsTotal + cashPurchasesTotal);

  // Total Expected Cash physically inside the drawer
  const currentBalance = openingBalance + availableAboveBase;

  return {
    currentBalance,
    availableAboveBase,
    openingBalance,
    cashInTotal,
    cashOutTotal,
    cashSalesTotal,
    cashPurchaseReturnsTotal,
    returnsTotal,
    cashPurchasesTotal,
  };
};
