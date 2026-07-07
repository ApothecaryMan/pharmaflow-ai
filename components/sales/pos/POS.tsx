import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UserRole } from '../../../config/permissions';
import { useAlert, useSettings } from '../../../context';
import { useAuthStore } from '../../../stores/authStore';
import { getLocationName } from '../../../data/locations';
import { useInventorySearch } from '../../../hooks/inventory/useInventorySearch';
import { useFilterDropdown } from '../../../hooks/layout/useFilterDropdown';
import { usePOSTabs } from '../../../hooks/sales/usePOSTabs';
import { useShift } from '../../../hooks/sales/useShift'; // Import useShift
import type { TRANSLATIONS } from '../../../i18n/translations';
import { permissionsService } from '../../../services/auth/permissionsService';
import { batchService, getGroupingKey } from '../../../services/inventory/batchService';
import { pricingService } from '../../../services/sales/pricingService';
import { inventorySearchEngine } from '../../../services/search/drugSearchService';
import type { CartItem, Customer, Drug, Employee, Language, Sale, Shift } from '../../../types';
import { getArabicDisplayName, getDisplayName } from '../../../utils/drugDisplayName';
import { formatExpiryDate, getExpiryColorClass } from '../../../utils/expiryUtils';
import { formatStock } from '../../../utils/inventory';
import { money } from '../../../utils/money';
import { parseSearchTerm } from '../../../utils/searchUtils';
import { resolveDisplayStock } from '../../../utils/stockUtils';

import { useContextMenu } from '../../common/ContextMenu';
import { FilterDropdown } from '../../common/FilterDropdown';
import type { FilterConfig } from '../../common/FilterPill';
import { usePosShortcuts } from '../../common/hooks/usePosShortcuts';
import { usePosSounds } from '../../common/hooks/usePosSounds';
import { Modal } from '../../common/Modal';
import { SearchEngineInput } from '../../common/SearchEngineInput';
import { SegmentedControl } from '../../common/SegmentedControl';
import { SmartAutocomplete } from '../../common/SmartInputs';
import { HoverDropdown } from '../../common/HoverDropdown';
import { PriceDisplay, TanStackTable } from '../../common/TanStackTable';
import { useStatusBar } from '../../layout/StatusBar';
import { DeliveryOrdersModal } from './DeliveryOrdersModal';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { usePOSCart } from './hooks/usePOSCart';
import { usePOSCheckout } from './hooks/usePOSCheckout';
import { usePOSCustomer } from './hooks/usePOSCustomer';
import { usePOSSearchAndFilters } from './hooks/usePOSSearchAndFilters';
import { usePOSSidebarResizer } from './hooks/usePOSSidebarResizer';
import { SortableCartItem } from './SortableCartItem';
import { ClosedTabsHistoryModal } from './ui/ClosedTabsHistoryModal';
import { POSCartSidebar } from './ui/POSCartSidebar';
import { POSCustomerHistoryModal } from './ui/POSCustomerHistoryModal';
import { POSCustomerPanel } from './ui/POSCustomerPanel';
import { POSDrugAnalytics } from './ui/POSDrugAnalytics';
import { POSDrugBranches } from './ui/POSDrugBranches';
import { POSDrugOverview } from './ui/POSDrugOverview';
import { POSPageHeader } from './ui/POSPageHeader';

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
  }) => Promise<{ success: boolean; sale?: Sale }>;
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

  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const isLoading = useAuthStore(s => s.isLoading);

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
    maxTabs,
    closedTabs,
    restoreTab,
  } = usePOSTabs(activeBranchId);

  const { currentShift, refreshShifts } = useShift();
  const hasOpenShift = !!currentShift;

  const { playBeep, playError, playSuccess, playClick } = usePosSounds();

  const { sidebarWidth, sidebarRef, startResizing } = usePOSSidebarResizer();

  const {
    search,
    setSearch,
    stockFilter,
    setStockFilter,
    selectedCategory,
    setSelectedCategory,
    activeFilterDropdown,
    setActiveFilterDropdown,
    posFilterConfigs,
    posActiveFilters,
    handlePosFilterUpdate,
    getBroadCategory,
  } = usePOSSearchAndFilters({ t, activeTab, activeTabId, updateTab });

  const {
    customerName,
    setCustomerName,
    customerCode,
    setCustomerCode,
    selectedCustomer,
    setSelectedCustomer,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers,
    setFilteredCustomers,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    showCodeDropdown,
    setShowCodeDropdown,
    filteredByCode,
    setFilteredByCode,
    handleCustomerSelect,
    clearCustomerSelection,
    customerDropdownHook,
  } = usePOSCustomer({ activeTab, activeTabId, updateTab, customers });

  const {
    cart,
    setCart,
    mergedCartItems,
    globalDiscount,
    setGlobalDiscount,
    addToCart,
    addGroupToCart,
    removeFromCart,
    removeDrugFromCart,
    switchBatchWithAutoSplit,
    updateQuantity,
    toggleUnitMode,
    updateItemDiscount,
    cartSensors,
    handleCartDragEnd,
    selectedUnits,
    setSelectedUnits,
    selectedBatches,
    setSelectedBatches,
  } = usePOSCart({
    activeTab,
    activeTabId,
    updateTab,
    inventory,
    showToastError,
    addNotification,
    playBeep,
    playError,
    t,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [viewingDrugTab, setViewingDrugTab] = useState<'overview' | 'branches' | 'analytics'>(
    'overview'
  );

  // Initialize Smart Barcode Scanner (Background Detection)
  // Callback to trim leaked characters from React state when scanner is detected
  const handleLeakedChars = useCallback((leakedCount: number) => {
    setSearch((prev: string) => prev.slice(0, -leakedCount));
  }, [setSearch]);

  const { isScanningRef } = useBarcodeScanner({
    inventory,
    addToCart,
    playSuccess,
    playError,
    enabled: hasOpenShift,
    onLeakedChars: handleLeakedChars,
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isClosedTabsModalOpen, setIsClosedTabsModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (mergedCartItems.length > 0 && !highlightedItemId) {
      setHighlightedItemId(mergedCartItems[0].id);
    } else if (mergedCartItems.length === 0) {
      setHighlightedItemId(null);
    } else if (highlightedItemId && !mergedCartItems.find((i) => i.id === highlightedItemId)) {
      // Fallback if item was removed: pick the last one or stay null
      setHighlightedItemId(
        mergedCartItems.length > 0 ? mergedCartItems[mergedCartItems.length - 1].id : null
      );
    }
  }, [mergedCartItems, highlightedItemId]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip when barcode scanner is actively scanning (fast-key burst detected)
      if (isScanningRef.current) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      )
        return;
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearch((prev: string) => prev + e.key);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setSearch]);

  const { grossSubtotal, cartTotal, subtotal, taxAmount } = useMemo(() => {
    const totals = pricingService.calculateOrderTotals(cart, globalDiscount || 0);
    return {
      grossSubtotal: totals.grossSubtotal,
      cartTotal: totals.finalTotal,
      subtotal: totals.grossSubtotal,
      taxAmount: totals.taxAmount,
    };
  }, [cart, globalDiscount]);

  const {
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
    deliveryFee,
    setDeliveryFee,
    handleCheckout,
    isValidOrder,
    isProcessing,
  } = usePOSCheckout({
    cart,
    mergedCartItems,
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
    playSuccess,
    activeBranchId,
    sales: sales || [],
    refreshShifts,
  });

  const { totalDiscountAmount, orderDiscountPercent, totalItems } = useMemo(() => {
    const discountAmt = money.subtract(grossSubtotal, cartTotal);
    const discountPct =
      grossSubtotal > 0 ? money.multiply(money.divide(discountAmt, grossSubtotal), 100, 0) : 0;

    return {
      totalDiscountAmount: discountAmt,
      orderDiscountPercent: discountPct,
      totalItems: mergedCartItems.filter(
        (item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0
      ).length,
    };
  }, [grossSubtotal, cartTotal, mergedCartItems]);

  // Auto-scroll active item into view
  useEffect(() => {
    const activeRow = document.getElementById(`drug-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  // Auto-scroll active CART item into view
  useEffect(() => {
    if (highlightedItemId) {
      const activeCartRow = document.getElementById(`cart-item-${highlightedItemId}`);
      if (activeCartRow) {
        // Use requestAnimationFrame to ensure the DOM has rendered the new state
        requestAnimationFrame(() => {
          activeCartRow.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        });
      }
    }
  }, [highlightedItemId]);

  // Auto-highlight last item when added
  const prevCartLengthRef = useRef(cart.length);
  useLayoutEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      // Item added - highlight the last one instantly before paint
      if (mergedCartItems.length > 0) {
        setHighlightedItemId(mergedCartItems[mergedCartItems.length - 1].id);
      }
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length, mergedCartItems.length]);

  const { filteredDrugs, totalResults } = useInventorySearch({
    inventory,
    search,
    category: selectedCategory,
    stockFilter,
    activeBranchId,
  });

  // --- Search Highlighting Logic ---
  const highlightRegex = useMemo(() => {
    if (!search.trim()) return null;
    const rawTerm = search.trimStart().replace(/^[@#]/, '').trim();
    if (!rawTerm) return null;
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(words.map((w) => `\\b${w}`).join('|'), 'gi');
  }, [search]);

  const highlightMatch = useCallback(
    (text: string, forceHighlight: boolean = true) => {
      // Only enable highlighting for scientific search (starting with @)
      if (!search.trimStart().startsWith('@')) return text;

      if (!highlightRegex || !text) return text;

      try {
        const regex = new RegExp(highlightRegex.source, highlightRegex.flags);
        const segments: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) segments.push(text.slice(lastIndex, match.index));
          segments.push(
            <span
              key={match.index}
              className='text-primary-600 dark:text-primary-400 bg-primary-500/10 rounded-sm px-0.5'
            >
              {match[0]}
            </span>
          );
          lastIndex = regex.lastIndex;
          if (match[0].length === 0) break;
        }

        if (lastIndex < text.length) segments.push(text.slice(lastIndex));
        return segments.length === 0 ? text : <>{segments}</>;
      } catch (e) {
        return text;
      }
    },
    [highlightRegex, search]
  );

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
          d.genericName.forEach((gn) => generics.add(`@${gn}`));
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
    return batchService.groupInventory(filteredDrugs).map((g) => ({
      ...g,
      id: g.groupId, // Use stable drug key as row ID for selection/shortcuts
    }));
  }, [filteredDrugs]);

  // --- Precomputed Batches Map for Cart Items (Fix A) ---
  // PREVENTS O(N) inventory scans per SortableCartItem on every sidebar render
  const batchesMap = useMemo(() => {
    const grouped = batchService.groupInventory(inventory);
    const map = new Map<string, Drug[]>();
    grouped.forEach((g) => {
      map.set(g.groupId, g.batches);
    });
    return map;
  }, [inventory]);

  // --- Product Details Memoized Data (Optimized & Service-Connected) ---
  const viewingDrugDetails = useMemo(() => {
    if (!viewingDrug) return null;

    // 1. Get Stock Summary from BatchService
    const summary = batchService.getDrugInventorySummary(viewingDrug, batchesMap);

    // 2. Get Substitutes from SearchEngine (Scientific Search)
    const substitutes = (
      inventorySearchEngine.searchByScientificName(viewingDrug.genericName) as Drug[]
    )
      .filter((d) => d.id !== viewingDrug.id)
      .slice(0, 5);

    const detailTabs = [
      {
        label: currentLang === 'ar' ? 'نظرة عامة' : 'Overview',
        value: 'overview',
        icon: 'dashboard',
      },
      {
        label: currentLang === 'ar' ? 'الفروع' : 'Branches',
        value: 'branches',
        icon: 'location_on',
      },
      ...(permissionsService.can('reports.view_financial')
        ? [
            {
              label: currentLang === 'ar' ? 'تحليلات' : 'Analytics',
              value: 'analytics',
              icon: 'analytics',
            },
          ]
        : []),
    ];

    return {
      sortedBatches: summary.batches,
      substitutes,
      totalStock: summary.totalStock,
      detailTabs,
    };
  }, [viewingDrug, inventory, batchesMap, currentLang]);

  // --- Keyboard Shortcuts & Navigation ---
  const isTableFocused = search.trim().length > 0 && tableData.length > 0;

  // Auto-focus Cart when Table focus is lost (transition from table to cart)
  const prevIsTableFocusedRef = useRef(isTableFocused);
  useEffect(() => {
    // Transition: was table focused, now not focused -> move to cart
    if (prevIsTableFocusedRef.current && !isTableFocused && mergedCartItems.length > 0) {
      setHighlightedItemId(mergedCartItems[0].id);
    }
    // Also handle initial case: table never focused and cart has items
    if (!isTableFocused && mergedCartItems.length > 0 && !highlightedItemId) {
      setHighlightedItemId(mergedCartItems[0].id);
    }
    prevIsTableFocusedRef.current = isTableFocused;
  }, [isTableFocused, mergedCartItems, highlightedItemId]);

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
        addGroupToCart(tableData[activeIndex].batches);
        // Replicate existing behavior on selection: clear search and reset focus
        setSearch('');
        setActiveIndex(0);
        searchInputRef.current?.focus();
      }
    },
    onTab: () => {
      // Find the active cart item row and focus its first input
      if (highlightedItemId) {
        const row = document.getElementById(`cart-item-${highlightedItemId}`);
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
      setHighlightedItemId((prevId) => {
        const currentIndex = mergedCartItems.findIndex((i) => i.id === prevId);
        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const clamped = Math.max(0, Math.min(nextIndex, mergedCartItems.length - 1));
        const newItem = mergedCartItems[clamped];
        if (newItem && newItem.id !== prevId) {
          playClick();
          return newItem.id;
        }
        return prevId;
      });
    },
    onQuantityChange: (delta) => {
      const item = mergedCartItems.find((i) => i.id === highlightedItemId);
      if (!highlightedItemId || !item) {
        playError();
        return;
      }
      const targetId = item.common.id;
      const useUnit = !item.pack;

      playBeep();
      updateQuantity(targetId, useUnit, delta);
    },
    onDelete: () => {
      const item = mergedCartItems.find((i) => i.id === highlightedItemId);
      if (!highlightedItemId || !item) return;
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
        size: 167,
        cell: (info) => (
          <span className='text-sm font-bold text-gray-700 dark:text-gray-300'>
            {info.row.original.internalCode || info.row.original.barcode}
          </span>
        ),
      }),
      columnHelper.accessor('name', {
        header: t.name,
        meta: {
          headerAlign: language === 'AR' ? 'end' : 'start',
          disableAlignment: true,
          flex: true,
        },
        cell: (info) => {
          const drug = info.row.original;
          const displayName = getDisplayName(drug, textTransform);
          const genericNameStr = Array.isArray(drug.genericName)
            ? drug.genericName.join(' + ')
            : String(drug.genericName || '');

          const isScientificSearch = search.trimStart().startsWith('@');

          return (
            <div className='flex flex-col w-full min-w-0 items-start text-start overflow-hidden'>
              <span className='font-bold text-sm text-gray-900 dark:text-gray-100 drug-name truncate w-full'>
                {displayName}
              </span>
              <span className='text-xs text-gray-500 w-full text-start truncate' dir='auto'>
                {highlightMatch(genericNameStr)}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('category', {
        header: t.category,
        size: 120,
        meta: { align: 'center' },
        cell: (info) => (
          <span className='text-xs text-gray-600 dark:text-gray-400'>{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('publicPrice', {
        header: t.publicPrice,
        size: 100,
        meta: { align: 'center' },
        cell: (info) => <PriceDisplay value={info.getValue()} />,
      }),
      columnHelper.accessor('totalStock', {
        id: 'stock',
        header: t.stock,
        size: 100,
        meta: { align: 'center' },
        cell: (info) => {
          const row = info.row.original;
          const mode = selectedUnits[row.id] || 'pack';
          const unitsPerPack = row.unitsPerPack || 1;

          if (info.getValue() <= 0) {
            return <span className='badge-danger'>{t.outOfStock || 'Out of Stock'}</span>;
          }

          const displayValue = resolveDisplayStock(
            info.getValue(),
            unitsPerPack,
            mode as 'pack' | 'unit'
          );

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
        meta: { align: 'center' },
        cell: (info) => {
          const row = info.row.original;
          const hasDual = row.unitsPerPack && row.unitsPerPack > 1;
          if (!hasDual) {
            return (
              <div className='w-full h-full flex items-center justify-center overflow-visible'>
                <span className='text-sm font-bold text-gray-700 dark:text-gray-300'>{t.pack}</span>
              </div>
            );
          }
          return (
            <div className='w-full h-full flex items-center justify-center overflow-visible'>
              <HoverDropdown
                trigger={
                  <div className='flex items-center justify-center font-bold h-7 w-20 mx-auto px-1.5 border-2 border-gray-300 dark:border-(--border-divider) rounded-md bg-(--bg-card) group-hover:bg-gray-200 dark:group-hover:bg-gray-600/80 cursor-pointer'>
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {selectedUnits[row.id] === 'unit' ? t.unit : t.pack}
                    </span>
                  </div>
                }
              >
                {(['pack', 'unit'] as const).map((opt) => {
                  const isSelected = (selectedUnits[row.id] || 'pack') === opt;
                  return (
                    <div
                      key={opt}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUnits((prev) => ({ ...prev, [row.id]: opt }));
                      }}
                      className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm font-bold text-center ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt === 'pack' ? t.pack : t.unit}
                    </div>
                  );
                })}
              </HoverDropdown>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'batches',
        header: t.batches,
        size: 150,
        meta: { align: 'center' },
        cell: (info) => {
          const row = info.row.original;
          const availableBatches = (row.batches || []).filter((d: Drug) => d.stock > 0);
          const selectedBatchId = selectedBatches[row.id];
          const selectedBatchWithInventory = selectedBatchId
            ? availableBatches.find((d: Drug) => d.id === selectedBatchId)
            : null;
          const defaultBatch = availableBatches[0];
          const displayBatch = selectedBatchWithInventory || defaultBatch;

          if (!row.batches || row.batches.length === 0) {
            return (
              <div className='w-full h-full flex items-center justify-center'>
                <span className='text-xs text-gray-400'>-</span>
              </div>
            );
          }
          if (availableBatches.length === 0) {
            return (
              <div className='w-full h-full flex items-center justify-center'>
                <span className='badge-danger'>{t.noStock || 'Out of Stock'}</span>
              </div>
            );
          }
          if (availableBatches.length === 1) {
            const b = availableBatches[0];
            return (
              <div className='w-full h-full flex items-center justify-center'>
                <div
                  className={`text-sm font-bold tabular-nums ${b ? getExpiryColorClass(b.expiryDate) : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {b ? (
                    formatExpiryDate(b.expiryDate) +
                    ` • ${formatStock(b.stock, b.unitsPerPack).replace(/ Packs?/g, '')}`
                  ) : (
                    <span className='badge-danger'>{t.noStock}</span>
                  )}
                </div>
              </div>
            );
          }

          const colorClass = getExpiryColorClass(displayBatch.expiryDate);
          return (
            <div className='w-full h-full flex items-center justify-center overflow-visible'>
              <HoverDropdown
                panelWidth='min-w-[180px]'
                panelClassName='space-y-0.5 p-1.5'
                trigger={
                  <div
                    className={`flex items-center justify-center font-bold ${colorClass} h-7 w-28 mx-auto px-1.5 border-2 border-gray-300 dark:border-(--border-divider) rounded-md bg-(--bg-card) group-hover:bg-gray-200 dark:group-hover:bg-gray-600/80 cursor-pointer`}
                  >
                    <span className='flex-1 text-center text-sm'>
                      {formatExpiryDate(displayBatch.expiryDate)}
                    </span>
                    <span className='w-px self-stretch bg-current opacity-20 shrink-0' />
                    <span className='flex-1 text-center text-sm tabular-nums'>
                      {formatStock(displayBatch.stock, displayBatch.unitsPerPack, {
                        packs: '',
                        outOfStock: t.outOfStockShort || 'Out',
                      }).trim()}
                    </span>
                  </div>
                }
              >
                <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1'>
                  {availableBatches.length} {t.batches || 'batches'}
                </div>
                {availableBatches.map((batch) => {
                  const isSelected = (selectedBatchWithInventory || defaultBatch)?.id === batch.id;
                  const c = getExpiryColorClass(batch.expiryDate);
                  return (
                    <div
                      key={batch.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatches((prev) => ({ ...prev, [row.id]: batch.id }));
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className={`font-bold w-[44px] text-center ${c}`}>
                        {formatExpiryDate(batch.expiryDate)}
                      </span>
                      <span className='ml-auto rtl:mr-auto rtl:ml-0 tabular-nums font-bold'>
                        {formatStock(batch.stock, batch.unitsPerPack, {
                          packs: '',
                          outOfStock: t.outOfStockShort || 'Out',
                        }).trim()}
                      </span>
                    </div>
                  );
                })}
              </HoverDropdown>
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
          const count = info.row.original.batches.reduce(
            (sum: number, d: any) => sum + (cartQtyMapRef.current.get(d.id) || 0),
            0
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
    [
      color,
      t,
      language,
      selectedUnits,
      selectedBatches,
      textTransform,
      highlightMatch,
      search,
    ]
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
            customers={customers}
            filteredCustomers={filteredCustomers}
            highlightedCustomerIndex={highlightedCustomerIndex}
            setHighlightedCustomerIndex={setHighlightedCustomerIndex}
            handleCustomerSelect={handleCustomerSelect}
            clearCustomerSelection={clearCustomerSelection}
            customerDropdownHook={customerDropdownHook}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onShowHistory={() => {
              setHistoryCustomer(selectedCustomer);
              setIsHistoryModalOpen(true);
            }}
          />

          {/* Search & Filter - No Card Container */}
          <div className='w-full flex flex-col sm:flex-row gap-1 shrink-0'>
            {/* search length */}
            <div className='relative flex-6'>
              <SearchEngineInput
                ref={searchInputRef}
                value={search}
                onSearchChange={(val) => {
                  setSearch(val);
                }}
                onClear={() => setSearch('')}
                suggestions={searchSuggestions}
                resultsCount={totalResults}
                placeholder={t.searchPlaceholder}
                color={color}
                className=''
                // Filter Integration
                filterConfigs={posFilterConfigs}
                activeFilters={posActiveFilters}
                onUpdateFilter={handlePosFilterUpdate}
                onKeyDown={(e) => {
                  const term = search.trim();

                  // --- Grid Navigation ---
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (tableData.length > 0) {
                      setActiveIndex((prev) => (prev + 1) % tableData.length);
                    }
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (tableData.length > 0) {
                      setActiveIndex((prev) => (prev - 1 + tableData.length) % tableData.length);
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
                      const match = inventorySearchEngine.searchByBarcode(term) as Drug;
                      if (match) {
                        addToCart(match);
                        setSearch('');
                        return;
                      }
                    }

                    // 2. Add Active Item
                    if (tableData.length > 0) {
                      const activeGroup = tableData[activeIndex];
                      addGroupToCart(activeGroup.batches);
                      setSearch('');
                      setActiveIndex(0);
                      // Ensure focus remains/returns to search (though it's already there)
                    }
                  }
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
              onRowClick={(item: any) => addGroupToCart(item.batches)}
              onRowLongPress={(e, item: any) => {
                showMenu(e.touches[0].clientX, e.touches[0].clientY, [
                  {
                    label: t.addToCart,
                    icon: 'add_shopping_cart',
                    action: () => addGroupToCart(item.batches),
                    danger: false,
                  },
                  {
                    label: t.viewDetails,
                    icon: 'info',
                    action: () => setViewingDrug(item.batches[0]),
                  },
                ]);
              }}
              onRowContextMenu={(e, item: any) => {
                showMenu(e.clientX, e.clientY, [
                  {
                    label: t.addToCart,
                    icon: 'add_shopping_cart',
                    action: () => addGroupToCart(item.batches),
                    danger: false,
                  },
                  {
                    label: t.viewDetails,
                    icon: 'info',
                    action: () => setViewingDrug(item.batches[0]),
                  },
                ]);
              }}
              searchPlaceholder={t.searchPlaceholder}
              emptyMessage={t.noResults}
              customEmptyState={
                search.trim() === '' ? (
                  <div className='h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8 select-none'>
                    <span
                      className='material-symbols-rounded opacity-20'
                      style={{ fontSize: '60px' }}
                    >
                      search
                    </span>
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
                publicPrice: 'center',
                stock: 'center',
                unit: 'center',
                batches: 'center',
              }}
              activeIndex={activeIndex}
              enableTopToolbar={false}
              enableSearch={false}
              isLoading={isLoading}
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
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
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
          deliveryFee={deliveryFee}
          setDeliveryFee={setDeliveryFee}
          isValidOrder={isValidOrder}
          handleCheckout={handleCheckout}
          deliveryEmployeeId={deliveryEmployeeId}
          setDeliveryEmployeeId={setDeliveryEmployeeId}
          employees={employees}
          isRTL={isRTL}
          paymentMethod={paymentMethod}
          isLoading={isLoading}
          isProcessing={isProcessing}
          taxAmount={taxAmount}
        />

        {/* Product Details Modal */}
        {viewingDrug && viewingDrugDetails && (
          <Modal
            isOpen={!!viewingDrug}
            onClose={() => {
              setViewingDrug(null);
              setViewingDrugTab('overview');
            }}
            size='6xl'
            title={t.productDetails}
            icon='info'
            tabs={viewingDrugDetails.detailTabs}
            activeTab={viewingDrugTab}
            onTabChange={setViewingDrugTab}
          >
            <div className='flex flex-col gap-6 p-1' dir='ltr'>
              {viewingDrugTab === 'overview' && (
                <POSDrugOverview
                  viewingDrug={viewingDrug}
                  drugBatches={viewingDrugDetails.sortedBatches}
                  substitutes={viewingDrugDetails.substitutes}
                  totalStock={viewingDrugDetails.totalStock}
                  t={t}
                  setViewingDrug={setViewingDrug}
                />
              )}

              {viewingDrugTab === 'branches' && <POSDrugBranches viewingDrug={viewingDrug} t={t} />}

              {viewingDrugTab === 'analytics' && (
                <POSDrugAnalytics viewingDrug={viewingDrug} t={t} />
              )}
            </div>
          </Modal>
        )}

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
            const drug = inventory.find(
              (d) => d.internalCode === code || d.barcode === code || d.id === code
            );
            if (drug) {
              const group = inventory.filter(
                (d) => d.name === drug.name && d.dosageForm === drug.dosageForm
              );
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
