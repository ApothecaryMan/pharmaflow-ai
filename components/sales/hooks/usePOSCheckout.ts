import { useState, useCallback, useEffect } from 'react';
import { canPerformAction, type UserRole } from '../../../config/permissions';
import { getLocationName } from '../../../data/locations';
import type { CartItem, Customer, Sale } from '../../../types';
import { generateInvoiceHTML, getActiveReceiptSettings } from '../InvoiceTemplate';
import { getPrinterSettings, printReceiptSilently } from '../../../utils/qzPrinter';

interface UsePOSCheckoutProps {
  cart: CartItem[];
  mergedCartItems: any[];
  userRole: UserRole;
  showToastError: (msg: string) => void;
  addNotification: (notification: any) => void;
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
}

export const usePOSCheckout = ({
  cart,
  mergedCartItems,
  userRole,
  showToastError,
  addNotification,
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
}: UsePOSCheckoutProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa'>('cash');
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState<string>('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');

  const isValidOrder =
    cart.length > 0 &&
    mergedCartItems.every((item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0);

  const handleCheckout = useCallback(
    async (saleType: 'walk-in' | 'delivery' = 'walk-in', isPending: boolean = false) => {
      if (!canPerformAction(userRole, 'sale.create')) {
        showToastError('Permission Denied: Cannot perform checkout');
        return;
      }
      if (!isValidOrder) return;

      let deliveryFee = 0;
      if (saleType === 'delivery') {
        deliveryFee = 5;
      }

      if (saleType === 'delivery' && !deliveryEmployeeId && !isPending) {
        alert(t.selectDriver || 'Please select a delivery man');
        return;
      }

      addNotification({
        messageKey: 'saleComplete',
        messageParams: { total: cartTotal.toFixed(2) },
        type: 'success',
      });

      let processingTimeMinutes: number | undefined;
      const startTime = activeTab?.firstItemAt || activeTab?.createdAt;

      if (startTime) {
        const rawMinutes = Math.round((Date.now() - startTime) / 6000) / 10;
        processingTimeMinutes = Math.max(0.1, Math.min(rawMinutes, 60));
      }

      const success = await onCompleteSale({
        items: cart,
        customerName: customerName || 'Guest Customer',
        customerCode,
        customerPhone: selectedCustomer?.phone,
        customerAddress: selectedCustomer
          ? [
              selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', language as 'EN' | 'AR') : '',
              selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', language as 'EN' | 'AR') : '',
              selectedCustomer.governorate ? getLocationName(selectedCustomer.governorate, 'gov', language as 'EN' | 'AR') : '',
            ]
              .filter(Boolean)
              .join(', ')
          : undefined,
        customerStreetAddress: selectedCustomer?.streetAddress,
        paymentMethod,
        saleType,
        deliveryFee,
        globalDiscount,
        subtotal,
        total: cartTotal + deliveryFee,
        deliveryEmployeeId: saleType === 'delivery' ? deliveryEmployeeId : undefined,
        status: isPending
          ? 'pending'
          : saleType === 'delivery'
            ? deliveryEmployeeId
              ? 'with_delivery'
              : 'pending'
            : 'completed',
        processingTimeMinutes,
      });

      if (success === false) {
        console.warn('[POS] Checkout failed. Cart preserved.');
        return;
      }

      try {
        const opts = getActiveReceiptSettings();
        const isDelivery = saleType === 'delivery';
        const shouldPrint = (isDelivery && opts.autoPrintOnDelivery) || opts.autoPrintOnComplete;

        if (shouldPrint) {
          const verifiedDate = getVerifiedDate();
          const mockSale: Sale = {
            id: 'TRX-' + verifiedDate.getTime().toString().slice(-6),
            date: verifiedDate.toISOString(),
            dailyOrderNumber: 0,
            items: cart,
            subtotal,
            globalDiscount,
            total: cartTotal + deliveryFee,
            paymentMethod,
            saleType,
            deliveryFee,
            status: 'completed',
            customerName: customerName || 'Guest Customer',
            customerCode,
            customerPhone: selectedCustomer?.phone,
            customerAddress: selectedCustomer
              ? [
                  selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', language as 'EN' | 'AR') : '',
                  selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', language as 'EN' | 'AR') : '',
                  selectedCustomer.governorate ? getLocationName(selectedCustomer.governorate, 'gov', language as 'EN' | 'AR') : '',
                ]
                  .filter(Boolean)
                  .join(', ')
              : undefined,
            customerStreetAddress: selectedCustomer?.streetAddress,
          };

          const html = generateInvoiceHTML(mockSale, opts);
          const printerSettings = getPrinterSettings();
          const shouldTrySilent = printerSettings.enabled && printerSettings.silentMode !== 'off';

          if (shouldTrySilent) {
            (async () => {
              try {
                const silentPrinted = await printReceiptSilently(html);
                if (silentPrinted) {
                  return;
                }
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

      removeTab(activeTabId);
    },
    [
      userRole,
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
  };
};
