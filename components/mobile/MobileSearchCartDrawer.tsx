import React from 'react';
import { POSCartSidebar, type POSCartSidebarProps } from '../sales/pos/ui/POSCartSidebar';
import { useData } from '../../services/DataContext';
import { useSettings } from '../../context/SettingsContext';

interface MobileSearchCartDrawerProps extends Partial<POSCartSidebarProps> {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  onUpdateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  onRemove: (id: string, isUnit: boolean) => void;
  total: number;
  totalItems: number;
}

export const MobileSearchCartDrawer: React.FC<MobileSearchCartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemove,
  total,
  totalItems,
}) => {
  const { employees } = useData();
  const { language } = useSettings();

  if (!isOpen) return null;

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
      completeOrder: language === 'AR' ? 'إتمام' : 'Done',
    },
    cartTotal: total,
    sidebarWidth: window.innerWidth,
    startResizing: () => {},
    sidebarRef: { current: null },
    cartSensors: [],
    handleCartDragEnd: () => {},
    mergedCartItems: cart.map(item => ({
      id: item.id,
      common: item,
      pack: !item.isUnit ? item : null,
      unit: item.isUnit ? item : null,
    })),
    highlightedIndex: -1,
    setHighlightedIndex: () => {},
    color: 'var(--primary-600)',
    showMenu: () => {},
    removeFromCart: onRemove,
    toggleUnitMode: () => {},
    updateItemDiscount: () => {},
    setGlobalDiscount: () => {},
    updateQuantity: onUpdateQuantity,
    addToCart: () => {},
    removeDrugFromCart: () => {},
    batchesMap: new Map(),
    switchBatchWithAutoSplit: () => {},
    currentLang: language.toLowerCase(),
    globalDiscount: 0,
    setSearch: () => {},
    searchInputRef: { current: null },
    userRole: 'pharmacist',
    grossSubtotal: total,
    orderDiscountPercent: 0,
    hasOpenShift: true,
    isCheckoutMode: false,
    setIsCheckoutMode: () => {},
    isDeliveryMode: false,
    setIsDeliveryMode: () => {},
    amountPaid: '',
    setAmountPaid: () => {},
    isValidOrder: true,
    handleCheckout: () => onClose(),
    deliveryEmployeeId: '',
    setDeliveryEmployeeId: () => {},
    employees: employees || [],
    isRTL: language === 'AR',
    paymentMethod: 'cash',
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="mt-auto bg-white dark:bg-[#06080F] rounded-t-3xl h-[85vh] overflow-hidden flex flex-col animate-slide-up">
            <POSCartSidebar {...sidebarProps} />
        </div>
    </div>
  );
};
