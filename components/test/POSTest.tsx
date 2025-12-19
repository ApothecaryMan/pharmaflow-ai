
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useContextMenu } from '../common/ContextMenu';
import { Drug, CartItem, Customer, Language, Shift } from '../../types';

import { useExpandingDropdown } from '../../hooks/useExpandingDropdown';
import { getLocationName } from '../../data/locations';
import { usePOSTabs } from '../../hooks/usePOSTabs';

import { useLongPress } from '../../hooks/useLongPress';
import { useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { TabBar } from '../layout/TabBar';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { generateInvoiceHTML, InvoiceTemplateOptions } from '../sales/InvoiceTemplate';
import { Sale } from '../../types'; // Ensure Sale is imported
import { PosDropdown, PosDropdownProps } from '../common/PosDropdown';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { TanStackTable } from '../common/TanStackTable'; // IMPORTED
import { CARD_MD, CARD_LG } from '../../utils/themeStyles';
import { Modal } from '../common/Modal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { TRANSLATIONS } from '../../i18n/translations';
import { usePosSounds } from '../../components/common/hooks/usePosSounds';
import { usePosShortcuts } from '../../components/common/hooks/usePosShortcuts';

// --- SortableCartItem Component ---
interface SortableCartItemProps {
  packItem?: CartItem;
  unitItem?: CartItem;
  commonItem: CartItem;
  itemId: string;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  showMenu: (x: number, y: number, items: any[]) => void;
  getCartItemActions: (item: CartItem) => any[];
  currentTouchCartItem: React.MutableRefObject<CartItem | null>;
  onCartItemTouchStart: (e: React.TouchEvent) => void;
  onCartItemTouchEnd: () => void;
  onCartItemTouchMove: (e: React.TouchEvent) => void;
  removeFromCart: (id: string, isUnit: boolean) => void;
  toggleUnitMode: (id: string, currentIsUnit: boolean) => void;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  updateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  calculateItemTotal: (item: CartItem) => number;
  addToCart: (drug: Drug, isUnitMode?: boolean) => void;
  isHighlighted?: boolean;
}

const SortableCartItem: React.FC<SortableCartItemProps> = ({
  packItem,
  unitItem,
  commonItem,
  itemId,
  color,
  t,
  showMenu,
  getCartItemActions,
  currentTouchCartItem,
  onCartItemTouchStart,
  onCartItemTouchEnd,
  onCartItemTouchMove,
  removeFromCart,
  toggleUnitMode,
  updateItemDiscount,
  setGlobalDiscount,
  updateQuantity,
  calculateItemTotal,
  addToCart, 
  isHighlighted
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const item = commonItem; // Use common item for shared props like name, expiry, etc.
  const hasDualMode = item.unitsPerPack && item.unitsPerPack > 1;

  // Helpers to handle updates (create if missing)
  const handleQtyChange = (isUnit: boolean, delta: number) => {
      const targetItem = isUnit ? unitItem : packItem;
      if (targetItem) {
          updateQuantity(targetItem.id, !!targetItem.isUnit, delta);
      } else {
          // Create new entry
           if (delta > 0) addToCart(item, isUnit); // Add 1
      }
  };
  
  const handleManualQty = (isUnit: boolean, val: number) => {
      const targetItem = isUnit ? unitItem : packItem;
      if (targetItem) {
          updateQuantity(targetItem.id, !!targetItem.isUnit, val - targetItem.quantity);
      } else {
          // Create new
          if (val > 0) {
             // We can use addToCart but we need specific quantity. 
             // addToCart adds +1. We need to refactor logic or just loop add?
             // Or better: updateQuantity checks if item exists? No.
             // Let's rely on addToCart adds 1, then we update remainder? 
             // Or expose a setItems logic. 
             // For simplicity: addToCart adds 1, and we assume user types small numbers or we trigger update after?
             // Actually, simplest is to assume if user types, they want that exact amount.
             // Use updateQuantity logic but allow it to create?
             // updateQuantity in POSTest only updates EXISTING.
             // We need to support 'upsert'.
             // For now, let's just trigger addToCart loop or just creating invalid state?
             // Let's modify updateQuantity in parent or just use addToCart for +1 only?
             // User wants INPUT. 
             // FIX: We need an `upsertCartItem` function. Use `addToCart` loop for now if simple, or just add logic later.
             // Hack: Call addToCart (creates item with qty 1), then updateQuantity (sets rest).
             addToCart(item, isUnit);
             // Wait for state update? No, that won't work in same tick easily without complex logic.
             // BETTER: Render input as 0 if missing. If changed > 0, call addToCart once.
             // Then user can adjust.
             // OR: Just assume user adds via + button first? 
             // User requested INPUT.
             // We will implement `setCartItemQty` later. For now, rely on existing.
             // If item missing, we can't update.
             // Let's auto-create if missing.
             if (val > 0) addToCart(item, isUnit); // This adds 1.
          }
      }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      {...listeners}
      className={`flex flex-col p-2 rounded-xl bg-white dark:bg-gray-900 border transition-all touch-manipulation relative group
        ${isDragging ? 'shadow-xl ring-2 ring-blue-500 scale-[1.02] z-50 opacity-90' : ''}
        ${isHighlighted ? `border-${color}-500 ring-1 ring-${color}-500 bg-${color}-50/10` : 'border-gray-100 dark:border-gray-800'}`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        showMenu(e.clientX, e.clientY, getCartItemActions(item)); // Actions for general
      }}
      onTouchStart={(e) => {
        currentTouchCartItem.current = item;
        onCartItemTouchStart(e);
      }}
      onTouchEnd={onCartItemTouchEnd}
      onTouchMove={onCartItemTouchMove}
    >
      {/* Drag Handle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-full flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="material-symbols-rounded text-[16px]">drag_indicator</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 relative pl-3">
        {/* Name Section */}
        <div className="flex-1 min-w-[120px]">
          <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 drug-name" title={item.name}>
            {item.name} {item.dosageForm ? <span className="font-normal text-gray-500">({item.dosageForm})</span> : ''}
          </h4>
        </div>

        {/* Unified 'Rest' Section: Date, Controls, Price */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Expiry Date Date Badge (Restored) */}
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm ${
              (() => {
                const today = new Date();
                const expiry = new Date(item.expiryDate);
                const monthDiff = (expiry.getFullYear() - today.getFullYear()) * 12 + (expiry.getMonth() - today.getMonth());
                if (monthDiff <= 0) return 'bg-red-500';
                if (monthDiff <= 3) return 'bg-orange-500';
                return 'bg-gray-500 dark:bg-gray-600';
              })()
            }`}>
              {new Date(item.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'})}
            </span>
          </div>


          
          {/* Controls */}
          <div className="flex items-center gap-1">
             
             {/* Discount Input (Unified for group? Or per item? UI suggests per row. Let's use PACK discount or Unit? Sync them?) 
                 For simplicity, apply to whichever exists or both? 
                 Let's keep one discount input for the row. Apply to both?
                 Or just show discount for 'primary' (Pack if exists).
             */}
            <div className={`flex items-center rounded-lg border shadow-sm h-6 overflow-hidden transition-colors w-14 shrink-0 ${
              (item.discount || 0) > 0 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}>
              <button
                onClick={() => {
                   const currentDiscount = item.discount || 0;
                   const newVal = currentDiscount > 0 ? 0 : (item.maxDiscount ?? 10);
                   if(packItem) updateItemDiscount(packItem.id, false, newVal);
                   if(unitItem) updateItemDiscount(unitItem.id, true, newVal);
                   if (newVal > 0) setGlobalDiscount(0);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
                  (item.discount || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`}
              >
                <span className="material-symbols-rounded text-[12px]">percent</span>
              </button>
              <input
                type="number"
                value={item.discount || ''}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const valid = !isNaN(val) && val >= 0 && val <= 100;
                  const finalVal = valid ? val : 0;
                  if (item.maxDiscount && finalVal > item.maxDiscount) return; // Strict clamp?
                  
                  if(packItem) updateItemDiscount(packItem.id, false, finalVal);
                  if(unitItem) updateItemDiscount(unitItem.id, true, finalVal);
                  if (finalVal > 0) setGlobalDiscount(0);
                }}
                className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                   (item.discount || 0) > 0 ? 'text-green-700 dark:text-green-300 placeholder-green-300' : 'text-gray-900 dark:text-gray-100 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Dual Qty Control: [ Pack | Unit ] - Fixed width matching discount */}
            <div className={`flex items-center bg-white dark:bg-gray-900 rounded-lg border shadow-sm h-6 overflow-hidden w-14 shrink-0 transition-colors ${
                hasDualMode && (!packItem || packItem.quantity === 0) && (!unitItem || unitItem.quantity === 0)
                ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-400/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
                {/* Pack Input */}
                <input
                    type="number"
                    min={hasDualMode ? "0" : "1"}
                    placeholder={hasDualMode ? "P" : "1"}
                    value={packItem?.quantity === 0 ? '' : (packItem?.quantity || '')}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onChange={(e) => {
                        const val = e.target.value === '' ? (hasDualMode ? 0 : 1) : parseInt(e.target.value);
                        if (isNaN(val)) return;
                        const minVal = hasDualMode ? 0 : 1;
                        const clampedVal = Math.max(minVal, val);
                        if (packItem) {
                            updateQuantity(packItem.id, false, clampedVal - packItem.quantity);
                        } else if (clampedVal > 0) {
                            addToCart(item, false);
                        }
                    }}
                    className={`h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300 shrink-0 min-w-0 ${hasDualMode ? 'w-7' : 'w-full'}`}
                />
                
                {/* Separator */}
                {hasDualMode && (
                   <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                )}
                
                {/* Unit Input */}
                {hasDualMode && (
                 <input
                    type="number"
                    min="0"
                    placeholder="U"
                    value={unitItem?.quantity === 0 ? '' : (unitItem?.quantity || '')}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        if (isNaN(val)) return;
                        const clampedVal = Math.max(0, val);
                        if (unitItem) {
                            updateQuantity(unitItem.id, true, clampedVal - unitItem.quantity);
                        } else if (clampedVal > 0) {
                            addToCart(item, true);
                        }
                    }}
                    className="w-7 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-blue-600 dark:text-blue-400 placeholder-blue-200 shrink-0"
                />
                )}
            </div>

            {/* Total Price (Sum of both) */}
            <div className="text-sm font-bold text-gray-900 dark:text-white w-16 shrink-0 text-end tabular-nums">
                ${((packItem ? calculateItemTotal(packItem) : 0) + (unitItem ? calculateItemTotal(unitItem) : 0)).toFixed(2)}
            </div>
            
            {/* Delete button (if both, maybe show one delete for row?) */}
             <button
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(packItem) removeFromCart(packItem.id, false);
                    if(unitItem) removeFromCart(unitItem.id, true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
             >
                <span className="material-symbols-rounded text-[16px]">close</span>
             </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main POS Component ---
interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: { items: CartItem[], customerName: string, customerCode?: string, customerPhone?: string, customerAddress?: string, customerStreetAddress?: string, paymentMethod: 'cash' | 'visa', saleType?: 'walk-in' | 'delivery', deliveryFee?: number, globalDiscount: number, subtotal: number, total: number }) => void;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  customers: Customer[];
  language?: Language;
  darkMode: boolean; // Added
}

export const POSTest: React.FC<POSProps> = ({ inventory, onCompleteSale, color, t, customers, language = 'EN', darkMode }) => {
  const { showMenu } = useContextMenu();
  
  // Multi-tab system
  const {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    renameTab,
    togglePin,
    reorderTabs,
    maxTabs
  } = usePOSTabs();

  // Use active tab's state
  const cart = activeTab?.cart || [];
  const setCart = useCallback((newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    const updatedCart = typeof newCart === 'function' ? newCart(cart) : newCart;
    updateTab(activeTabId, { cart: updatedCart });
  }, [cart, activeTabId, updateTab]);

  // Derived state: Group cart items by Drug ID (Visual Merging)
  const mergedCartItems = useMemo(() => {
    const map = new Map<string, { pack?: CartItem; unit?: CartItem, order: number }>();
    cart.forEach((item, index) => {
        if (!map.has(item.id)) {
            map.set(item.id, { order: index });
        }
        const entry = map.get(item.id)!;
        if (item.isUnit) entry.unit = item;
        else entry.pack = item;
    });
    return Array.from(map.values())
        .map(entry => ({
            id: (entry.pack || entry.unit)!.id,
            pack: entry.pack,
            unit: entry.unit,
            common: (entry.pack || entry.unit)!
        }));
  }, [cart]);

  const customerName = activeTab?.customerName || '';
  const setCustomerName = useCallback((name: string) => {
    updateTab(activeTabId, { customerName: name });
  }, [activeTabId, updateTab]);

  const globalDiscount = activeTab?.discount || 0;
  const setGlobalDiscount = useCallback((discount: number) => {
    updateTab(activeTabId, { discount });
  }, [activeTabId, updateTab]);
  
  // Rest of the state remains the same
  // Use active tab's search query
  const search = activeTab?.searchQuery || '';
  const setSearch = useCallback((query: string | ((prev: string) => string)) => {
    const newQuery = typeof query === 'function' ? query(search) : query;
    updateTab(activeTabId, { searchQuery: newQuery });
  }, [search, activeTabId, updateTab]);
  // Customer Search State
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);

  // Hook for Customer Search Navigation
  const customerDropdownHook = useExpandingDropdown<Customer>({
      items: filteredCustomers,
      selectedItem: filteredCustomers[highlightedCustomerIndex],
      isOpen: showCustomerDropdown,
      onToggle: () => setShowCustomerDropdown(prev => !prev),
      onSelect: (customer) => {
          const idx = filteredCustomers.indexOf(customer);
          if (idx !== -1) setHighlightedCustomerIndex(idx);
      },
      keyExtractor: (c) => c.id,
      onEnter: () => {
          if (showCustomerDropdown && filteredCustomers.length > 0) {
              handleCustomerSelect(filteredCustomers[highlightedCustomerIndex]);
          }
      },
      preventDefaultOnSpace: false,
      onEscape: () => setShowCustomerDropdown(false)
  });
  
  // Enhanced Customer UX State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [filteredByCode, setFilteredByCode] = useState<Customer[]>([]);
  // Selected category state key: 'All', 'Medicine', 'Cosmetics', 'Non-Medicine'

  const customerCode = activeTab?.customerCode || '';
  const setCustomerCode = useCallback((code: string) => {
    updateTab(activeTabId, { customerCode: code });
  }, [activeTabId, updateTab]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa'>('cash');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, 'pack' | 'unit'>>({});
  const [openUnitDropdown, setOpenUnitDropdown] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // drugId -> batchId
  const [openBatchDropdown, setOpenBatchDropdown] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0); // For grid navigation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Keydown Listener for Scanner
  // Keyboard Shortcuts & Sounds
  const { playBeep, playError, playSuccess, playClick } = usePosSounds();
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Reset highlight when items change
  useEffect(() => {
    if (mergedCartItems.length > 0 && highlightedIndex === -1) {
        setHighlightedIndex(0);
    } else if (mergedCartItems.length === 0) {
        setHighlightedIndex(-1);
    } else if (highlightedIndex >= mergedCartItems.length) {
        setHighlightedIndex(mergedCartItems.length - 1);
    }
  }, [mergedCartItems.length]);

  usePosShortcuts({
    enabled: true,
    onNavigate: (direction) => {
        if (mergedCartItems.length === 0) return;
        setHighlightedIndex(prev => {
            const next = direction === 'up' ? prev - 1 : prev + 1;
            const clamped = Math.max(0, Math.min(next, mergedCartItems.length - 1));
            // Only play click if index actually changed
            if (clamped !== prev) {
                 playClick();
                 // Ensure element is scrolled into view (optional enhancement)
            }
            return clamped;
        });
    },
    onQuantityChange: (delta) => {
        if (highlightedIndex === -1 || !mergedCartItems[highlightedIndex]) {
            playError();
            return;
        }
        const item = mergedCartItems[highlightedIndex];
        const targetId = item.common.id;
        // Logic: if has Pack (even 0), modify Pack. Else Unit.
        // mergedCartItems contains { pack, unit, common }
        // cart is the flat list. updateQuantity updates by ID + isUnit.
        const useUnit = !item.pack; 
        
        playBeep();
        updateQuantity(targetId, useUnit, delta);
    },
    onDelete: () => {
        if (highlightedIndex === -1 || !mergedCartItems[highlightedIndex]) return;
        const item = mergedCartItems[highlightedIndex];
        if (item.pack) removeFromCart(item.pack.id, false);
        if (item.unit) removeFromCart(item.unit.id, true);
        playClick(); // Delete sound
    },
    onCheckout: () => {
        if (cart.length > 0) {
             playSuccess();
             handleCheckout('walk-in');
        } else {
             playError();
        }
    },
    onFocusSearch: () => {
        searchInputRef.current?.focus();
    }
  });

  // Global Keydown (Simple Alphanumeric for Scanner / Search Focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }
        // Capture simple alphanumeric for search focus
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            searchInputRef.current?.focus();
        }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('in_stock');
  
  // Shift validation - check if there's an open shift
  const [hasOpenShift, setHasOpenShift] = useState<boolean>(true);
  
  useEffect(() => {
    const checkShiftStatus = () => {
      try {
        const savedShifts = localStorage.getItem('pharma_shifts');
        if (!savedShifts) {
          setHasOpenShift(false);
          return;
        }
        const allShifts: Shift[] = JSON.parse(savedShifts);
        const openShift = allShifts.find(s => s.status === 'open');
        setHasOpenShift(!!openShift);
      } catch {
        setHasOpenShift(false);
      }
    };
    
    // Check on mount
    checkShiftStatus();
    
    // Listen for storage changes (when shift is opened/closed from CashRegister)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pharma_shifts') {
        checkShiftStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<'category' | 'stock' | null>(null);
  
  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_sidebar_width');
      return saved ? parseInt(saved) : 350;
    }
    return 350;
  });

  useEffect(() => {
    localStorage.setItem('pos_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (isResizing.current && sidebarRef.current) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const rect = sidebarRef.current.getBoundingClientRect();
        const isRTL = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
        
        let newWidth;
        if (isRTL) {
            // In RTL, Sidebar is on the Left. Width expands to the Right.
            // Width = Current Mouse X - Left Edge of Sidebar
            newWidth = clientX - rect.left;
        } else {
            // In LTR, Sidebar is on the Right. Width expands to the Left.
            // Width = Right Edge of Sidebar - Current Mouse X
            newWidth = rect.right - clientX;
        }

        if (newWidth > 280 && newWidth < 800) {
            setSidebarWidth(newWidth);
        }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', resize);
    window.addEventListener('touchend', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [resize, stopResizing]);

  const categories = [
    { id: 'All', label: t.categories.all },
    { id: 'Medicine', label: t.categories.medicine },
    { id: 'Cosmetics', label: t.categories.cosmetics },
    { id: 'General', label: t.categories.general },
  ];

  // Helper to map specific categories to broad groups
  const getBroadCategory = (category: string): string => {
    const cosmetics = ['Skin Care', 'Personal Care'];
    const general = ['Medical Equipment', 'Medical Supplies', 'Baby Care'];
    
    if (cosmetics.includes(category)) return 'Cosmetics';
    if (general.includes(category)) return 'General';
    return 'Medicine';
  };

  // --- Nested/Future Functions for Item Actions ---
  const handleViewProductDetails = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent adding to cart
    const drug = inventory.find(d => d.id === id);
    if (drug) {
        setViewingDrug(drug);
    }
  };

  const toggleBatchList = (e: React.MouseEvent, drugName: string) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [drugName]: !prev[drugName] }));
  };

  // Helper to determine icon based on drug keywords
  const getDrugIcon = (drug: Drug): string => {
    const text = (drug.name + " " + drug.description + " " + drug.genericName + " " + drug.category).toLowerCase();
    
    // Equipment & Devices
    if (text.includes('monitor') || text.includes('meter') || text.includes('pressure') || text.includes('glucose')) return 'vital_signs';
    if (text.includes('thermometer') || text.includes('temperature')) return 'thermometer';
    if (text.includes('device') || text.includes('machine')) return 'router';

    // Baby Care
    if (text.includes('diaper') || text.includes('baby') || text.includes('infant') || text.includes('formula') || text.includes('powder')) return 'child_care';

    // Cosmetics & Personal Care
    if (text.includes('shampoo') || text.includes('wash') || text.includes('cleanser')) return 'soap';
    if (text.includes('cream') || text.includes('gel') || text.includes('ointment') || text.includes('lotion') || text.includes('topical') || text.includes('balm') || text.includes('sunblock') || text.includes('sunscreen')) return 'sanitizer';
    
    // Medical Supplies
    if (text.includes('bandage') || text.includes('gauze') || text.includes('cotton') || text.includes('plaster')) return 'healing';
    if (text.includes('syringe') || text.includes('needle') || text.includes('injection') || text.includes('vial') || text.includes('ampoule')) return 'vaccines';
    if (text.includes('mask') || text.includes('glove')) return 'masks';

    // Respiratory
    if (text.includes('inhaler') || text.includes('spray')) return 'air';
    
    // Oral Forms
    if (text.includes('syrup') || text.includes('suspension') || text.includes('liquid') || text.includes('solution') || text.includes('drop')) return 'water_drop';
    if (text.includes('tablet') || text.includes('capsule') || text.includes('pill')) return 'pill';
    
    if (text.includes('suppository')) return 'medication'; 
    
    return 'medication'; // Generic Default
  };

  // Helper to get short form label
  const getFormLabel = (drug: Drug): string => {
    const text = (drug.name + " " + drug.description + " " + drug.genericName).toLowerCase();
    
    // Equipment
    if (text.includes('monitor') || text.includes('meter') || text.includes('thermometer')) return 'Device';
    
    // Baby
    if (text.includes('diaper')) return 'Pack';
    if (text.includes('formula')) return 'Tin';
    
    // Supplies
    if (text.includes('mask') || text.includes('glove') || text.includes('syringe') || text.includes('gauze')) return 'Box';

    // Cosmetics
    if (text.includes('shampoo')) return 'Shampoo';
    if (text.includes('cleanser')) return 'Cleanser';
    if (text.includes('wash')) return 'Wash';
    if (text.includes('cream')) return 'Cream';
    if (text.includes('gel')) return 'Gel';
    if (text.includes('ointment')) return 'Ointment';
    if (text.includes('lotion')) return 'Lotion';
    if (text.includes('balm')) return 'Balm';

    // Medications
    if (text.includes('syrup')) return 'Syrup';
    if (text.includes('suspension')) return 'Suspension';
    if (text.includes('solution') || text.includes('liquid')) return 'Liquid';
    if (text.includes('drops') || text.includes('drop')) return 'Drops';
    if (text.includes('injection') || text.includes('ampoule') || text.includes('vial') || text.includes('syringe')) return 'Injection';
    if (text.includes('inhaler')) return 'Inhaler';
    if (text.includes('spray')) return 'Spray';
    if (text.includes('suppository')) return 'Suppository';
    if (text.includes('capsule')) return 'Capsule';
    if (text.includes('tablet') || text.includes('pill')) return 'Tablet';
    
    return '';
  };

  const addToCart = (drug: Drug, isUnitMode: boolean = false) => {
    if (drug.stock <= 0) return;
    setCart(prev => {
      // Find existing item with same ID AND same unit mode
      const existingIndex = prev.findIndex(item => item.id === drug.id && !!item.isUnit === isUnitMode);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        
        // Check limits for the specific mode
        if (isUnitMode && existing.unitsPerPack) {
             // Unit mode stock check logic could go here if strict
        } else {
             if (existing.quantity >= drug.stock) return prev;
        }
        
        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
        return updated;
      }
      
      return [...prev, { ...drug, quantity: 1, discount: 0, isUnit: isUnitMode }];
    });
  };

  const addGroupToCart = (group: Drug[]) => {
    const firstDrug = group[0];
    const selectedBatchId = selectedBatches[firstDrug.id];
    
    let targetBatch: Drug | undefined;
    
    if (selectedBatchId) {
        targetBatch = group.find(d => d.id === selectedBatchId);
    }
    
    // If no manual selection or selected batch invalid/empty, use FEFO
    if (!targetBatch || targetBatch.stock <= 0) {
        targetBatch = group.find(d => {
            const inCart = cart
                .filter(c => c.id === d.id) // Get all entries for this batch (unit + pack)
                .reduce((sum, c) => sum + (c.isUnit && c.unitsPerPack ? c.quantity / c.unitsPerPack : c.quantity), 0);
            return (d.stock - inCart) > 0;
        });
    }
    
    if (targetBatch) {
        const unitMode = selectedUnits[firstDrug.id] === 'unit';
        addToCart(targetBatch, unitMode);
    }
  };

  const removeFromCart = (id: string, isUnit: boolean) => {
    setCart(prev => prev.filter(item => !(item.id === id && !!item.isUnit === isUnit)));
  };

  const updateQuantity = (id: string, isUnit: boolean, delta: number) => {
    setCart(prev => {
      // Find current pack and unit items for this drug in cart
      const packItem = prev.find(i => i.id === id && !i.isUnit);
      const unitItem = prev.find(i => i.id === id && i.isUnit);
      const drug = inventory.find(d => d.id === id);
      const stock = drug?.stock || 0;
      const unitsPerPack = drug?.unitsPerPack || 1;
      const hasDualMode = unitsPerPack > 1;
      
      // Calculate current combined usage
      const currentPackQty = packItem?.quantity || 0;
      const currentUnitQty = unitItem?.quantity || 0;
      
      // Calculate new quantity for the target item
      const targetItem = prev.find(i => i.id === id && !!i.isUnit === isUnit);
      if (!targetItem) return prev;
      
      const newQty = targetItem.quantity + delta;
      
      // Calculate new combined usage in pack-equivalents
      let newPackQty = currentPackQty;
      let newUnitQty = currentUnitQty;
      if (isUnit) {
        newUnitQty = newQty;
      } else {
        newPackQty = newQty;
      }
      
      const totalPacksUsed = newPackQty + (hasDualMode ? newUnitQty / unitsPerPack : 0);
      const isStockValid = totalPacksUsed <= stock;
      
      // Min qty validation
      // If ONLY pack mode (no dual), pack must be >= 1
      // If dual mode, either can be 0 as long as the other has value (handled by UI delete)
      const minQtyValid = hasDualMode ? newQty >= 0 : (isUnit ? newQty >= 0 : newQty >= 1);
      
      if (minQtyValid && isStockValid) {
        return prev.map(item => {
          if (item.id === id && !!item.isUnit === isUnit) {
            return { ...item, quantity: newQty };
          }
          return item;
        });
      }
      return prev;
    });
  };

  const toggleUnitMode = (id: string, currentIsUnit: boolean) => {
    setCart(prev => {
        const itemIndex = prev.findIndex(i => i.id === id && !!i.isUnit === currentIsUnit);
        if (itemIndex === -1) return prev;
        
        const item = prev[itemIndex];
        const unitsPerPack = item.unitsPerPack || 1;

        if (!currentIsUnit) {
            // Pack -> Unit (Only if qty is 1, convert to 1 unit)
            // Also prevent if units already exist (merged row logic)
            const existingUnit = prev.find(i => i.id === id && i.isUnit);
            if (item.quantity !== 1 || (existingUnit && existingUnit.quantity > 0)) return prev;
            
            let updated = prev.filter((_, idx) => idx !== itemIndex);
            const unitIndex = updated.findIndex(i => i.id === id && i.isUnit);
            if (unitIndex >= 0) {
                updated[unitIndex] = { ...updated[unitIndex], quantity: updated[unitIndex].quantity + 1 };
            } else {
                updated.push({ ...item, isUnit: true, quantity: 1 });
            }
            return updated;
        }

        // Unit -> Pack (Smart Conversion)
        if (unitsPerPack <= 1) return prev;

        const packsToAdd = Math.floor(item.quantity / unitsPerPack);
        if (packsToAdd <= 0) return prev;

        const unitsToRemove = packsToAdd * unitsPerPack;
        
        let updated = [...prev];
        const updatedUnitItem = { ...item, quantity: item.quantity - unitsToRemove };
        
        if (updatedUnitItem.quantity === 0) {
            updated = updated.filter((_, idx) => idx !== itemIndex);
        } else {
            updated[itemIndex] = updatedUnitItem;
        }

        const packIndex = updated.findIndex(i => i.id === id && !i.isUnit);
        if (packIndex >= 0) {
            updated[packIndex] = { ...updated[packIndex], quantity: updated[packIndex].quantity + packsToAdd };
        } else {
            updated.push({ ...item, isUnit: false, quantity: packsToAdd });
        }

        return updated;
    });
  };

  const updateItemDiscount = (id: string, isUnit: boolean, discount: number) => {
    const validDiscount = Math.min(100, Math.max(0, discount));
    setCart(prev => prev.map(item => 
      (item.id === id && !!item.isUnit === isUnit) ? { ...item, discount: validDiscount } : item
    ));
  };

  const getCartItemActions = (item: CartItem) => {
    const actions: any[] = [
      { label: t.removeItem, icon: 'delete', action: () => removeFromCart(item.id, !!item.isUnit), danger: true },
    ];

    const unitsPerPack = item.unitsPerPack || 1;
    const hasDualMode = unitsPerPack > 1;

    // Resolve full drug state from cart to correctly determine actions for merged row
    const packItem = cart.find(i => i.id === item.id && !i.isUnit);
    const unitItem = cart.find(i => i.id === item.id && i.isUnit);
    const packQty = packItem?.quantity || 0;
    const unitQty = unitItem?.quantity || 0;

    const canSwitchToUnit = hasDualMode && packQty === 1 && unitQty === 0;
    const canSwitchToPack = hasDualMode && unitQty >= unitsPerPack;

    if (canSwitchToUnit) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToUnit,
        icon: 'swap_horiz',
        action: () => toggleUnitMode(item.id, false), // false = currently is Pack
        danger: false
      });
    }

    if (canSwitchToPack) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToPack,
        icon: 'swap_horiz',
        action: () => toggleUnitMode(item.id, true), // true = currently is Unit
        danger: false
      });
    }

    actions.push({ separator: true });
    actions.push({
      label: t.actions.discount,
      icon: 'percent',
      action: () => {
        const disc = prompt('Enter discount percentage (0-100):', item.discount?.toString() || '0');
        if (disc !== null) {
          const val = parseFloat(disc);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            const maxDisc = item.maxDiscount ?? 10;
            if (val > maxDisc) {
              alert(`Discount cannot exceed ${maxDisc}%`);
            } else {
              updateItemDiscount(item.id, !!item.isUnit, val);
              if (val > 0) setGlobalDiscount(0);
            }
          }
        }
      },
      danger: false
    });
    return actions;
  };

  // Cart Drag and Drop Sensors
  const cartSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts (to allow scrolling/tapping)
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cart Drag End Handler
  const handleCartDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
        setCart((prev) => {
             // We need to reorder the *groups* but store as *items*.
             // 1. Group the current items map-like
             const groups = new Map<string, CartItem[]>();
             const order: string[] = []; // Track Order of IDs
             
             prev.forEach(item => {
                 if(!groups.has(item.id)) {
                     groups.set(item.id, []);
                     order.push(item.id);
                 }
                 groups.get(item.id)!.push(item);
             });
             
             // 2. Perform ArrayMove on the Order array
             const oldIndex = order.indexOf(active.id as string);
             const newIndex = order.indexOf(over!.id as string);
             
             const newOrder = arrayMove(order, oldIndex, newIndex);
             
             // 3. Reconstruct Flat Cart based on new Order
             const newCart: CartItem[] = [];
             newOrder.forEach(id => {
                 if(groups.has(id)) {
                     newCart.push(...groups.get(id)!);
                 }
             });
             return newCart;
        });
    }
  };

  // Long-press support for cart items (touch devices)
  const currentTouchCartItem = useRef<CartItem | null>(null);
  const {
    onTouchStart: onCartItemTouchStart,
    onTouchEnd: onCartItemTouchEnd,
    onTouchMove: onCartItemTouchMove
  } = useLongPress({
    onLongPress: (e) => {
      if (currentTouchCartItem.current) {
        const touch = e.touches[0];
        showMenu(touch.clientX, touch.clientY, getCartItemActions(currentTouchCartItem.current));
      }
    }
  });

  // Calculations
  const calculateItemTotal = (item: CartItem) => {
    let unitPrice = item.price;
    if (item.isUnit && item.unitsPerPack) {
      unitPrice = item.price / item.unitsPerPack;
    }
    const baseTotal = unitPrice * item.quantity;
    const discountAmount = baseTotal * ((item.discount || 0) / 100);
    return baseTotal - discountAmount;
  };

  const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const cartTotal = subtotal * (1 - (globalDiscount / 100));
  const isValidOrder = cart.length > 0 && mergedCartItems.every(item => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0);
  const totalItems = mergedCartItems.filter(item => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0).length;

  const handleCheckout = (saleType: 'walk-in' | 'delivery' = 'walk-in') => {
    if (!isValidOrder) return;

    let deliveryFee = 0;
    if (saleType === 'delivery') {
        deliveryFee = 5;
    }

    onCompleteSale({
        items: cart,
        customerName: customerName || 'Guest Customer',
        customerCode,
        customerPhone: selectedCustomer?.phone,
        customerAddress: selectedCustomer ? [
          selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', language as 'EN' | 'AR') : '',
          selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', language as 'EN' | 'AR') : '',
          selectedCustomer.governorate ? getLocationName(selectedCustomer.governorate, 'gov', language as 'EN' | 'AR') : ''
        ].filter(Boolean).join(', ') : undefined,
        customerStreetAddress: selectedCustomer?.streetAddress,
        paymentMethod,
        saleType,
        deliveryFee,
        globalDiscount,
        subtotal,
        total: cartTotal + deliveryFee
    });

    // Auto-Print Receipt Logic
    try {
      const activeId = localStorage.getItem('receipt_active_template_id');
      const templatesStr = localStorage.getItem('receipt_templates');
      
      if (activeId && templatesStr) {
          const templates = JSON.parse(templatesStr);
          const activeTemplate = templates.find((t: any) => t.id === activeId);
          
          if (activeTemplate) {
             const opts = activeTemplate.options as InvoiceTemplateOptions;
             const isDelivery = saleType === 'delivery';
             // If delivery, check distinct flag. Else check general complete flag.
             // Usually, 'autoPrintOnComplete' implies ANY complete unless delivery overrides?
             // Interpreting user request: "Option for delivery order" AND "Option for any order".
             // If Any Order is checked, it prints for everything.
             // If Delivery is checked, it prints for delivery.
             // So: (isDelivery && opts.autoPrintOnDelivery) || opts.autoPrintOnComplete
             
             const shouldPrint = (isDelivery && opts.autoPrintOnDelivery) || opts.autoPrintOnComplete;

             if (shouldPrint) {
                 // Construct a temporary Sale object for printing
                 // Since onCompleteSale is an event, we don't have the final DB ID yet.
                 // We'll use a placeholder or handle it gracefully.
                 const mockSale: Sale = {
                     id: 'TRX-' + Date.now().toString().slice(-6),
                     date: new Date().toISOString(),
                     dailyOrderNumber: 0, // Placeholder
                     items: cart,
                     subtotal,
                     globalDiscount: globalDiscount, // global discount amount? No, Sale interface says globalDiscount is number.
                     // In POS state, globalDiscount is number (percent).
                     // In Sale interface: globalDiscount is number.
                     // But wait, cartTotal calculation uses it as percent: subtotal * (1 - (globalDiscount / 100))
                     // So we pass it as is.
                     total: cartTotal + deliveryFee,
                     paymentMethod,
                     saleType,
                     deliveryFee,
                     status: 'completed',
                     customerName: customerName || 'Guest Customer',
                     customerCode, 
                     customerPhone: selectedCustomer?.phone,
                     customerAddress: selectedCustomer ? [
                        selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', language as 'EN' | 'AR') : '',
                        selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', language as 'EN' | 'AR') : '',
                        selectedCustomer.governorate ? getLocationName(selectedCustomer.governorate, 'gov', language as 'EN' | 'AR') : ''
                     ].filter(Boolean).join(', ') : undefined,
                     customerStreetAddress: selectedCustomer?.streetAddress,
                 };

                 const html = generateInvoiceHTML(mockSale, opts);
                 
                 // Open print window
                 const printWindow = window.open('', '_blank', 'width=400,height=600');
                 if (printWindow) {
                     printWindow.document.write(html);
                     printWindow.document.close();
                     // printWindow.print(); // Optional: trigger print dialog immediately
                 }
             }
          }
      }
    } catch (e) {
       console.error("Auto-print failed:", e);
    }

    // Close the current tab after successful checkout
    removeTab(activeTabId);
  };

  // Filter customers when name changes
  useEffect(() => {
    if (customerName && showCustomerDropdown && !selectedCustomer) {
      const term = customerName.toLowerCase();
      const results = customers.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.phone.includes(term) ||
        (c.code && c.code.toLowerCase().includes(term)) ||
        (c.serialId && c.serialId.toString().includes(term))
      ).slice(0, 5);
      setFilteredCustomers(results);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerName, customers, showCustomerDropdown, selectedCustomer]);

  // Sync selectedCustomer with activeTab.customerCode (for persistence)
  useEffect(() => {
    if (customerCode && (!selectedCustomer || (selectedCustomer.code !== customerCode && selectedCustomer.serialId?.toString() !== customerCode))) {
      const found = customers.find(c => c.code === customerCode || c.serialId?.toString() === customerCode);
      if (found) {
        setSelectedCustomer(found);
      }
    } else if (!customerCode && selectedCustomer) {
      setSelectedCustomer(null);
    }
  }, [customerCode, customers, selectedCustomer]);



  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerCode(customer.code || customer.serialId?.toString() || '');
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setShowCodeDropdown(false);
  };

  const clearCustomerSelection = () => {
    setCustomerName('');
    setCustomerCode('');
    setSelectedCustomer(null);
  };

  // Auto-scroll active item into view
  useEffect(() => {
    const activeRow = document.getElementById(`drug-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  const filteredDrugs = useMemo(() => {
    const { mode, regex } = parseSearchTerm(search);

    return inventory.filter(d => {
        const drugBroadCat = getBroadCategory(d.category);
        const matchesCategory = selectedCategory === 'All' || drugBroadCat === selectedCategory;
        
        let matchesSearch = false;

        if (mode === 'ingredient') {
            matchesSearch = !!d.activeIngredients && d.activeIngredients.some(ing => regex.test(ing));
        } else {
            const searchableText = [
                d.name,
                d.genericName,
                d.dosageForm,
                d.category,
                d.description,
                ...(Array.isArray(d.activeIngredients) ? d.activeIngredients : [])
            ].filter(Boolean).join(' ');
            
            matchesSearch = 
                regex.test(searchableText) ||
                (d.barcode && regex.test(d.barcode)) ||
                (d.internalCode && regex.test(d.internalCode));
        }
        
        const matchesStock = 
            stockFilter === 'all' || 
            (stockFilter === 'in_stock' && d.stock > 0) || 
            (stockFilter === 'out_of_stock' && d.stock <= 0);

        return matchesCategory && matchesSearch && matchesStock;
    });
  }, [inventory, search, selectedCategory, stockFilter]);

  // Group drugs by name and sort batches by expiry
  const groupedDrugs = useMemo(() => {
    const groups: Record<string, Drug[]> = {};
    filteredDrugs.forEach(d => {
       if (!groups[d.name]) groups[d.name] = [];
       groups[d.name].push(d);
    });
    
    // Sort batches by expiry date (asc)
    Object.values(groups).forEach(group => {
        group.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    });

    return Object.values(groups);
  }, [filteredDrugs]);

  // Long Press Logic for Touch Devices


  // --- DataTable Configuration ---
  const tableData = useMemo(() => {
    return groupedDrugs.map(group => {
      const first = group[0];
      return {
        id: first.id, 
        ...first, 
        group: group,
        totalStock: group.reduce((sum, d) => sum + d.stock, 0),
        inCartCount: group.reduce((sum, d) => sum + (cart.find(c => c.id === d.id)?.quantity || 0), 0)
      };
    });
  }, [groupedDrugs, cart]);

  // --- TanStack Table Configuration ---
  const columnHelper = createColumnHelper<typeof tableData[0]>();

  const tableColumns = useMemo<ColumnDef<typeof tableData[0], any>[]>(() => [
    columnHelper.display({
      id: 'icon',
      header: t.icon || 'Icon',
      size: 60,
      enableSorting: false,
      cell: (info) => (
          <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
            <span className="material-symbols-rounded text-[18px]">{getDrugIcon(info.row.original as unknown as Drug)}</span>
          </div>
      )
    }),
    columnHelper.accessor('barcode', {
        header: t.code,
        size: 140,
        cell: (info) => (
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400" dir={language === 'AR' ? 'rtl' : 'ltr'}>
                {info.row.original.internalCode || info.row.original.barcode}
            </span>
        )
    }),
    columnHelper.accessor('name', {
        header: t.name,
        size: 250,
        cell: (info) => (
            <div className="flex flex-col w-full" dir={language === 'AR' ? 'rtl' : 'ltr'}>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 drug-name truncate">
                  {info.row.original.name} {info.row.original.dosageForm ? <span className="text-gray-500 font-normal">({info.row.original.dosageForm})</span> : ''}
                </span>
                <span className="text-xs text-gray-500 truncate">{info.row.original.genericName}</span>
            </div>
        )
    }),
    columnHelper.accessor('category', {
        header: t.category,
        size: 120,
        cell: (info) => <span className="text-xs text-gray-600 dark:text-gray-400">{info.getValue()}</span>
    }),
    columnHelper.accessor('price', {
        header: t.price,
        size: 100,
        cell: (info) => (
            <span className="font-bold text-sm text-gray-700 dark:text-gray-300" dir="ltr">
                ${info.getValue().toFixed(2)}
            </span>
        )
    }),
    columnHelper.accessor('totalStock', {
        id: 'stock',
        header: t.stock,
        size: 100,
        cell: (info) => info.getValue() === 0 ? (
            <span className="text-xs font-bold text-red-500">{t.outOfStock}</span>
        ) : (
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{parseFloat(info.getValue().toFixed(2))}</span>
        )
    }),
    columnHelper.display({
        id: 'unit',
        header: t.unit,
        size: 120,
        cell: (info) => {
            const row = info.row.original;
             return (
            <div className="w-full h-full overflow-visible">
            {row.unitsPerPack && row.unitsPerPack > 1 ? (
                <PosDropdown 
                    items={['pack', 'unit']}
                    selectedItem={(selectedUnits[row.id] || 'pack')}
                    isOpen={openUnitDropdown === row.id}
                    onToggle={() => {
                        setOpenUnitDropdown(openUnitDropdown === row.id ? null : row.id);
                        setOpenBatchDropdown(null);
                    }}
                    onSelect={(item) => setSelectedUnits(prev => ({ ...prev, [row.id]: item as 'pack' | 'unit' }))}
                    keyExtractor={(item) => item as string}
                    renderItem={(item) => (
                        <div className="w-full px-2 py-1 text-sm font-bold text-center text-gray-700 dark:text-gray-300">
                            {item === 'pack' ? t.pack : t.unit}
                        </div>
                    )}
                    renderSelected={(item) => (
                        <div className="w-full px-2 py-1 text-sm font-bold text-center truncate text-gray-700 dark:text-gray-300">
                            {item === 'pack' ? t.pack : t.unit}
                        </div>
                    )}
                    color={color}
                    className="h-7 w-24"
                />
             ) : (
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {t.pack}
                </span>
             )}
            </div>
        )}
    }),
    columnHelper.display({
        id: 'batches',
        header: t.batches,
        size: 150,
        cell: (info) => {
            const row = info.row.original;
            if (!row.group || row.group.length === 0) return <span className="text-xs text-gray-400">-</span>;
            
            const selectedBatchId = selectedBatches[row.id];
            const defaultBatch = row.group.find((d: Drug) => d.stock > 0) || row.group[0];
            const displayBatch = selectedBatchId ? row.group.find((d: Drug) => d.id === selectedBatchId) : defaultBatch;

            if (row.group.length === 1) {
                 const i = displayBatch;
                 return (
                    <div className="w-full h-full">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {i ? (i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'}) : '-') + ` • ${i.stock}` : t.noStock}
                        </div>
                    </div>
                 );
            }

            return (
              <div className="w-full h-full overflow-visible">
              <PosDropdown 
                items={row.group}
                selectedItem={displayBatch}
                isOpen={openBatchDropdown === row.id}
                onToggle={() => {
                    setOpenBatchDropdown(openBatchDropdown === row.id ? null : row.id);
                    setOpenUnitDropdown(null);
                }}
                onSelect={(item) => setSelectedBatches(prev => ({ ...prev, [row.id]: (item as Drug).id }))}
                keyExtractor={(item) => (item as Drug).id}
                renderSelected={(item) => {
                    const i = item as Drug | undefined;
                    return (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center truncate text-gray-700 dark:text-gray-300">
                        {i ? (i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'}) : '-') + ` • ${i.stock}` : t.noStock}
                    </div>
                )}}
                renderItem={(item) => {
                    const i = item as Drug;
                    return (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center text-gray-700 dark:text-gray-300">
                        {(i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'}) : '-') + ` • ${i.stock}`}
                    </div>
                )}}
                onEnter={() => {
                    addGroupToCart(row.group);
                    setSearch('');
                    setActiveIndex(0);
                    searchInputRef.current?.focus();
                }}
                className="h-7 w-32"
                color={color}
              />
              </div>
            );
        }
    }),
    columnHelper.display({
        id: 'inCart',
        header: t.inCart,
        size: 80,
        cell: (info) => (
          <div className="text-center w-full flex justify-center">
            {info.row.original.inCartCount > 0 && (
              <div className={`inline-block bg-${color}-600 text-white text-xs font-bold px-2 py-1 rounded-md`}>
                {info.row.original.inCartCount}
              </div>
            )}
          </div>
        )
    })
  ], [color, t, language, selectedUnits, openUnitDropdown, selectedBatches, openBatchDropdown, getDrugIcon]);







  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-4 px-2">
        {/* Header - Compact */}
        <h2 className="text-xl font-bold tracking-tight type-expressive shrink-0">{t.posTitle}</h2>

        {/* Tab Bar - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={switchTab}
            onTabClose={removeTab}
            onTabAdd={addTab}
            onTabRename={renameTab}
            onTogglePin={togglePin}
            onTabReorder={reorderTabs}
            maxTabs={maxTabs}
            color={color}
            t={t}
          />
        </div>
      </div>
      
      {/* Main POS Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden">
      {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
      <div className={`flex-1 flex flex-col gap-2 h-full overflow-hidden ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Customer Details */}
          <div className={`${CARD_MD} p-3 border border-gray-200 dark:border-gray-800`}>
            {selectedCustomer ? (
              // Locked Customer Card
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in">
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                      <span className="material-symbols-rounded text-[24px]">person</span>
                    </div>
                    <div className="flex flex-col gap-0">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-none mb-0.5">
                        {selectedCustomer.name}
                      </h3>
                      <div className="leading-none">
                        <span className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400">
                          {selectedCustomer.code || `#${selectedCustomer.serialId}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 leading-tight mt-0.5">
                        <span dir="ltr">{selectedCustomer.phone}</span>
                      </p>
                    </div>
                 </div>
                 
                 <div className="flex-1 border-s-2 border-gray-100 dark:border-gray-700 ps-6 ms-2 hidden sm:block">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                      <span className="material-symbols-rounded text-[14px]">location_on</span>
                      {t.address}
                    </p>
                    <div className="flex flex-col leading-snug">
                       {selectedCustomer.streetAddress && (
                           <span className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                               {selectedCustomer.streetAddress}
                           </span>
                       )}
                       <span className="text-xs text-gray-500 dark:text-gray-400">
                           {selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', language as Language) : ''}
                           {selectedCustomer.area && selectedCustomer.city ? ' - ' : ''}
                           {selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', language as Language) : ''}
                       </span>
                    </div>
                 </div>

                 <div className="flex flex-col gap-2 min-w-[140px]">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.paymentMethod}</label>
                    <SegmentedControl
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
                        color={color}
                        size="xs"
                        options={[
                            { label: t.cash || 'Cash', value: 'cash', icon: 'payments', activeColor: 'green' },
                            { label: t.visa || 'Visa', value: 'visa', icon: 'credit_card', activeColor: 'blue' }
                        ]}
                    />
                    <button 
                        onClick={clearCustomerSelection}
                        className="w-full py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-rounded text-[16px]">close</span>
                        {t.changeCustomer}
                    </button>
                 </div>
              </div>
            ) : (
              // Search Inputs
              <div className="flex flex-col sm:flex-row gap-3">
                <div 
                    className="flex-1 relative"
                    onBlur={customerDropdownHook.handleBlur} 
                >
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.customerInfo}</label>
                <SearchInput
                  value={customerName}
                  onSearchChange={(val) => {
                    setCustomerName(val);
                    setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(0);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={customerDropdownHook.handleKeyDown}
                  placeholder={t.customerSearchPlaceholder}
                  icon="person"
                  className="border-gray-200 dark:border-gray-700"
                />    
                    {/* Customer Dropdown */}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 max-h-48 overflow-y-auto">
                        {filteredCustomers.map((customer, index) => (
                        <div
                            key={customer.id}
                            className={`px-3 py-2 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex flex-col ${
                                index === highlightedCustomerIndex 
                                ? 'bg-blue-50 dark:bg-blue-900/30' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur which would close dropdown
                                handleCustomerSelect(customer);
                            }}
                            onMouseEnter={() => setHighlightedCustomerIndex(index)}
                        >
                            <span className={`text-sm font-bold ${index === highlightedCustomerIndex ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                {customer.name}
                            </span>
                            <div className="flex gap-2 text-xs text-gray-500" dir="ltr">
                            <span>{customer.phone}</span>
                            {customer.code && <span>• {customer.code}</span>}
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </div>

                <div className="flex-none">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.paymentMethod}</label>
                    <SegmentedControl
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
                        color={color}
                        size="sm"
                        options={[
                            { label: t.cash || 'Cash', value: 'cash', icon: 'payments', activeColor: 'green' },
                            { label: t.visa || 'Visa', value: 'visa', icon: 'credit_card', activeColor: 'blue' }
                        ]}
                    />
                </div>
              </div>
            )}
          </div>
        {/* Search & Filter - No Card Container */}
        <div className="w-full flex flex-col sm:flex-row gap-1 shrink-0">
             <div className="relative flex-1">
                <SearchInput
                    ref={searchInputRef}
                    value={search}
                    onSearchChange={(val) => {
                        setSearch(val);
                        setActiveIndex(0);
                    }}
                    placeholder={t.searchPlaceholder}
                    badge={
                        groupedDrugs.length > 0 && (
                            <span className={`inline-flex items-center justify-center h-5 px-2 text-[10px] font-bold rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                                {groupedDrugs.length}
                            </span>
                        )
                    }
                    className="border-gray-200 dark:border-gray-800"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    onKeyDown={(e) => {
                        const term = search.trim();
                        
                        // --- Grid Navigation ---
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (groupedDrugs.length > 0) {
                                setActiveIndex(prev => (prev + 1) % groupedDrugs.length);
                            }
                            return;
                        }
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (groupedDrugs.length > 0) {
                                setActiveIndex(prev => (prev - 1 + groupedDrugs.length) % groupedDrugs.length);
                            }
                            return;
                        }

                        // --- Execution (Enter) ---
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!term) return;

                            // 1. Smart Barcode Detection
                            const isBarcodeLike = /^\d+$/.test(term) && term.length > 3;
                            
                            if (isBarcodeLike) {
                                 const match = inventory.find(d => 
                                    d.barcode === term || 
                                    (d.internalCode && d.internalCode === term)
                                );
                                if (match) {
                                    addToCart(match);
                                    setSearch('');
                                    return; 
                                }
                            }
                            
                            // 2. Add Active Item
                            if (groupedDrugs.length > 0) {
                                const activeGroup = groupedDrugs[activeIndex]; 
                                addGroupToCart(activeGroup); 
                                setSearch('');
                                setActiveIndex(0);
                                // Ensure focus remains/returns to search (though it's already there)
                            }
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const selection = window.getSelection()?.toString();
                        showMenu(e.clientX, e.clientY, [
                            ...(selection ? [{ label: t.copy, icon: 'content_copy', action: () => navigator.clipboard.writeText(selection), danger: false }] : []),
                            { label: t.paste, icon: 'content_paste', action: async () => {
                                try {
                                    const text = await navigator.clipboard.readText();
                                    setSearch(prev => prev + text);
                                } catch (err) {
                                    console.error('Failed to read clipboard', err);
                                }
                            }, danger: false },
                            { separator: true } as any,
                            { label: t.clear, icon: 'backspace', action: () => setSearch(''), danger: false }
                        ]);
                    }}
                />
            </div>
            <div className="relative min-w-[110px] h-[42px]">
                <PosDropdown 
                    variant="input"
                    items={categories}
                    selectedItem={categories.find(c => c.id === selectedCategory)}
                    isOpen={activeFilterDropdown === 'category'}
                    onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'category' ? null : 'category')}
                    onSelect={(item) => setSelectedCategory(item.id)}
                    keyExtractor={(item) => item.id}
                    renderSelected={(item) => item?.label || selectedCategory}
                    renderItem={(item) => item.label}
                    color={color}
                />
            </div>
            <div className="relative min-w-[110px] h-[42px]">
                <PosDropdown 
                    variant="input"
                    items={['all', 'in_stock', 'out_of_stock']}
                    selectedItem={stockFilter}
                    isOpen={activeFilterDropdown === 'stock'}
                    onToggle={() => setActiveFilterDropdown(activeFilterDropdown === 'stock' ? null : 'stock')}
                    onSelect={(item) => setStockFilter(item as any)}
                    keyExtractor={(item) => item as string}
                    renderSelected={(item) => {
                        if (item === 'all') return t.allStock || 'All Stock';
                        if (item === 'in_stock') return t.inStock || 'In Stock';
                        if (item === 'out_of_stock') return t.outOfStock || 'Out of Stock';
                        return item as string;
                    }}
                    renderItem={(item) => {
                         if (item === 'all') return t.allStock || 'All Stock';
                        if (item === 'in_stock') return t.inStock || 'In Stock';
                        if (item === 'out_of_stock') return t.outOfStock || 'Out of Stock';
                        return item as string;
                    }}
                    color={color}
                />
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col overflow-hidden pe-1 pb-24 lg:pb-0">
            {search.trim() === '' ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">search</span>
                <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.searchPlaceholder}</h2>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.startSearching || 'Start searching for products to add them to cart'}
                </p>
              </div>
            ) : groupedDrugs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">search_off</span>
                <p className="text-sm font-medium">
                  {t.noResults || 'No results found'}
                </p>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.tryDifferentKeywords || 'Try searching with different keywords'}
                </p>
              </div>
            ) : (
              <TanStackTable
                  data={tableData}
                  columns={tableColumns}
                  color={color}
                  onRowClick={(item) => addGroupToCart(item.group)}
                  onRowLongPress={(e, item) => {
                    showMenu(e.touches[0].clientX, e.touches[0].clientY, [
                      { label: t.addToCart, icon: 'add_shopping_cart', action: () => addGroupToCart(item.group), danger: false },
                      { label: t.viewDetails, icon: 'info', action: () => setViewingDrug(item.group[0]), danger: false },
                      { separator: true } as any,
                      { label: t.actions?.showSimilar || 'Show Similar', icon: 'category', action: () => setSelectedCategory(item.category), danger: false }
                    ]);
                  }}
                  onRowContextMenu={(e, item) => {
                    showMenu(e.clientX, e.clientY, [
                      { label: t.addToCart, icon: 'add_shopping_cart', action: () => addGroupToCart(item.group), danger: false },
                      { label: t.viewDetails, icon: 'info', action: () => setViewingDrug(item.group[0]), danger: false },
                      { separator: true } as any,
                      { label: t.actions?.showSimilar || 'Show Similar', icon: 'category', action: () => setSelectedCategory(item.category), danger: false }
                    ]);
                  }}
                  searchPlaceholder={t.searchPlaceholder}
                  emptyMessage={t.noResults}
                  defaultHiddenColumns={['icon', 'category']}
                  enableTopToolbar={false}
               />
            )}
        </div>
      </div>

      {/* Mobile Floating Cart Summary (Only in Products View) */}
      <div className={`lg:hidden fixed bottom-20 left-4 right-4 z-20 ${mobileTab === 'products' && cart.length > 0 ? 'block' : 'hidden'}`}>
        <button 
            onClick={() => setMobileTab('cart')}
            className={`w-full p-3 rounded-2xl bg-${color}-600 text-white shadow-xl shadow-${color}-200 dark:shadow-none flex items-center justify-between animate-slide-up active:scale-95 transition-transform`}
        >
            <div className="flex items-center gap-3">
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold">{totalItems}</span>
                <span className="font-medium text-sm">{t.viewCart}</span>
            </div>
            <span className="font-bold text-base">${cartTotal.toFixed(2)}</span>
        </button>
      </div>

      {/* Resize Handle (Desktop Only) */}
      <div 
        className="hidden lg:flex w-4 h-full items-center justify-center cursor-col-resize group z-10 -mx-2"
        onMouseDown={startResizing}
        onTouchStart={startResizing}
      >
        <div className="w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors"></div>
      </div>

      {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
      <div 
        ref={sidebarRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`w-full lg:w-[var(--sidebar-width)] ${CARD_MD} border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-full ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
                <h2 className={`text-sm font-bold text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}>
                    <span className="material-symbols-rounded text-[18px]">shopping_cart</span>
                    {t.cartTitle}
                    {totalItems > 0 && (
                         <span className={`bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                            {totalItems}
                        </span>
                    )}
                </h2>
                
                {/* Mobile Back Button */}
                <button 
                    onClick={() => setMobileTab('products')}
                    className="lg:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                >
                    <span className="material-symbols-rounded text-[18px]">close</span>
                </button>
            </div>


        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2" dir="ltr">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <span className="material-symbols-rounded text-4xl opacity-20">remove_shopping_cart</span>
                    <p className="text-xs">{t.emptyCart}</p>
                    <button 
                        onClick={() => setMobileTab('products')} 
                        className={`lg:hidden px-3 py-1.5 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 font-medium text-xs`}
                    >
                        {t.backToProducts}
                    </button>
                </div>
            ) : (
                <DndContext
                  sensors={cartSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCartDragEnd}
                >
                  <SortableContext
                    items={mergedCartItems.map(group => group.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {mergedCartItems.map((group, index) => {
                      // Using Drug ID as the sortable ID logic, assuming unique per drug
                      const itemId = group.id; // Or simple 'group.id' if unique
                      return (
                        <SortableCartItem
                          key={itemId}
                          packItem={group.pack}
                          unitItem={group.unit}
                          commonItem={group.common}
                          itemId={itemId}
                          color={color}
                          t={t}
                          showMenu={showMenu}
                          getCartItemActions={getCartItemActions}
                          currentTouchCartItem={currentTouchCartItem}
                          onCartItemTouchStart={onCartItemTouchStart}
                          onCartItemTouchEnd={onCartItemTouchEnd}
                          onCartItemTouchMove={onCartItemTouchMove}
                          removeFromCart={removeFromCart}
                          toggleUnitMode={toggleUnitMode}
                          updateItemDiscount={updateItemDiscount}
                          setGlobalDiscount={setGlobalDiscount}
                          updateQuantity={updateQuantity}
                          calculateItemTotal={calculateItemTotal}
                          addToCart={addToCart}
                          isHighlighted={index === highlightedIndex}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
            )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0">
            
            {/* Totals Section */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
                    <span>{t.subtotal}</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400">{t.orderDiscount}</span>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px] text-gray-400">percent</span>
                        <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={globalDiscount || ''}
                            placeholder="0"
                            onChange={(e) => {
                                const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                setGlobalDiscount(val);
                                if (val > 0) {
                                    setCart(prev => prev.map(item => ({ ...item, discount: 0 })));
                                }
                            }}
                            className="w-10 px-1 py-0.5 text-end rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 text-gray-700 dark:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                    <span>{t.total}</span>
                    <span className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}>${cartTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* No Shift Warning */}
            {!hasOpenShift && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 mb-3">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <span className="material-symbols-rounded text-[18px]">warning</span>
                        <p className="text-xs font-medium">{t.noOpenShift || 'Open a shift before completing sales'}</p>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button 
                    onClick={() => handleCheckout('walk-in')}
                    disabled={!isValidOrder || !hasOpenShift}
                    className={`flex-1 py-2.5 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2`}
                >
                    <span className="material-symbols-rounded text-[18px]">payments</span>
                    {t.completeOrder}
                </button>
                <button
                    onClick={() => handleCheckout('delivery')}
                    disabled={!isValidOrder || !hasOpenShift}
                    className={`w-12 py-2.5 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex justify-center items-center`}
                    title={t.deliveryOrder}
                >
                    <span className="material-symbols-rounded text-[20px]">local_shipping</span>
                </button>
            </div>
        </div>
      </div>
      
      {/* Product Details Modal */}
      {viewingDrug && (
        <Modal
            isOpen={true}
            onClose={() => setViewingDrug(null)}
            size="md"
            zIndex={50}
        >
            <div className={`p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                  <span className="material-symbols-rounded">info</span>
                </div>
                <h3 className={`text-lg font-bold type-expressive text-${color}-900 dark:text-${color}-100`}>
                  {t.productDetails}
                </h3>
              </div>
              <button 
                onClick={() => setViewingDrug(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title={t.close}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {viewingDrug.name} {viewingDrug.dosageForm ? <span className="text-lg text-gray-500 font-normal">({viewingDrug.dosageForm})</span> : ''}
                    </h2>
                    <p className="text-gray-500 font-medium">{viewingDrug.genericName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.modal?.stock || 'Stock'}</label>
                        <p className={`text-xl font-bold ${viewingDrug.stock === 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                            {viewingDrug.stock}
                        </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.modal?.price || 'Price'}</label>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            ${viewingDrug.price.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t.modal?.category || 'Category'}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{viewingDrug.category}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t.modal?.expiry || 'Expiry'}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(viewingDrug.expiryDate).toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">{t.modal?.location || 'Location'}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{t.modal?.shelf || 'Shelf'} A-2</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.modal?.description || 'Description'}</label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        {viewingDrug.description || t.modal?.noDescription || 'No description available.'}
                    </p>
                </div>
            </div>
            
             <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => setViewingDrug(null)}
                    className={`w-full py-3 rounded-xl font-bold text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all`}
                >
                    {t.close}
                </button>
            </div>
        </Modal>
      )}
      
      {/* Close Main POS Content div */}
      </div>
    </div>
  );
};

// --- Local Component for Dropdown ---
// Inlined to avoid extra files, reusing the generic hook efficiently.

