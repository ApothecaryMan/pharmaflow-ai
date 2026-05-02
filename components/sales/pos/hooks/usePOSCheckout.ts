import { useState, useCallback, useEffect } from 'react';
import { type UserRole } from '../../../../config/permissions';
import { permissionsService } from '../../../../services/auth/permissionsService';
import type { CartItem, Customer, Sale } from '../../../../types';
import { generateInvoiceHTML, getActiveReceiptSettings } from '../../InvoiceTemplate';
import { getPrinterSettings, printReceiptSilently } from '../../../../utils/qzPrinter';
import { buildSalePayload } from '../utils/POSUtils';
import { money, formatCurrency } from '../../../../utils/currency';

interface UsePOSCheckoutProps {
  cart: CartItem[];
  mergedCartItems: any[];
  showToastError: (msg: string) => void;
  addNotification: (notification: any) => void;
  playSuccess: () => void;
  getVerifiedDate: () => Date;
  activeTab: any;
  activeTabId: string;
  removeTab: (id: string) => void;
  onCompleteSale: (saleData: any) => Promise<boolean>;
  customerName: string;
  customerCode: string;
  selectedCustomer: Customer | null;
  language: string;
  t: any;
  cartTotal: number;
  subtotal: number;
  globalDiscount: number;
  activeBranchId: string;
}

const DELIVERY_FEE = 5; // 5.00 EGP

export const usePOSCheckout = ({
  cart,
  mergedCartItems,
  showToastError,
  addNotification,
  playSuccess,
  getVerifiedDate,
  activeTab,
  activeTabId,
  removeTab,
  onCompleteSale,
  customerName,
  customerCode,
  selectedCustomer,
  language,
  t,
  cartTotal,
  subtotal,
  globalDiscount,
  activeBranchId,
}: UsePOSCheckoutProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa'>('cash');
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState<string>('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isValidOrder =
    cart.length > 0 &&
    mergedCartItems.every((item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0);

  const handleCheckout = useCallback(
    async (saleType: 'walk-in' | 'delivery' = 'walk-in', isPending: boolean = false) => {
      if (isProcessing) return;
      if (!permissionsService.can('sale.create')) {
        showToastError('Permission Denied: Cannot perform checkout');
        return;
      }
      if (!isValidOrder) return;

      setIsProcessing(true);
      try {

      const isDelivery = saleType === 'delivery';
      let deliveryFee = 0;
      if (isDelivery) {
        deliveryFee = DELIVERY_FEE;
      }

      if (isDelivery && !deliveryEmployeeId && !isPending) {
        alert(t.selectDriver || 'Please select a delivery man');
        return;
      }

      const startTime = activeTab?.firstItemAt || activeTab?.createdAt;
      let processingTimeMinutes: number | undefined;
      if (startTime) {
        const rawMinutes = Math.round(((Date.now() - startTime) / 60000) * 10) / 10;
        processingTimeMinutes = Math.max(0.1, Math.min(rawMinutes, 60));
      }

      const saleParams = {
        items: cart.filter((item) => item.quantity > 0),
        customer: selectedCustomer,
        customerName: customerName || undefined,
        customerCode,
        paymentMethod,
        saleType,
        deliveryFee,
        globalDiscount,
        subtotal,
        total: money.add(cartTotal, deliveryFee),
        language: (language as 'EN' | 'AR') || 'EN',
        deliveryEmployeeId: isDelivery ? deliveryEmployeeId : undefined,
        status: (isPending ? 'pending' : isDelivery ? (deliveryEmployeeId ? 'with_delivery' : 'pending') : 'completed') as Sale['status'],
        processingTimeMinutes,
        date: getVerifiedDate(),
        branchId: activeBranchId,
      };

      const salePayload = buildSalePayload(saleParams);

      const success = await onCompleteSale(salePayload);

      if (success === false) {
        console.warn('[POS] Checkout failed. Cart preserved.');
        return;
      }

      setIsCheckoutMode(false);
      setIsDeliveryMode(false);
      setAmountPaid('');
      playSuccess();

      addNotification({
        messageKey: 'saleComplete',
        messageParams: { total: formatCurrency(money.add(cartTotal, deliveryFee)) },
        type: 'success',
      });

      // Immediate UI transition: remove tab as soon as sale is recorded
      removeTab(activeTabId);

      try {
        const opts = getActiveReceiptSettings();
        const shouldPrint = (isDelivery && opts.autoPrintOnDelivery) || opts.autoPrintOnComplete;

        if (shouldPrint) {
          const html = generateInvoiceHTML(salePayload, opts);
          const printerSettings = getPrinterSettings();
          const shouldTrySilent = printerSettings.enabled && printerSettings.silentMode !== 'off';

          if (shouldTrySilent) {
            (async () => {
              try {
                const silentPrinted = await printReceiptSilently(html);
                if (silentPrinted) return;
              } catch (silentErr) {
                if (printerSettings.silentMode !== 'fallback') return;
              }
              const printWindow = window.open('', '_blank', 'width=400,height=600');
              if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
              }
            })();
          } else {
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
            }
          }
        }
      } catch (e) {
        console.error('Auto-print failed:', e);
      }

      } finally {
        setIsProcessing(false);
      }
    },
    [
      showToastError,
      isValidOrder,
      deliveryEmployeeId,
      t.selectDriver,
      addNotification,
      cartTotal,
      activeTab,
      onCompleteSale,
      cart,
      customerName,
      customerCode,
      selectedCustomer,
      language,
      paymentMethod,
      globalDiscount,
      subtotal,
      getVerifiedDate,
      removeTab,
      activeTabId,
      playSuccess,
      isProcessing,
    ]
  );

  useEffect(() => {
    const handleAltS = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'س')) {
        e.preventDefault();
        if (isValidOrder) {
          handleCheckout('walk-in');
        }
      }
    };
    window.addEventListener('keydown', handleAltS);
    return () => window.removeEventListener('keydown', handleAltS);
  }, [isValidOrder, handleCheckout]);

  return {
    paymentMethod,
    setPaymentMethod,
    deliveryEmployeeId,
    setDeliveryEmployeeId,
    showDeliveryModal,
    setShowDeliveryModal,
    isCheckoutMode,
    setIsCheckoutMode,
    isDeliveryMode,
    setIsDeliveryMode,
    amountPaid,
    setAmountPaid,
    handleCheckout,
    isValidOrder,
    isProcessing,
  };
};
