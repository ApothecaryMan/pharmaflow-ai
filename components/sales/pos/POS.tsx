
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePosShortcuts } from '../../common/hooks/usePosShortcuts';
import { usePosSounds } from '../../common/hooks/usePosSounds';
import { type UserRole } from '../../../config/permissions';
import { permissionsService } from '../../../services/auth/permissions';
import { useAlert, useSettings } from '../../../context';
import { getLocationName } from '../../../data/locations';
import { useFilterDropdown } from '../../../hooks/useFilterDropdown';
import { usePOSTabs } from '../../../hooks/usePOSTabs';
import { useShift } from '../../../hooks/useShift'; // Import useShift
import { useData } from '../../../services/DataContext';
import type { TRANSLATIONS } from '../../../i18n/translations';
import type { CartItem, Customer, Drug, Employee, Language, Sale, Shift } from '../../../types';
import { getArabicDisplayName, getDisplayName } from '../../../utils/drugDisplayName';
import { formatStock } from '../../../utils/inventory';
import { resolvePrice } from '../../../utils/stockOperations';
import { parseSearchTerm } from '../../../utils/searchUtils';
import { formatExpiryDate, parseExpiryEndOfMonth } from '../../../utils/expiryUtils';

import { useContextMenu } from '../../common/ContextMenu';
import { FilterDropdown } from '../../common/FilterDropdown';
import { type FilterConfig } from '../../common/FilterPill';
import { Modal } from '../../common/Modal';
import { SearchInput } from '../../common/SearchInput';
import { SegmentedControl } from '../../common/SegmentedControl';
import { SmartAutocomplete } from '../../common/SmartInputs';
import { PriceDisplay, TanStackTable } from '../../common/TanStackTable';
import { useStatusBar } from '../../layout/StatusBar';
import { SortableCartItem } from './SortableCartItem';

import { POSPageHeader } from './ui/POSPageHeader';
import { POSCustomerPanel } from './ui/POSCustomerPanel';
import { POSCartSidebar } from './ui/POSCartSidebar';

import { DeliveryOrdersModal } from './DeliveryOrdersModal';
import { POSDrugOverview } from './ui/POSDrugOverview';
import { POSDrugBranches } from './ui/POSDrugBranches';
import { POSDrugAnalytics } from './ui/POSDrugAnalytics';
import { POSCustomerHistoryModal } from './ui/POSCustomerHistoryModal';
import { ClosedTabsHistoryModal } from './ui/ClosedTabsHistoryModal';

import { usePOSSidebarResizer } from './hooks/usePOSSidebarResizer';
import { usePOSSearchAndFilters } from './hooks/usePOSSearchAndFilters';
import { usePOSCustomer } from './hooks/usePOSCustomer';
import { usePOSSearchWorker } from './hooks/usePOSSearchWorker';
import { usePOSCart } from './hooks/usePOSCart';
import { usePOSCheckout } from './hooks/usePOSCheckout';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { pricingService } from '../../../services/sales/pricingService';


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
}) => {
  const { success, error: showToastError } = useAlert();
  const { showMenu } = useContextMenu();
  const { textTransform } = useSettings();
  const { getVerifiedDate, addNotification } = useStatusBar();
  const isRTL = (t as any).direction === 'rtl' || language === 'AR' || (language as any) === 'ar';
  const currentLang = isRTL ? 'ar' : 'en';

  const { activeBranchId } = useData();

  const {
    tabs, activeTab, activeTabId, addTab, removeTab,
    switchTab, updateTab, renameTab, togglePin, reorderTabs, maxTabs,
    closedTabs, restoreTab,
  } = usePOSTabs(activeBranchId);

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
    activeTab, activeTabId, updateTab, inventory, showToastError, addNotification, 
    playBeep, playError,
  });

  // Initialize Smart Barcode Scanner (Background Detection)
  useBarcodeScanner({
    inventory,
    addToCart,
    playSuccess,
    playError,
    enabled: hasOpenShift,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [viewingDrugTab, setViewingDrugTab] = useState<'overview' | 'branches' | 'analytics'>('overview');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isClosedTabsModalOpen, setIsClosedTabsModalOpen] = useState(false);
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
    const totals = pricingService.calculateOrderTotals(cart, globalDiscount || 0);
    return { 
      grossSubtotal: totals.grossSubtotal, 
      cartTotal: totals.finalTotal, 
      subtotal: totals.grossSubtotal 
    };
  }, [cart, globalDiscount]);

  const {
    paymentMethod, setPaymentMethod, deliveryEmployeeId, setDeliveryEmployeeId,
    showDeliveryModal, setShowDeliveryModal, isCheckoutMode, setIsCheckoutMode,
    isDeliveryMode, setIsDeliveryMode, amountPaid, setAmountPaid, handleCheckout, isValidOrder, isProcessing,
  } = usePOSCheckout({
    cart, mergedCartItems, showToastError, addNotification, getVerifiedDate,
    activeTab, activeTabId, removeTab, onCompleteSale, customerName, customerCode,
    selectedCustomer, language, t, cartTotal, subtotal, globalDiscount, playSuccess,
    activeBranchId,
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
        // Use requestAnimationFrame to ensure the DOM has rendered the new state
        requestAnimationFrame(() => {
          activeCartRow.scrollIntoView({ 
            behavior: 'smooth', 
            block: highlightedIndex === mergedCartItems.length - 1 ? 'end' : 'nearest' 
          });
        });
      }
    }
  }, [highlightedIndex, mergedCartItems.length]);

  // Auto-highlight last item when added
  const prevCartLengthRef = useRef(cart.length);
  useLayoutEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      // Item added - highlight the last one instantly before paint
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
    activeBranchId,
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
        if (Array.isArray(d.genericName)) {
          d.genericName.forEach(gn => generics.add(`@${gn}`));
        } else if (d.genericName) {
          generics.add(`@${d.genericName}`);
        }
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
      group.sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
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
      const drugKey = `${first.name}|${first.dosageForm || ''}`;
      return {
        id: drugKey, // Use stable drug key as row ID
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
      batches.sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
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
              {Array.isArray(info.row.original.genericName)
                ? info.row.original.genericName.join(' + ')
                : (info.row.original.genericName as any)}
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
          
          // Auto-fallback: Prefer the selected batch IF IT HAS STOCK, otherwise pick the earliest batch with stock
          const selectedBatchWithInventory = selectedBatchId 
            ? row.group.find((d: Drug) => d.id === selectedBatchId && d.stock > 0)
            : null;
            
          const defaultBatch = row.group.find((d: Drug) => d.stock > 0) || row.group[0];
          
          const displayBatch = selectedBatchWithInventory || defaultBatch;

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
        onOpenClosedHistory={() => setIsClosedTabsModalOpen(true)}
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
            onShowHistory={() => setIsHistoryModalOpen(true)}
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
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-(--bg-surface-neutral) text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-wider`}
                    >
                      {filteredDrugs.length} {t.resultsLabel}
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
              enablePagination={false}
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
                    <h1 className='text-2xl font-bold tracking-tight page-title'>
                      {t.searchPlaceholder}
                    </h1>
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
          paymentMethod={paymentMethod}
          isProcessing={isProcessing}
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

          const detailTabs = [
            { label: currentLang === 'ar' ? 'نظرة عامة' : 'Overview', value: 'overview', icon: 'dashboard' },
            { label: currentLang === 'ar' ? 'الفروع' : 'Branches', value: 'branches', icon: 'location_on' },
            ...(permissionsService.can('reports.view_financial') 
              ? [{ label: currentLang === 'ar' ? 'تحليلات' : 'Analytics', value: 'analytics', icon: 'analytics' }] 
              : []
            ),
          ];

          return (
            <Modal
              isOpen={true}
              onClose={() => {
                setViewingDrug(null);
                setViewingDrugTab('overview'); // Reset tab on close
              }}
              size='6xl'
              title={t.productDetails}
              icon='info'
              tabs={detailTabs}
              activeTab={viewingDrugTab}
              onTabChange={setViewingDrugTab}
            >
              <div className='flex flex-col gap-6 p-1' dir="ltr">
                {viewingDrugTab === 'overview' && (
                  <POSDrugOverview 
                    viewingDrug={viewingDrug}
                    drugBatches={drugBatches}
                    substitutes={substitutes}
                    totalStock={totalStock}
                    t={t}
                    setViewingDrug={setViewingDrug}
                  />
                )}
                
                {viewingDrugTab === 'branches' && (
                  <POSDrugBranches viewingDrug={viewingDrug} t={t} />
                )}

                {viewingDrugTab === 'analytics' && (
                  <POSDrugAnalytics viewingDrug={viewingDrug} t={t} />
                )}
              </div>
            </Modal>
          );
        })()}

        {/* Delivery Orders Modal */}
        <DeliveryOrdersModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          activeBranchId={activeBranchId}
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
          customers={customers}
          onViewCustomerHistory={(customer) => {
            console.log('[POS] Opening customer history for:', customer.name);
            setHistoryCustomer(customer);
            setIsHistoryModalOpen(true);
          }}
        />

        {/* Customer History Modal */}
        <POSCustomerHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryCustomer(null);
          }}
          customer={historyCustomer}
          sales={sales}
          color={color}
          t={t}
          language={language}
          onAddToCart={(code) => {
            const drug = inventory.find(d => d.internalCode === code || d.barcode === code || d.id === code);
            if (drug) {
              const group = inventory.filter(d => d.name === drug.name && d.dosageForm === drug.dosageForm);
              addGroupToCart(group);
              if (historyCustomer) {
                handleCustomerSelect(historyCustomer);
              }

              success(t.itemAdded || 'Item added to cart');
            }
          }}
        />

        {/* Closed Tabs History Modal */}
        <ClosedTabsHistoryModal
          isOpen={isClosedTabsModalOpen}
          onClose={() => setIsClosedTabsModalOpen(false)}
          closedTabs={closedTabs}
          onRestoreTab={restoreTab}
          t={t}
          isRTL={isRTL}
        />

        {/* Close Main POS Content div */}
      </div>
    </div>
  );
};
