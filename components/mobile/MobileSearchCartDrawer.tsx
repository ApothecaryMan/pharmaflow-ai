import type React from 'react';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { pricingService } from '../../services/sales/pricingService';
import type { CartItem, Drug } from '../../types';
import { POSCartSidebar, type POSCartSidebarProps } from '../sales/pos/ui/POSCartSidebar';

interface MobileSearchCartDrawerProps extends Partial<POSCartSidebarProps> {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  onRemove: (id: string, isUnit: boolean) => void;
  /** الإجمالي بعد خصومات الأصناف */
  total: number;
  /** الإجمالي قبل أي خصم */
  grossSubtotal?: number;
  totalItems: number;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  toggleUnitMode: (id: string, currentIsUnit: boolean) => void;
  showMenu: (clientX: number, clientY: number, items: unknown[]) => void;
  batchesMap: Map<string, Drug[]>;
  switchBatchWithAutoSplit: (
    currentItem: CartItem,
    newBatch: Drug,
    packQty: number,
    unitQty: number
  ) => void;
  addToCart: (drug: Drug, isUnit?: boolean, quantity?: number) => void;
  removeDrugFromCart: (id: string) => void;
  /** مسح العربة بالكامل بعد إتمام البيع */
  onClearCart?: () => void;
}

export const MobileSearchCartDrawer: React.FC<MobileSearchCartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemove,
  total,
  grossSubtotal,
  totalItems,
  updateItemDiscount,
  toggleUnitMode,
  showMenu,
  batchesMap,
  switchBatchWithAutoSplit,
  addToCart,
  removeDrugFromCart,
  onClearCart,
  t,
}) => {
  const { employees } = useData();
  const { language } = useSettings();

  // --- Local checkout state ---
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');

  if (!isOpen || !t) return null;

  // الإجمالي قبل الخصم (ممرر من الوالد أو محسوب هنا)
  const orderTotals = pricingService.calculateOrderTotals(cart, 0);
  const rawSubtotal = grossSubtotal ?? orderTotals.grossSubtotal;

  // Grouping logic for POSCartSidebar
  const mergedIds = Array.from(new Set(cart.map((i) => i.id)));
  const mergedCartItems = mergedIds.map((id) => {
    const items = cart.filter((i) => i.id === id);
    const pack = items.find((i) => !i.isUnit);
    const unit = items.find((i) => i.isUnit);
    const common = pack || unit;
    return {
      id,
      common,
      pack,
      unit,
    };
  });

  const handleCheckout = () => {
    // في هذا السياق (عربة البحث المتنقلة) نقوم فقط بالغلق ومسح العربة
    // يمكن تطوير هذا لاحقاً ليرتبط بـ DataContext.addSale
    setIsCheckoutMode(false);
    setIsDeliveryMode(false);
    setAmountPaid('');
    onClearCart?.();
    onClose();
  };

  // Mapping required props for POSCartSidebar correctly to avoid type assertions
  const sidebarProps: POSCartSidebarProps = {
    mobileTab: 'cart',
    setMobileTab: (tab: 'products' | 'cart') => {
      if (tab === 'products') onClose();
    },
    cart: cart,
    totalItems: totalItems,
    t: t,
    // cartTotal = الإجمالي بعد خصومات الأصناف (الصحيح للعرض)
    cartTotal: total,
    sidebarWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
    startResizing: () => {},
    sidebarRef: { current: null },
    cartSensors: [],
    handleCartDragEnd: () => {},
    mergedCartItems,
    highlightedItemId: null,
    setHighlightedItemId: () => {},
    color: 'var(--primary-600)',
    showMenu,
    removeFromCart: onRemove,
    toggleUnitMode,
    updateItemDiscount,
    setGlobalDiscount: () => {},
    updateQuantity: onUpdateQuantity,
    addToCart,
    removeDrugFromCart,
    batchesMap,
    switchBatchWithAutoSplit,
    currentLang: language.toLowerCase(),
    globalDiscount: 0,
    setSearch: () => {},
    searchInputRef: { current: null },
    // grossSubtotal = الإجمالي قبل الخصم - يظهر السطر الفرعي فقط إذا اختلف عن cartTotal
    grossSubtotal: rawSubtotal,
    orderDiscountPercent: 0,
    hasOpenShift: true,
    // Local checkout state - يُمرَّر لـ POSCartSidebar ليتحكم في عرض واجهة الدفع
    isCheckoutMode,
    setIsCheckoutMode: (val: boolean) => {
      setIsCheckoutMode(val);
      if (!val) setAmountPaid('');
    },
    isDeliveryMode,
    setIsDeliveryMode: (val: boolean) => {
      setIsDeliveryMode(val);
    },
    amountPaid,
    setAmountPaid,
    isValidOrder: cart.length > 0,
    handleCheckout,
    deliveryEmployeeId: '',
    setDeliveryEmployeeId: () => {},
    employees: employees || [],
    isRTL: language === 'AR',
    paymentMethod: 'cash',
    isMobile: true,
    isProcessing: false,
    taxAmount: 0,
    isLoading: false,
    deliveryFee: 0,
    setDeliveryFee: () => {},
  };

  return (
    <div className='fixed inset-0 z-[250] flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in'>
      <div className='mt-auto bg-white dark:bg-[#06080F] rounded-t-3xl h-[85vh] overflow-hidden flex flex-col animate-slide-up'>
        <POSCartSidebar {...sidebarProps} />
      </div>
    </div>
  );
};
