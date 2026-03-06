import React, { useState } from 'react';
import { POSCartSidebar, type POSCartSidebarProps } from '../sales/pos/ui/POSCartSidebar';
import { useData } from '../../services/DataContext';
import { useSettings } from '../../context/SettingsContext';

interface MobileSearchCartDrawerProps extends Partial<POSCartSidebarProps> {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  onUpdateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  onRemove: (id: string, isUnit: boolean) => void;
  /** الإجمالي بعد خصومات الأصناف */
  total: number;
  /** الإجمالي قبل أي خصم */
  grossSubtotal?: number;
  totalItems: number;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  toggleUnitMode: (id: string, currentIsUnit: boolean) => void;
  showMenu: any;
  batchesMap: Map<string, any[]>;
  switchBatchWithAutoSplit: (currentItem: any, newBatch: any, packQty: number, unitQty: number) => void;
  addToCart: (drug: any, isUnit?: boolean, quantity?: number) => void;
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
}) => {
  const { employees } = useData();
  const { language } = useSettings();

  // --- Local checkout state ---
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');

  if (!isOpen) return null;

  // الإجمالي قبل الخصم (ممرر من الوالد أو محسوب هنا)
  const rawSubtotal = grossSubtotal ?? cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Grouping logic for POSCartSidebar
  const mergedIds = Array.from(new Set(cart.map(i => i.id)));
  const mergedCartItems = mergedIds.map(id => {
    const items = cart.filter(i => i.id === id);
    const pack = items.find(i => !i.isUnit);
    const unit = items.find(i => i.isUnit);
    const common = pack || unit;
    return {
      id,
      common,
      pack,
      unit
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

  // Mocking required props for POSCartSidebar while keeping it simple
  const sidebarProps: any = {
    mobileTab: 'cart',
    setMobileTab: (tab: string) => tab === 'products' && onClose(),
    cart: cart,
    totalItems: totalItems,
    t: { 
      cartTitle: language === 'AR' ? 'عربة البحث' : 'Search Cart',
      items: language === 'AR' ? 'أصناف' : 'items',
      quantity: language === 'AR' ? 'قطعة' : 'qty',
      emptyCart: language === 'AR' ? 'العربة فارغة' : 'Empty Cart',
      viewCart: language === 'AR' ? 'عرض العربة' : 'View Cart',
      total: language === 'AR' ? 'الإجمالي' : 'Total',
      subtotal: language === 'AR' ? 'المجموع الفرعي' : 'Subtotal',
      orderDiscount: language === 'AR' ? 'خصم إضافي' : 'Order Discount',
      completeOrder: language === 'AR' ? 'إتمام' : 'Done',
      remainder: language === 'AR' ? 'الباقي' : 'Change',
      noOpenShift: language === 'AR' ? 'لا يوجد وردية مفتوحة' : 'No open shift',
    },
    // cartTotal = الإجمالي بعد خصومات الأصناف (الصحيح للعرض)
    cartTotal: total,
    sidebarWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
    startResizing: () => {},
    sidebarRef: { current: null },
    cartSensors: [],
    handleCartDragEnd: () => {},
    mergedCartItems,
    highlightedIndex: -1,
    setHighlightedIndex: () => {},
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
    userRole: 'pharmacist',
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
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="mt-auto bg-white dark:bg-[#06080F] rounded-t-3xl h-[85vh] overflow-hidden flex flex-col animate-slide-up">
            <POSCartSidebar {...sidebarProps} />
        </div>
    </div>
  );
};
