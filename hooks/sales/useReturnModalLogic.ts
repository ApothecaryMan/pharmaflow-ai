import { useMemo, useState } from 'react';
import { permissionsService } from '../../services/auth/permissionsService';
import { pricingService } from '../../services/sales/pricingService';
import type { Sale, Shift, ProcessReturnPayload } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { money } from '../../utils/money';

const PHARMACIST_REFUND_LIMIT_PER_INVOICE = 1000; // 1000.00 EGP
const PHARMACIST_DAILY_REFUND_LIMIT = 2000; // 2000.00 EGP
const CASHIER_REFUND_LIMIT_PER_INVOICE = 500; // 500.00 EGP

interface UseReturnModalLogicProps {
  sale: Sale;
  currentShift: Shift | null;
  currentDailyRefunds: number;
  language: string;
  t: any; // Translations
}

export function useReturnModalLogic({
  sale,
  currentShift,
  currentDailyRefunds,
  language,
  t,
}: UseReturnModalLogicProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [itemUnitModes, setItemUnitModes] = useState<Map<string, boolean>>(new Map());
  
  const [returnReason, setReturnReason] = useState<'customer_request' | 'wrong_item' | 'damaged' | 'expired' | 'defective' | 'other'>('customer_request');
  const [returnNotes, setReturnNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const availableItems = useMemo(() => {
    return sale.items
      .map((item: any) => {
        const saleItemId = item.saleItemId ?? item.id;
        const isUnit = item.isUnit ?? item.is_unit ?? false;
        const publicPrice = item.publicPrice ?? item.public_price ?? 0;
        const unitsPerPack = item.unitsPerPack ?? 1;

        const returnedQty =
          sale.itemReturnedQuantities?.[`${saleItemId}_unit`] ||
          sale.itemReturnedQuantities?.[`${saleItemId}_pack`] ||
          sale.itemReturnedQuantities?.[saleItemId] ||
          0;
          
        const availableQty = (item.quantity ?? item.quantity_sold ?? 0) - returnedQty;

        const effectiveUnitMode = itemUnitModes.get(saleItemId) ?? false;
        const effectiveMaxQty = effectiveUnitMode
          ? isUnit
            ? availableQty
            : availableQty * unitsPerPack
          : isUnit
            ? Math.max(0, Math.floor(availableQty / unitsPerPack))
            : availableQty;

        return {
          ...item,
          saleItemId,
          isUnit,
          publicPrice,
          unitsPerPack,
          effectiveMaxQty,
          effectiveUnitMode,
          returnedQty,
          availableQty,
        };
      })
      .filter((item) => item.effectiveMaxQty > 0);
  }, [sale, itemUnitModes]);

  const toggleItemSelection = (saleItemId: string, maxQty: number) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(saleItemId)) {
      newSelected.delete(saleItemId);
    } else {
      newSelected.set(saleItemId, maxQty);
    }
    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (saleItemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    if (quantity > 0) {
      newSelected.set(saleItemId, quantity);
    } else {
      newSelected.delete(saleItemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleUnitMode = (saleItemId: string, currentMaxQty: number, unitsPerPack: number) => {
    const newModes = new Map(itemUnitModes);
    const currentMode = newModes.get(saleItemId) ?? false;
    const newMode = !currentMode;
    newModes.set(saleItemId, newMode);
    setItemUnitModes(newModes);

    const newSelected = new Map(selectedItems);
    const currentQty = (newSelected.get(saleItemId) as number) ?? 0;
    if (currentQty > 0) {
      const convertedQty = newMode
        ? currentQty * unitsPerPack
        : Math.max(1, Math.floor(currentQty / unitsPerPack));
      const availableInNewMode = newMode
        ? currentMaxQty * unitsPerPack
        : Math.max(1, Math.floor(currentMaxQty / unitsPerPack));
      
      newSelected.set(saleItemId, Math.min(convertedQty, availableInNewMode));
      setSelectedItems(newSelected);
    }
  };

  const selectAll = () => {
    const newSelected = new Map<string, number>();
    availableItems.forEach((item) => {
      newSelected.set(item.saleItemId, item.effectiveMaxQty);
    });
    setSelectedItems(newSelected);
  };

  const deselectAll = () => {
    setSelectedItems(new Map());
  };

  const isAllSelected =
    availableItems.length > 0 && availableItems.every((item) => selectedItems.has(item.saleItemId));

  const calculateRefund = useMemo(() => {
    return pricingService.calculateRefundAmount(sale, selectedItems);
  }, [selectedItems, sale]);

  const validateReturn = (): boolean => {
    setValidationError(null);

    if (!currentShift) {
      setValidationError(t.returns.validation?.noOpenShift || 'Cannot process return - no open shift');
      return false;
    }

    const openShift = currentShift;

    if (permissionsService.hasRole('pharmacist')) {
      if (money.isGt(calculateRefund, PHARMACIST_REFUND_LIMIT_PER_INVOICE)) {
        const errorMsg =
          language === 'AR'
            ? `خطأ: لا يمكن استرجاع مبلغ أكبر من ${formatCurrency(PHARMACIST_REFUND_LIMIT_PER_INVOICE)} في العملية الواحدة للصيدلي. يرجى طلب موافقة المدير.`
            : `Error: Pharmacists cannot refund more than ${formatCurrency(PHARMACIST_REFUND_LIMIT_PER_INVOICE)} per invoice. Please request manager approval.`;
        setValidationError(errorMsg);
        return false;
      }

      const projectedDailyTotal = (currentDailyRefunds || 0) + calculateRefund;
      if (money.isGt(projectedDailyTotal, PHARMACIST_DAILY_REFUND_LIMIT)) {
        const errorMsg =
          language === 'AR'
            ? `خطأ: تم تجاوز الحد اليومي للمرتجعات (${formatCurrency(PHARMACIST_DAILY_REFUND_LIMIT)}). الإجمالي الحالي: ${formatCurrency(currentDailyRefunds)}, المبلغ المطلوب: ${formatCurrency(calculateRefund)}. يرجى طلب موافقة المدير.`
            : `Error: Daily refund limit exceeded (${formatCurrency(PHARMACIST_DAILY_REFUND_LIMIT)}). Current: ${formatCurrency(currentDailyRefunds)}, Requested: ${formatCurrency(calculateRefund)}. Please request manager approval.`;
        setValidationError(errorMsg);
        return false;
      }
    }

    if (permissionsService.hasRole('cashier')) {
      const isSameShift = new Date(sale.date) >= new Date(currentShift.openTime);
      if (!isSameShift) {
        const errorMsg =
          language === 'AR'
            ? 'خطأ: يمكن للكاشير استرجاع الفواتير التي تمت في نفس الوردية فقط.'
            : 'Error: Cashiers can only refund invoices processed during the current shift.';
        setValidationError(errorMsg);
        return false;
      }

      if (money.isGt(calculateRefund, CASHIER_REFUND_LIMIT_PER_INVOICE)) {
        const errorMsg =
          language === 'AR'
            ? `خطأ: لا يمكن للكاشير استرجاع مبلغ أكبر من ${formatCurrency(CASHIER_REFUND_LIMIT_PER_INVOICE)} في العملية الواحدة.`
            : `Error: Cashiers cannot refund more than ${formatCurrency(CASHIER_REFUND_LIMIT_PER_INVOICE)} per invoice.`;
        setValidationError(errorMsg);
        return false;
      }
    }

    // BUG-010: Split balance check by payment method
    // Note: The RPC also strictly enforces this, but validating here provides a better UX
    const isCashSale = sale.paymentMethod === 'cash';
    if (isCashSale) {
      const cashBalance = money.subtract(
        money.add(
          money.add(openShift.openingBalance || 0, openShift.cashSales || 0),
          openShift.cashIn || 0
        ),
        money.add(openShift.returns || 0, openShift.cashOut || 0)
      );

      if (money.isGt(calculateRefund, cashBalance)) {
        setValidationError(
          t.returns.validation?.insufficientBalance ||
            'Cash refund amount exceeds available cash balance in the current shift'
        );
        return false;
      }
    } else {
      const totalBalance = money.subtract(
        money.add(
          money.add(
            money.add(openShift.openingBalance || 0, openShift.cashSales || 0),
            openShift.cardSales || 0
          ),
          openShift.cashIn || 0
        ),
        money.add(openShift.returns || 0, openShift.cashOut || 0)
      );
      if (money.isGt(calculateRefund, totalBalance)) {
        setValidationError(
          t.returns.validation?.insufficientBalance ||
            'Return amount exceeds available sales balance'
        );
        return false;
      }
    }

    return true;
  };

  const buildReturnPayload = (): ProcessReturnPayload => {
    const returnItems: any[] = [];
    
    sale.items.forEach((item: any) => {
      const saleItemId = item.saleItemId ?? item.id;
      const selectedQty = selectedItems.get(saleItemId);
      
      if (selectedQty != null && selectedQty > 0) {
        const toggledMode = itemUnitModes.get(saleItemId) ?? false;
        const isUnit = item.isUnit ?? false;
        const finalIsUnit = toggledMode ? !isUnit : isUnit;

        returnItems.push({
          drugId: item.drugId ?? item.drug_id,
          saleItemId: saleItemId,
          quantityReturned: selectedQty,
          isUnit: finalIsUnit,
          condition: 'sellable',
        });
      }
    });

    return {
      saleId: sale.id,
      returnType: isAllSelected
        ? (returnItems.some((i) => i.isUnit) ? 'unit' : 'full')
        : (returnItems.some((i) => i.isUnit) ? 'unit' : 'partial'),
      items: returnItems,
      reason: returnReason,
      notes: returnNotes,
    };
  };

  const reset = () => {
    setStep(1);
    setSelectedItems(new Map());
    setItemUnitModes(new Map());
    setReturnReason('customer_request');
    setReturnNotes('');
    setValidationError(null);
  };

  return {
    step,
    setStep,
    isProcessing,
    setIsProcessing,
    selectedItems,
    itemUnitModes,
    returnReason,
    setReturnReason,
    returnNotes,
    setReturnNotes,
    validationError,
    setValidationError,
    availableItems,
    toggleItemSelection,
    updateItemQuantity,
    toggleUnitMode,
    selectAll,
    deselectAll,
    isAllSelected,
    calculateRefund,
    validateReturn,
    buildReturnPayload,
    reset,
  };
}
