
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePosShortcuts } from '../../common/hooks/usePosShortcuts';
import { usePosSounds } from '../../common/hooks/usePosSounds';
import { canPerformAction, type UserRole } from '../../../config/permissions';
import { useAlert, useSettings } from '../../../context';
import { getLocationName } from '../../../data/locations';
import { useFilterDropdown } from '../../../hooks/useFilterDropdown';
import { usePOSTabs } from '../../../hooks/usePOSTabs';
import { useShift } from '../../../hooks/useShift'; // Import useShift
import type { TRANSLATIONS } from '../../../i18n/translations';
import type { CartItem, Customer, Drug, Employee, Language, Sale, Shift } from '../../../types';
import { getArabicDisplayName, getDisplayName } from '../../../utils/drugDisplayName';
import { formatStock } from '../../../utils/inventory';
import { parseSearchTerm } from '../../../utils/searchUtils';

import { useContextMenu } from '../../common/ContextMenu';
import { FilterDropdown } from '../../common/FilterDropdown';
import { type FilterConfig } from '../../common/FilterPill';
import { Modal } from '../../common/Modal';
import { SearchInput } from '../../common/SearchInput';
import { SegmentedControl } from '../../common/SegmentedControl';
import { SmartAutocomplete } from '../../common/SmartInputs';
import { PriceDisplay, TanStackTable } from '../../common/TanStackTable';
import { useStatusBar } from '../../layout/StatusBar';
import { calculateItemTotal, SortableCartItem } from './SortableCartItem';

import { POSPageHeader } from './ui/POSPageHeader';
import { POSCustomerPanel } from './ui/POSCustomerPanel';
import { POSCartSidebar } from './ui/POSCartSidebar';


import { DeliveryOrdersModal } from './DeliveryOrdersModal';
import { formatExpiryDate } from './utils/POSUtils';

import { usePOSSidebarResizer } from './hooks/usePOSSidebarResizer';
import { usePOSSearchAndFilters } from './hooks/usePOSSearchAndFilters';
import { usePOSCustomer } from './hooks/usePOSCustomer';
import { usePOSSearchWorker } from './hooks/usePOSSearchWorker';
import { usePOSCart } from './hooks/usePOSCart';
import { usePOSCheckout } from './hooks/usePOSCheckout';


// --- Main POS Component ---
interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: {
    items: CartItem[];
    customerName: string;
    customerCode?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerStreetAddress?: string;
    paymentMethod: 'cash' | 'visa';
    saleType?: 'walk-in' | 'delivery';
    deliveryFee?: number;
    globalDiscount: number;
    subtotal: number;
    total: number;
    // Extended properties
    deliveryEmployeeId?: string;
    status?: 'completed' | 'pending' | 'with_delivery' | 'on_way' | 'cancelled';
    processingTimeMinutes?: number;
  }) => Promise<boolean>;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  customers: Customer[];
  language?: Language;
  darkMode: boolean;
  employees?: Employee[];
  sales?: Sale[];
  onUpdateSale?: (saleId: string, updates: Partial<Sale>) => void;
  currentEmployeeId?: string;
  userRole: UserRole;
}

export const POS: React.FC<POSProps> = ({
  inventory,
  onCompleteSale,
  color,
  t,
  customers,
  language = 'EN',
  darkMode,
  employees = [],
  sales = [],
  onUpdateSale,
  currentEmployeeId,
  userRole,
}) => {
  const { success, error: showToastError } = useAlert();
  const { showMenu } = useContextMenu();
  const { textTransform } = useSettings();
  const { getVerifiedDate, addNotification } = useStatusBar();
  const isRTL = (t as any).direction === 'rtl' || language === 'AR' || (language as any) === 'ar';
  const currentLang = isRTL ? 'ar' : 'en';

  const {
    tabs, activeTab, activeTabId, addTab, removeTab,
    switchTab, updateTab, renameTab, togglePin, reorderTabs, maxTabs,
  } = usePOSTabs();

  const { currentShift } = useShift();
  const hasOpenShift = !!currentShift;

  const { playBeep, playError, playSuccess, playClick } = usePosSounds();

  const { sidebarWidth, sidebarRef, startResizing } = usePOSSidebarResizer();

  const {
    search, setSearch, stockFilter, setStockFilter, selectedCategory, setSelectedCategory,
    activeFilterDropdown, setActiveFilterDropdown, posFilterConfigs, posActiveFilters,
    handlePosFilterUpdate, getBroadCategory,
  } = usePOSSearchAndFilters({ t, activeTab, activeTabId, updateTab });

  const {
    customerName, setCustomerName, customerCode, setCustomerCode, selectedCustomer, setSelectedCustomer,
    showCustomerDropdown, setShowCustomerDropdown, filteredCustomers, setFilteredCustomers,
    highlightedCustomerIndex, setHighlightedCustomerIndex, showCodeDropdown, setShowCodeDropdown,
    filteredByCode, setFilteredByCode, handleCustomerSelect, clearCustomerSelection, customerDropdownHook,
  } = usePOSCustomer({ activeTab, activeTabId, updateTab, customers });

  const {
    cart, setCart, mergedCartItems, globalDiscount, setGlobalDiscount, addToCart, addGroupToCart,
    removeFromCart, removeDrugFromCart, switchBatchWithAutoSplit, updateQuantity, toggleUnitMode,
    updateItemDiscount, cartSensors, handleCartDragEnd, selectedUnits, setSelectedUnits,
    openUnitDropdown, setOpenUnitDropdown, selectedBatches, setSelectedBatches,
    openBatchDropdown, setOpenBatchDropdown,
  } = usePOSCart({
    activeTab, activeTabId, updateTab, inventory, userRole, showToastError, addNotification, playError,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    if (mergedCartItems.length > 0 && highlightedIndex === -1) {
      setHighlightedIndex(0);
    } else if (mergedCartItems.length === 0) {
      setHighlightedIndex(-1);
    } else if (highlightedIndex >= mergedCartItems.length) {
      setHighlightedIndex(mergedCartItems.length - 1);
    }
  }, [mergedCartItems.length]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearch((prev: string) => prev + e.key);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setSearch]);

  const { grossSubtotal, cartTotal, subtotal } = useMemo(() => {
    const gross = cart.reduce((sum, item) => {
      let unitPrice = item.price;
      if (item.isUnit && item.unitsPerPack) {
        unitPrice = item.price / item.unitsPerPack;
      }
      return sum + unitPrice * item.quantity;
    }, 0);
    const net = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const total = net * (1 - (globalDiscount || 0) / 100);
    return { grossSubtotal: gross, cartTotal: total, subtotal: gross };
  }, [cart, globalDiscount]);

  const {
    paymentMethod, setPaymentMethod, deliveryEmployeeId, setDeliveryEmployeeId,
    showDeliveryModal, setShowDeliveryModal, isCheckoutMode, setIsCheckoutMode,
    isDeliveryMode, setIsDeliveryMode, amountPaid, setAmountPaid, handleCheckout, isValidOrder,
  } = usePOSCheckout({
    cart, mergedCartItems, userRole, showToastError, addNotification, getVerifiedDate,
    activeTab, activeTabId, removeTab, onCompleteSale, customerName, customerCode,
    selectedCustomer, language, t, cartTotal, subtotal, globalDiscount,
  });

  const { totalDiscountAmount, orderDiscountPercent, totalItems } = useMemo(() => ({
    totalDiscountAmount: grossSubtotal - cartTotal,
    orderDiscountPercent: grossSubtotal > 0 ? ((grossSubtotal - cartTotal) / grossSubtotal) * 100 : 0,
    totalItems: mergedCartItems.filter((item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0).length,
  }), [grossSubtotal, cartTotal, mergedCartItems]);

  // Auto-scroll active item into view
  useEffect(() => {
    const activeRow = document.getElementById(`drug-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  // Auto-scroll active CART item into view
  useEffect(() => {
    if (highlightedIndex !== -1) {
      const activeCartRow = document.getElementById(`cart-item-${highlightedIndex}`);
      if (activeCartRow) {
        activeCartRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Auto-highlight last item when added
  const prevCartLengthRef = useRef(cart.length);
  useEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      // Item added - highlight the last one (which is usually at the bottom or top depending on sort? assumption: bottom/end of merged list)
      // mergedCartItems syncs with cart? Yes.
      // Wait, mergedCartItems might not be updated immediately in this render cycle if it depends on cart state which just updated?
      // mergedCartItems is a useMemo on [cart]. So it updates when cart updates.
      // So safe to set index to length - 1.
      if (mergedCartItems.length > 0) {
        setHighlightedIndex(mergedCartItems.length - 1);
      }
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length, mergedCartItems.length]);

  const { filteredDrugs } = usePOSSearchWorker({
    inventory,
    search,
    selectedCategory,
    stockFilter,
  });

  // Dynamic suggestions: generic names when @ prefix, else drug names (requires 2+ chars)
  const searchSuggestions = useMemo(() => {
    const trimmed = search.trim();
    const isGenericMode = search.trimStart().startsWith('@');
    const searchTermLength = isGenericMode
      ? search.trimStart().substring(1).trim().length
      : trimmed.length;

    // Only show suggestions after 2 characters
    if (searchTermLength < 2) return [];

    // Check if uppercase mode is enabled
    const isUppercase = textTransform === 'uppercase';

    // Filter inventory based on active category and stock filters first
    // Reusing the already filtered list eliminates a full O(N) scan.
    const filteredBase = filteredDrugs;

    let suggestions: string[];
    if (isGenericMode) {
      const generics = new Set<string>();
      filteredBase.forEach((d) => {
        if (d.genericName) generics.add(`@${d.genericName}`);
      });
      suggestions = Array.from(generics);
    } else {
      suggestions = filteredBase.map((d) => `${d.name} ${d.dosageForm}`);
    }

    // Apply uppercase transform if enabled
    return isUppercase ? suggestions.map((s) => s.toUpperCase()) : suggestions;
  }, [search, filteredDrugs, textTransform]);

  // Group drugs by name and sort batches by expiry
  const groupedDrugs = useMemo(() => {
    const groups: Record<string, Drug[]> = {};
    filteredDrugs.forEach((d) => {
      // Group by Name AND DosageForm to separate different forms
      const key = `${d.name}|${d.dosageForm || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    // Sort batches by expiry date (asc)
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    });

    return Object.values(groups);
  }, [filteredDrugs]);

  // Long Press Logic for Touch Devices

  // --- Cart Quantity Map (lightweight, updates on cart change) ---
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((c) => {
      map.set(c.id, (map.get(c.id) || 0) + c.quantity);
    });
    return map;
  }, [cart]);
  const cartQtyMapRef = useRef(cartQtyMap);
  cartQtyMapRef.current = cartQtyMap;

  // --- DataTable Configuration ---
  // PERF: tableData no longer depends on `cart`. This prevents rebuilding
  // thousands of row objects on every cart add/remove/quantity change.
  const tableData = useMemo(() => {
    return groupedDrugs.map((group) => {
      const first = group[0];
      return {
        id: first.id,
        ...first,
        group: group,
        totalStock: group.reduce((sum, d) => sum + d.stock, 0),
      };
    });
  }, [groupedDrugs]);

  // --- Precomputed Batches Map for Cart Items (Fix A) ---
  // PREVENTS O(N) inventory scans per SortableCartItem on every sidebar render
  const batchesMap = useMemo(() => {
    const map = new Map<string, Drug[]>();
    inventory.forEach((drug) => {
      const key = `${drug.name}|${drug.dosageForm}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(drug);
      } else {
        map.set(key, [drug]);
      }
    });
    // Sort all arrays in the map once
    map.forEach((batches) => {
      batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    });
    return map;
  }, [inventory]);

  // --- Keyboard Shortcuts & Navigation ---
  const isTableFocused = search.trim().length > 0 && tableData.length > 0;

  // Auto-focus Cart when Table focus is lost (transition from table to cart)
  const prevIsTableFocusedRef = useRef(isTableFocused);
  useEffect(() => {
    // Transition: was table focused, now not focused -> move to cart
    if (prevIsTableFocusedRef.current && !isTableFocused && mergedCartItems.length > 0) {
      setHighlightedIndex(0);
    }
    // Also handle initial case: table never focused and cart has items
    if (!isTableFocused && mergedCartItems.length > 0 && highlightedIndex === -1) {
      setHighlightedIndex(0);
    }
    prevIsTableFocusedRef.current = isTableFocused;
  }, [isTableFocused, mergedCartItems.length, highlightedIndex]);

  usePosShortcuts({
    enabled: true,
    focusMode: isTableFocused ? 'table' : 'cart',
    onTableNavigate: (direction) => {
      setActiveIndex((prev) => {
        const next = direction === 'up' ? prev - 1 : prev + 1;
        const clamped = Math.max(0, Math.min(next, tableData.length - 1));
        return clamped;
      });
    },
    onAddFromTable: () => {
      if (tableData[activeIndex]) {
        addGroupToCart(tableData[activeIndex].group);
        // Replicate existing behavior on selection: clear search and reset focus
        setSearch('');
        setActiveIndex(0);
        searchInputRef.current?.focus();
      }
    },
    onTab: () => {
      // Find the active cart item row and focus its first input
      if (highlightedIndex !== -1) {
        const row = document.getElementById(`cart-item-${highlightedIndex}`);
        if (row) {
          const firstInput = row.querySelector('input, button');
          if (firstInput) {
            (firstInput as HTMLElement).focus();
          }
        }
      }
    },
    onNavigate: (direction) => {
      if (mergedCartItems.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = direction === 'up' ? prev - 1 : prev + 1;
        const clamped = Math.max(0, Math.min(next, mergedCartItems.length - 1));
        if (clamped !== prev) {
          playClick();
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
      const useUnit = !item.pack;

      playBeep();
      updateQuantity(targetId, useUnit, delta);
    },
    onDelete: () => {
      if (highlightedIndex === -1 || !mergedCartItems[highlightedIndex]) return;
      const item = mergedCartItems[highlightedIndex];
      if (item.pack) removeFromCart(item.pack.id, false);
      if (item.unit) removeFromCart(item.unit.id, true);
      playClick();
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
    },
  });

  // --- TanStack Table Configuration ---
  const columnHelper = createColumnHelper<(typeof tableData)[0]>();

  const tableColumns = useMemo<ColumnDef<(typeof tableData)[0], any>[]>(
    () => [
      columnHelper.accessor('barcode', {
        header: t.code,
        size: 95,
        cell: (info) => (
          <span className='text-sm font-bold text-gray-700 dark:text-gray-300'>
            {info.row.original.internalCode || info.row.original.barcode}
          </span>
        ),
      }),
      columnHelper.accessor('name', {
        header: t.name,
        size: 400,
        meta: {
          headerAlign: language === 'AR' ? 'end' : 'start',
          disableAlignment: true,
        },
        cell: (info) => (
          <div className="flex flex-col w-full min-w-0 items-start text-start">
            <span className='font-bold text-sm text-gray-900 dark:text-gray-100 drug-name truncate'>
              {getDisplayName(info.row.original, textTransform)}
            </span>
            <span className='text-xs text-gray-500 whitespace-normal wrap-break-word w-full text-start' dir='auto'>
              {info.row.original.genericName && info.row.original.genericName.length > 35
                ? `${info.row.original.genericName.slice(0, 35)}…`
                : info.row.original.genericName}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        header: t.category,
        size: 120,
        cell: (info) => (
          <span className='text-xs text-gray-600 dark:text-gray-400'>{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('price', {
        header: t.price,
        size: 100,
        cell: (info) => (
          <span className='font-bold text-sm text-gray-700 dark:text-gray-300 tabular-nums'>
            <PriceDisplay value={info.getValue()} />
          </span>
        ),
      }),
      columnHelper.accessor('totalStock', {
        id: 'stock',
        header: t.stock,
        size: 100,
        cell: (info) => {
          const row = info.row.original;
          const mode = selectedUnits[row.id] || 'pack';
          const unitsPerPack = row.unitsPerPack || 1;

          if (info.getValue() <= 0) {
            return (
              <span className='inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800'>
                {t.outOfStock || 'Out of Stock'}
              </span>
            );
          }

          let displayValue;
          if (mode === 'unit') {
            displayValue = info.getValue(); // Show total units
          } else {
            // Show fractional packs
            const packs = info.getValue() / unitsPerPack;
            displayValue = parseFloat(packs.toFixed(2));
          }

          return (
            <span className='text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums'>
              {displayValue}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'unit',
        header: t.unit,
        size: 120,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className='w-full h-full flex items-center justify-center overflow-visible'>
              {row.unitsPerPack && row.unitsPerPack > 1 ? (
                <FilterDropdown
                  items={['pack', 'unit']}
                  selectedItem={selectedUnits[row.id] || 'pack'}
                  isOpen={openUnitDropdown === row.id}
                  onToggle={() => {
                    setOpenUnitDropdown(openUnitDropdown === row.id ? null : row.id);
                    setOpenBatchDropdown(null);
                  }}
                  onSelect={(item) =>
                    setSelectedUnits((prev) => ({
                      ...prev,
                      [row.id]: item as 'pack' | 'unit',
                    }))
                  }
                  keyExtractor={(item) => item as string}
                  renderItem={(item) => (
                    <div className='w-full px-2 text-sm font-bold text-center text-gray-700 dark:text-gray-300'>
                      {item === 'pack' ? t.pack : t.unit}
                    </div>
                  )}
                  renderSelected={(item) => (
                    <div className='w-full min-w-0 px-2 text-sm font-bold text-center truncate transition-colors'>
                      {item === 'pack' ? t.pack : t.unit}
                    </div>
                  )}
                  color={color}
                  className='h-7 w-20 mx-auto'
                  variant='input'
                  floating
                  minHeight={28}
                  zIndexHigh='z-60'
                  autoHideArrow
                />
              ) : (
                <span className='text-sm font-bold text-gray-700 dark:text-gray-300'>{t.pack}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'batches',
        header: t.batches,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          if (!row.group || row.group.length === 0)
            return <span className='text-xs text-gray-400'>-</span>;

          const selectedBatchId = selectedBatches[row.id];
          const defaultBatch = row.group.find((d: Drug) => d.stock > 0) || row.group[0];
          const displayBatch = selectedBatchId
            ? row.group.find((d: Drug) => d.id === selectedBatchId)
            : defaultBatch;

          if (row.group.length === 1) {
            const i = displayBatch;
            return (
              <div className='w-full h-full flex items-center justify-center'>
                <div className='text-sm font-bold text-gray-700 dark:text-gray-300'>
                  {i ? (
                    formatExpiryDate(i.expiryDate) + ` • ${formatStock(i.stock, i.unitsPerPack).replace(/ Packs?/g, '')}`
                  ) : (
                    <span className='inline-flex items-center px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-sm border border-red-100 dark:border-red-800/50'>
                      {t.noStock}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div className='w-full h-full flex items-center justify-center overflow-visible'>
              <FilterDropdown
                items={row.group}
                selectedItem={displayBatch}
                isOpen={openBatchDropdown === row.id}
                onToggle={() => {
                  setOpenBatchDropdown(openBatchDropdown === row.id ? null : row.id);
                  setOpenUnitDropdown(null);
                }}
                onSelect={(item) =>
                  setSelectedBatches((prev) => ({
                    ...prev,
                    [row.id]: (item as Drug).id,
                  }))
                }
                keyExtractor={(item) => (item as Drug).id}
                renderSelected={(item) => {
                  const i = item as Drug | undefined;
                  return (
                    <div className='w-full px-2 text-sm font-bold text-center truncate transition-colors'>
                      {i ? (
                        formatExpiryDate(i.expiryDate) +
                        ` • ${formatStock(i.stock, i.unitsPerPack).replace(/ Packs?/g, '')}`
                      ) : (
                        <span className='text-red-500'>{t.noStock}</span>
                      )}
                    </div>
                  );
                }}
                renderItem={(item) => {
                  const i = item as Drug;
                  return (
                    <div className='w-full px-2 text-sm font-bold text-center text-gray-700 dark:text-gray-300'>
                      {formatExpiryDate(i.expiryDate) +
                        ` • ${formatStock(i.stock, i.unitsPerPack).replace(/ Packs?/g, '')}`}
                    </div>
                  );
                }}
                onEnter={() => {
                  addGroupToCart(row.group);
                  setSearch('');
                  setActiveIndex(0);
                  searchInputRef.current?.focus();
                }}
                className='h-7 w-32 mx-auto'
                color={color}
                variant='input'
                floating
                minHeight={28}
                zIndexHigh='z-60'
                autoHideArrow
              />
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'inCart',
        header: t.inCart,
        size: 80,
        meta: { align: 'center' },
        cell: (info) => {
          // Computed lazily from ref — doesn't force table re-render on cart change
          const count = info.row.original.group.reduce(
            (sum: number, d: any) => sum + (cartQtyMapRef.current.get(d.id) || 0), 0
          );
          if (count <= 0) return null;
          return (
            <div
              className={`inline-block bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-md tabular-nums`}
            >
              {count}
            </div>
          );
        },
      }),
    ],
    [color, t, language, selectedUnits, openUnitDropdown, selectedBatches, openBatchDropdown, textTransform]
  );

  return (
    <div className='h-full flex flex-col gap-2'>
      <POSPageHeader
        t={t}
        color={color}
        tabs={tabs}
        activeTabId={activeTabId}
        switchTab={switchTab}
        removeTab={removeTab}
        addTab={addTab}
        renameTab={renameTab}
        togglePin={togglePin}
        reorderTabs={reorderTabs}
        maxTabs={maxTabs}
        setShowDeliveryModal={setShowDeliveryModal}
      />

      {/* Main POS Content */}
      <div className='flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden'>
        {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
        <div
          className={`flex-1 flex flex-col gap-2 h-full overflow-hidden ${
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Customer Details */}
          <POSCustomerPanel
            t={t}
            color={color}
            language={language}
            selectedCustomer={selectedCustomer}
            customerName={customerName}
            setCustomerName={setCustomerName}
            showCustomerDropdown={showCustomerDropdown}
            setShowCustomerDropdown={setShowCustomerDropdown}
            filteredCustomers={filteredCustomers}
            highlightedCustomerIndex={highlightedCustomerIndex}
            setHighlightedCustomerIndex={setHighlightedCustomerIndex}
            handleCustomerSelect={handleCustomerSelect}
            clearCustomerSelection={clearCustomerSelection}
            customerDropdownHook={customerDropdownHook}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
          />

          {/* Search & Filter - No Card Container */}
          <div className='w-full flex flex-col sm:flex-row gap-1 shrink-0'>
            {/* search length */}
            <div className='relative flex-6'>
              <SearchInput
                ref={searchInputRef}
                value={search}
                onSearchChange={(val) => {
                  setSearch(val);
                }}
                onClear={() => setSearch('')}
                enableAutocomplete={true}
                suggestions={searchSuggestions}
                placeholder={t.searchPlaceholder}
                color={color}
                className=''
                // Filter Integration
                filterConfigs={posFilterConfigs}
                activeFilters={posActiveFilters}
                onUpdateFilter={handlePosFilterUpdate}
                badge={
                  search.trim().length >= 2 ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider bg-transparent shadow-xs`}
                    >
                      <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>inventory_2</span>
                      {filteredDrugs.length}
                    </span>
                  ) : undefined
                }
                    
                    onKeyDown={(e) => {
                      const term = search.trim();
    
                      // --- Grid Navigation ---
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (groupedDrugs.length > 0) {
                          setActiveIndex((prev) => (prev + 1) % groupedDrugs.length);
                        }
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (groupedDrugs.length > 0) {
                          setActiveIndex(
                            (prev) => (prev - 1 + groupedDrugs.length) % groupedDrugs.length
                          );
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
                          const match = inventory.find(
                            (d) => d.barcode === term || (d.internalCode && d.internalCode === term)
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
                        ...(selection
                          ? [
                              {
                                label: t.copy,
                                icon: 'content_copy',
                                action: () => navigator.clipboard.writeText(selection),
                                danger: false,
                              },
                            ]
                          : []),
                        {
                          label: t.paste,
                          icon: 'content_paste',
                          action: async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              setSearch((prev) => prev + text);
                            } catch (err) {
                              console.error('Failed to read clipboard', err);
                            }
                          },
                          danger: false,
                        },
                        { separator: true } as any,
                        {
                          label: t.clear,
                          icon: 'backspace',
                          action: () => setSearch(''),
                          danger: false,
                        },
                      ]);
                    }}
                  />
            </div>
          </div>

          {/* Grid */}
          <div className='flex-1 flex flex-col overflow-hidden pb-24 lg:pb-0'>
            <TanStackTable
              tableId='pos-products-table-v2'
              data={tableData}
              columns={tableColumns}
              color={color}
              enableVirtualization={true}
              dense={true}
              onRowClick={(item) => addGroupToCart(item.group)}
              onRowLongPress={(e, item) => {
                showMenu(e.touches[0].clientX, e.touches[0].clientY, [
                  {
                    label: t.addToCart,
                    icon: 'add_shopping_cart',
                    action: () => addGroupToCart(item.group),
                    danger: false,
                  },
                  {
                    label: t.viewDetails,
                    icon: 'info',
                    action: () => setViewingDrug(item.group[0]),
                  },
                ]);
              }}
              onRowContextMenu={(e, item) => {
                showMenu(e.clientX, e.clientY, [
                  {
                    label: t.addToCart,
                    icon: 'add_shopping_cart',
                    action: () => addGroupToCart(item.group),
                    danger: false,
                  },
                  {
                    label: t.viewDetails,
                    icon: 'info',
                    action: () => setViewingDrug(item.group[0]),
                  },
                ]);
              }}
              searchPlaceholder={t.searchPlaceholder}
              emptyMessage={t.noResults}
              customEmptyState={
                search.trim() === '' ? (
                  <div className='h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8 select-none'>
                    <span className='material-symbols-rounded opacity-20' style={{ fontSize: '60px' }}>search</span>
                    <h2 className='text-2xl font-bold tracking-tight type-expressive'>
                      {t.searchPlaceholder}
                    </h2>
                    <p className='text-xs text-center max-w-xs opacity-70'>
                      {t.startSearching || 'Start searching for products to add them to cart'}
                    </p>
                  </div>
                ) : undefined
              }
              defaultHiddenColumns={['category', 'inCart']}
              defaultColumnAlignment={{
                barcode: 'start',
                name: 'start',
                category: 'center',
                price: 'center',
                stock: 'center',
                unit: 'center',
                batches: 'center',
              }}
              activeIndex={activeIndex}
              enableTopToolbar={false}
              enableSearch={false}
              manualFiltering={true}
              enablePagination={true}
              enableShowAll={true}
            />
          </div>
        </div>

        <POSCartSidebar
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          cart={cart}
          totalItems={totalItems}
          t={t}
          cartTotal={cartTotal}
          sidebarWidth={sidebarWidth}
          startResizing={startResizing}
          sidebarRef={sidebarRef}
          cartSensors={cartSensors}
          handleCartDragEnd={handleCartDragEnd}
          mergedCartItems={mergedCartItems}
          highlightedIndex={highlightedIndex}
          setHighlightedIndex={setHighlightedIndex}
          color={color}
          showMenu={showMenu}
          removeFromCart={removeFromCart}
          toggleUnitMode={toggleUnitMode}
          updateItemDiscount={updateItemDiscount}
          setGlobalDiscount={setGlobalDiscount}
          updateQuantity={updateQuantity}
          addToCart={addToCart}
          removeDrugFromCart={removeDrugFromCart}
          batchesMap={batchesMap}
          switchBatchWithAutoSplit={switchBatchWithAutoSplit}
          currentLang={currentLang}
          globalDiscount={globalDiscount}
          setSearch={setSearch}
          searchInputRef={searchInputRef}
          userRole={userRole}
          grossSubtotal={grossSubtotal}
          orderDiscountPercent={orderDiscountPercent}
          hasOpenShift={hasOpenShift}
          isCheckoutMode={isCheckoutMode}
          setIsCheckoutMode={setIsCheckoutMode}
          isDeliveryMode={isDeliveryMode}
          setIsDeliveryMode={setIsDeliveryMode}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          isValidOrder={isValidOrder}
          handleCheckout={handleCheckout}
          deliveryEmployeeId={deliveryEmployeeId}
          setDeliveryEmployeeId={setDeliveryEmployeeId}
          employees={employees}
          isRTL={isRTL}
        />

        {/* Product Details Modal */}
        {viewingDrug && (() => {
          const drugBatches = inventory.filter(d => 
            d.name === viewingDrug.name && d.dosageForm === viewingDrug.dosageForm
          ).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

          const substitutes = inventory.filter(d => 
            d.genericName === viewingDrug.genericName && d.id !== viewingDrug.id
          ).slice(0, 5);

          const totalStock = drugBatches.reduce((sum, d) => sum + d.stock, 0);

          return (
            <Modal
              isOpen={true}
              onClose={() => setViewingDrug(null)}
              size='6xl'
              zIndex={50}
              title={t.productDetails}
              icon='info'
            >
              <div className='flex flex-col gap-6 p-1' dir="ltr">
                {/* Header: Bilingual & Primary Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    <h2 className='text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight'>
                      {getDisplayName(viewingDrug, textTransform)}
                    </h2>
                    {viewingDrug.nameArabic && (
                      <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400" dir="rtl">
                        {getArabicDisplayName(viewingDrug)}
                      </h3>
                    )}
                    <p className='text-sm text-gray-500 font-medium italic'>{viewingDrug.genericName}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 text-center">
                      <span className="block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">{t.stock || 'Total Stock'}</span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{totalStock}</span>
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 text-center">
                      <span className="block text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 mb-0.5">{t.price || 'Price'}</span>
                      <span className="text-xl font-black text-primary-700 dark:text-primary-300 tabular-nums">
                        <PriceDisplay value={viewingDrug.price} />
                      </span>
                    </div>
                    {drugBatches[0] && (
                      <div className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 text-center min-w-[120px]">
                        <span className="block text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-0.5">{currentLang === 'ar' ? 'أقرب صلاحية' : 'Next Expiry'}</span>
                        <span className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums uppercase">
                          {new Date(drugBatches[0].expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Pharma & Identification */}
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                        {currentLang === 'ar' ? 'الملف الدوائي' : 'Pharma Profile'}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'الشركة' : 'Manufacturer'}</label>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{viewingDrug.manufacturer || '-'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'المنشأ' : 'Origin'}</label>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">{viewingDrug.origin || '-'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'الشكل الدوائي' : 'Dosage Form'}</label>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{viewingDrug.dosageForm || '-'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{currentLang === 'ar' ? 'التصنيف' : 'Class'}</label>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{viewingDrug.class || '-'}</span>
                        </div>
                      </div>
                      
                      {viewingDrug.activeIngredients && viewingDrug.activeIngredients.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-800/20">
                           <label className="block text-[9px] font-black text-primary-500 uppercase mb-2 tracking-widest">
                            {currentLang === 'ar' ? 'المواد الفعالة' : 'Active Ingredients'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {viewingDrug.activeIngredients.map((ing, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-lg bg-white dark:bg-gray-900 text-[10px] font-bold text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800 shadow-sm uppercase">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    <section>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {currentLang === 'ar' ? 'أكواد التعريف' : 'Identification'}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-bold text-gray-500">Barcode</span>
                          <span className="text-sm font-black tabular-nums tracking-tighter text-gray-800 dark:text-gray-100 leading-none">
                            {viewingDrug.barcode || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-bold text-gray-500">Internal Code</span>
                          <span className="text-sm font-black tabular-nums tracking-tighter text-gray-800 dark:text-gray-100 leading-none">
                            {viewingDrug.internalCode || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-bold text-gray-500">Database ID</span>
                          <span className="text-[10px] font-black tabular-nums text-gray-400 leading-none">
                            {viewingDrug.dbId || viewingDrug.id}
                          </span>
                        </div>
                        {viewingDrug.additionalBarcodes && viewingDrug.additionalBarcodes.length > 0 && (
                          <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-bold text-gray-500 mb-2">Additional Barcodes</span>
                            <div className="flex flex-wrap gap-1">
                              {viewingDrug.additionalBarcodes.map((bc, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[9px] font-bold tabular-nums">
                                  {bc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Inventory & Batches */}
                  <div className="space-y-6">
                    <section className="h-full flex flex-col">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {currentLang === 'ar' ? 'تتبع الصلاحيات والتشغيلات' : 'Batch Tracking'}
                      </h4>
                      <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                              <th className="px-4 py-2 font-black text-gray-500 uppercase">{currentLang === 'ar' ? 'تاريخ الصلاحية' : 'Expiry'}</th>
                              <th className="px-4 py-2 font-black text-gray-500 uppercase text-right">{currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {drugBatches.map((batch, idx) => {
                              const isExpiring = new Date(batch.expiryDate).getTime() < new Date().getTime() + (90 * 24 * 60 * 60 * 1000);
                              return (
                                <tr key={batch.id} className={idx === 0 ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold tabular-nums text-gray-700 dark:text-gray-300">
                                        {new Date(batch.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                                      </span>
                                      {isExpiring && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase">
                                          {currentLang === 'ar' ? 'قريب' : 'Soon'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className={`font-black tabular-nums ${batch.stock < 10 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {batch.stock}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </div>

                {/* Bottom Section: Substitutes & Business */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="lg:col-span-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      {currentLang === 'ar' ? 'البدائل المتاحة (نفس المادة الفعالة)' : 'Available Substitutes'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {substitutes.length > 0 ? substitutes.map(sub => (
                        <div 
                          key={sub.id}
                          onClick={() => setViewingDrug(sub)}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer transition-all group"
                        >
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 truncate max-w-[140px] uppercase">
                            {sub.name}
                          </div>
                          <div className="text-[10px] font-black text-primary-500">
                            <PriceDisplay value={sub.price} />
                          </div>
                        </div>
                      )) : (
                        <span className="text-xs text-gray-400 italic">{currentLang === 'ar' ? 'لا يوجد بدائل مسجلة بنفس المادة الفعالة' : 'No substitutes found with same generic name.'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      {currentLang === 'ar' ? 'بيانات إدارية' : 'Business Insights'}
                    </h4>
                    <div className="space-y-3">
                      {(userRole === 'admin' || userRole === 'pharmacist_owner') && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'سعر التكلفة:' : 'Cost Price:'}</span>
                          <span className="font-black tabular-nums text-gray-900 dark:text-gray-100">
                             <PriceDisplay value={viewingDrug.costPrice} />
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'الخصم الأقصى:' : 'Max Discount:'}</span>
                        <span className="bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg text-amber-700 dark:text-amber-400 font-black tabular-nums">
                          {viewingDrug.maxDiscount || 10}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-bold">{currentLang === 'ar' ? 'الترتيب الفرعي:' : 'Item Rank:'}</span>
                        <span className="text-gray-900 dark:text-gray-100 font-black tabular-nums">#{viewingDrug.itemRank || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Footer */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50">
                   <label className='text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest'>
                    {t.modal?.description || 'Description'}
                  </label>
                  <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium'>
                    {viewingDrug.description || t.modal?.noDescription || 'No detailed description available for this clinical record.'}
                  </p>
                </div>
              </div>


            </Modal>
          );
        })()}

        {/* Delivery Orders Modal */}
        <DeliveryOrdersModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          sales={sales}
          employees={employees}
          inventory={inventory}
          onUpdateSale={(saleId, updates) => {
            if (onUpdateSale) {
              onUpdateSale(saleId, updates);
            }
          }}
          color={color}
          t={t}
          currentEmployeeId={currentEmployeeId}
        />

        {/* Close Main POS Content div */}
      </div>
    </div>
  );
};
