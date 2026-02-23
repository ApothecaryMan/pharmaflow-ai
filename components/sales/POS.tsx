import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePosShortcuts } from '../../components/common/hooks/usePosShortcuts';
import { usePosSounds } from '../../components/common/hooks/usePosSounds';
import { canPerformAction, type UserRole } from '../../config/permissions';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert, useSettings } from '../../context';
import { getLocationName } from '../../data/locations';
import { useFilterDropdown } from '../../hooks/useFilterDropdown';
import { usePOSTabs } from '../../hooks/usePOSTabs';
import { useShift } from '../../hooks/useShift'; // Import useShift
import type { TRANSLATIONS } from '../../i18n/translations';
import type { CartItem, Customer, Drug, Employee, Language, Sale, Shift } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatStock } from '../../utils/inventory';
import { getPrinterSettings, printReceiptSilently } from '../../utils/qzPrinter';
import { parseSearchTerm } from '../../utils/searchUtils';
import { storage } from '../../utils/storage';
import { CARD_MD } from '../../utils/themeStyles';
import { useContextMenu } from '../common/ContextMenu';
import { FilterDropdown } from '../common/FilterDropdown';
import { type FilterConfig } from '../common/FilterPill';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartAutocomplete } from '../common/SmartInputs';
import { PriceDisplay, TanStackTable } from '../common/TanStackTable';
import { useStatusBar } from '../layout/StatusBar';
import { TabBar } from '../layout/TabBar';
import {
  generateInvoiceHTML,
  getActiveReceiptSettings,
  InvoiceTemplateOptions,
} from '../sales/InvoiceTemplate';
import { calculateItemTotal, SortableCartItem } from '../sales/SortableCartItem';
import { DeliveryOrdersModal } from './DeliveryOrdersModal';

import { usePOSSidebarResizer } from './hooks/usePOSSidebarResizer';
import { usePOSSearchAndFilters } from './hooks/usePOSSearchAndFilters';
import { usePOSCustomer } from './hooks/usePOSCustomer';
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

  const grossSubtotal = cart.reduce((sum, item) => {
    let unitPrice = item.price;
    if (item.isUnit && item.unitsPerPack) {
      unitPrice = item.price / item.unitsPerPack;
    }
    return sum + unitPrice * item.quantity;
  }, 0);

  const netItemTotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const cartTotal = netItemTotal * (1 - (globalDiscount || 0) / 100);
  const subtotal = grossSubtotal;

  const {
    paymentMethod, setPaymentMethod, deliveryEmployeeId, setDeliveryEmployeeId,
    showDeliveryModal, setShowDeliveryModal, isCheckoutMode, setIsCheckoutMode,
    isDeliveryMode, setIsDeliveryMode, amountPaid, setAmountPaid, handleCheckout, isValidOrder,
  } = usePOSCheckout({
    cart, mergedCartItems, userRole, showToastError, addNotification, getVerifiedDate,
    activeTab, activeTabId, removeTab, onCompleteSale, customerName, customerCode,
    selectedCustomer, language, t, cartTotal, subtotal, globalDiscount,
  });

  const totalDiscountAmount = grossSubtotal - cartTotal;
  const orderDiscountPercent = grossSubtotal > 0 ? (totalDiscountAmount / grossSubtotal) * 100 : 0;
  const totalItems = mergedCartItems.filter((item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0).length;

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

  const filteredDrugs = useMemo(() => {
    const { mode, regex } = parseSearchTerm(search);
    const trimmedSearch = search.trim();

    // Get search term without @ prefix for length check
    const searchTermForLength =
      mode === 'generic' ? search.trimStart().substring(1).trim() : trimmedSearch;

    return inventory.filter((d) => {
      const drugBroadCat = getBroadCategory(d.category);
      const matchesCategory = selectedCategory === 'All' || drugBroadCat === selectedCategory;

      let matchesSearch = false;

      // If search is empty, show nothing
      if (!trimmedSearch) {
        matchesSearch = false;
      }
      // Exact code match (barcode or internal code) - no minimum length
      else if (d.barcode === trimmedSearch || d.internalCode === trimmedSearch) {
        matchesSearch = true;
      }
      // Text search requires minimum 2 characters
      else if (searchTermForLength.length >= 2) {
        if (mode === 'generic') {
          matchesSearch = !!d.genericName && regex.test(d.genericName);
        } else {
          const searchableText = [
            d.name,
            // d.genericName, // Generic name excluded from default search
            d.dosageForm,
            d.category,
            d.description,
            ...(Array.isArray(d.activeIngredients) ? d.activeIngredients : []),
          ]
            .filter(Boolean)
            .join(' ');

          matchesSearch = regex.test(searchableText);
        }
      }

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && d.stock > 0) ||
        (stockFilter === 'out_of_stock' && d.stock <= 0);

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [inventory, search, selectedCategory, stockFilter]);

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
    const filteredBase = inventory.filter((d) => {
      const drugBroadCat = getBroadCategory(d.category);
      const matchesCategory = selectedCategory === 'All' || drugBroadCat === selectedCategory;

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && d.stock > 0) ||
        (stockFilter === 'out_of_stock' && d.stock <= 0);

      return matchesCategory && matchesStock;
    });

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
  }, [search, inventory, selectedCategory, stockFilter, textTransform]);

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

  // --- DataTable Configuration ---
  const tableData = useMemo(() => {
    return groupedDrugs.map((group) => {
      const first = group[0];
      return {
        id: first.id,
        ...first,
        group: group,
        totalStock: group.reduce((sum, d) => sum + d.stock, 0),
        inCartCount: group.reduce(
          (sum, d) => sum + (cart.find((c) => c.id === d.id)?.quantity || 0),
          0
        ),
      };
    });
  }, [groupedDrugs, cart]);

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
                    (i.expiryDate && !isNaN(new Date(i.expiryDate).getTime())
                      ? new Date(i.expiryDate).toLocaleDateString('en-US', {
                          month: '2-digit',
                          year: '2-digit',
                        })
                      : (i.expiryDate?.includes('/') && i.expiryDate.split('/')[1].length === 4 
                          ? `${i.expiryDate.split('/')[0]}/${i.expiryDate.split('/')[1].slice(-2)}`
                          : (i.expiryDate || '-'))) + ` • ${formatStock(i.stock, i.unitsPerPack).replace(/ Packs?/g, '')}`
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
                        (i.expiryDate && !isNaN(new Date(i.expiryDate).getTime())
                          ? new Date(i.expiryDate).toLocaleDateString('en-US', {
                              month: '2-digit',
                              year: '2-digit',
                            })
                          : (i.expiryDate?.includes('/') && i.expiryDate.split('/')[1].length === 4 
                              ? `${i.expiryDate.split('/')[0]}/${i.expiryDate.split('/')[1].slice(-2)}`
                              : (i.expiryDate || '-'))) +
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
                      {(i.expiryDate && !isNaN(new Date(i.expiryDate).getTime())
                        ? new Date(i.expiryDate).toLocaleDateString('en-US', {
                            month: '2-digit',
                            year: '2-digit',
                          })
                        : (i.expiryDate?.includes('/') && i.expiryDate.split('/')[1].length === 4 
                            ? `${i.expiryDate.split('/')[0]}/${i.expiryDate.split('/')[1].slice(-2)}`
                            : (i.expiryDate || '-'))) +
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
          const count = info.row.original.inCartCount;
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
      <div className='flex items-center gap-4 px-2 h-12 shrink-0'>
        {/* Header - Compact */}
        <h2 className='text-xl font-bold tracking-tight type-expressive shrink-0'>{t.posTitle}</h2>

        <button
          onClick={() => setShowDeliveryModal(true)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white dark:hover:text-white hover:border-primary-600 dark:hover:border-primary-500 transition-all duration-200 cursor-pointer shadow-xs`}
        >
          <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>local_shipping</span>
          {t.deliveryOrders || 'Delivery Orders'}
        </button>

        {/* Tab Bar - Takes remaining space */}
        <div className='flex-1 min-w-0'>
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
      <div className='flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden'>
        {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
        <div
          className={`flex-1 flex flex-col gap-2 h-full overflow-hidden ${
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Customer Details */}
          <div className={`${CARD_MD} p-3 border border-gray-200 dark:border-gray-800`}>
            {selectedCustomer ? (
              // Locked Customer Card
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in'>
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>person</span>
                  </div>
                  <div className='flex flex-col gap-0'>
                    <h3 className='font-bold text-gray-800 dark:text-gray-100 text-lg leading-none mb-0.5'>
                      {selectedCustomer.name}
                    </h3>
                    <div className='leading-none'>
                      <span className='text-xs font-bold font-mono text-gray-500 dark:text-gray-400'>
                        {selectedCustomer.code || `#${selectedCustomer.serialId}`}
                      </span>
                    </div>
                    <p className='text-sm text-gray-500 leading-tight mt-0.5'>
                      <span dir='ltr'>{selectedCustomer.phone}</span>
                    </p>
                  </div>
                </div>

                <div className='flex-1 border-s-2 border-gray-100 dark:border-gray-700 ps-6 ms-2 hidden sm:block'>
                  <p className='text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1'>
                    <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>location_on</span>
                    {t.address}
                  </p>
                  <div className='flex flex-col leading-snug'>
                    {selectedCustomer.streetAddress && (
                      <span className='text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5'>
                        {selectedCustomer.streetAddress}
                      </span>
                    )}
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {selectedCustomer.area
                        ? getLocationName(selectedCustomer.area, 'area', language as Language)
                        : ''}
                      {selectedCustomer.area && selectedCustomer.city ? ' - ' : ''}
                      {selectedCustomer.city
                        ? getLocationName(selectedCustomer.city, 'city', language as Language)
                        : ''}
                    </span>
                  </div>
                </div>

                <div className='flex flex-col gap-2 min-w-[140px]'>
                  <div className='flex items-center justify-between gap-2'>
                    <label className='block text-xs font-bold text-gray-400 uppercase'>
                      {t.paymentMethod}
                    </label>
                    <button
                      onClick={clearCustomerSelection}
                      className='text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 w-5 h-5 rounded-md'
                      title={t.changeCustomer}
                    >
                      <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>close</span>
                    </button>
                  </div>
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
                    color={color}
                    size='xs'
                    variant='onPage'
                    options={[
                      {
                        label: t.cash || 'Cash',
                        value: 'cash',
                        icon: 'payments',
                        activeColor: 'green',
                      },
                      {
                        label: t.visa || 'Visa',
                        value: 'visa',
                        icon: 'credit_card',
                        activeColor: 'blue',
                      },
                    ]}
                  />
                </div>
              </div>
            ) : (
              // Search Inputs
              <div className='flex flex-col sm:flex-row gap-3'>
                <div className='flex-1 relative' onBlur={customerDropdownHook.handleBlur}>
                  <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>
                    {t.customerInfo}
                  </label>
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
                    icon='person'
                    color={color}
                    className=''
                  />
                  {/* Customer Dropdown */}
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className='absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 max-h-48 overflow-y-auto'>
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
                          <span
                            className={`text-sm font-bold ${
                              index === highlightedCustomerIndex
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {customer.name}
                          </span>
                          <div className='flex gap-2 text-xs text-gray-500' dir='ltr'>
                            <span>{customer.phone}</span>
                            {customer.code && <span>• {customer.code}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='flex-none'>
                  <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>
                    {t.paymentMethod}
                  </label>
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
                    color={color}
                    size='sm'
                    variant='onPage'
                    options={[
                      {
                        label: t.cash || 'Cash',
                        value: 'cash',
                        icon: 'payments',
                        activeColor: 'green',
                      },
                      {
                        label: t.visa || 'Visa',
                        value: 'visa',
                        icon: 'credit_card',
                        activeColor: 'blue',
                      },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

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

        {/* Mobile Floating Cart Summary (Only in Products View) */}
        <div
          className={`lg:hidden fixed bottom-20 left-4 right-4 z-20 ${
            mobileTab === 'products' && cart.length > 0 ? 'block' : 'hidden'
          }`}
        >
          <button
            onClick={() => setMobileTab('cart')}
            className={`w-full p-3 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-200 dark:shadow-none flex items-center justify-between animate-slide-up active:scale-95 transition-transform`}
          >
            <div className='flex items-center gap-3'>
              <span className='bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold'>
                {totalItems}
              </span>
              <span className='font-medium text-sm'>{t.viewCart}</span>
            </div>
            <span className='font-bold text-base tabular-nums'>
              <PriceDisplay value={cartTotal} />
            </span>
          </button>
        </div>

        {/* Resize Handle (Desktop Only) */}
        <div
          className='hidden lg:flex w-4 h-full items-center justify-center cursor-col-resize group z-10 -mx-2'
          onMouseDown={startResizing}
          onTouchStart={startResizing}
        >
          <div className='w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors'></div>
        </div>

        {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
        <div
          ref={sidebarRef}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
          className={`w-full lg:w-(--sidebar-width) ${CARD_MD} border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-full ${
            mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className='p-3 space-y-2 shrink-0'>
            <div className='flex items-center justify-between'>
              <h2
                className={`text-sm font-bold text-primary-900 dark:text-primary-100 flex items-center gap-2`}
              >
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>shopping_cart</span>
                {t.cartTitle}
                {totalItems > 0 && (
                  <span
                    className={`bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1.5 rounded-full min-w-[30px] h-[18px] inline-flex justify-center items-center`}
                  >
                    {totalItems}
                  </span>
                )}
              </h2>

              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileTab('products')}
                className='lg:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          </div>

          <div
            className={`flex-1 p-2 space-y-2 cart-scroll ${cart.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
            dir='ltr'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
            }}
          >
            <style>{`
                .cart-scroll::-webkit-scrollbar {
                    width: 2px;
                    background: transparent;
                }
                .cart-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                }
                .cart-scroll::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.6);
                    border-radius: 9999px;
                }
                .cart-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
            `}</style>
            {cart.length === 0 ? (
              <div className='h-full flex flex-col items-center justify-center text-gray-400 space-y-2'>
                <span className='material-symbols-rounded text-4xl opacity-20'>
                  remove_shopping_cart
                </span>
                <p className='text-xs'>{t.emptyCart}</p>
                <button
                  onClick={() => setMobileTab('products')}
                  className={`lg:hidden px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium text-xs`}
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
                  items={mergedCartItems.map((group) => group.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {mergedCartItems.map((group, index) => {
                    // Using Drug ID as the sortable ID logic, assuming unique per drug
                    const itemId = group.id; // Or simple 'group.id' if unique
                    return (
                      <div
                        key={itemId}
                        id={`cart-item-${index}`}
                        className='w-full'
                        onClick={() => setHighlightedIndex(index)}
                        onMouseDown={() => setHighlightedIndex(index)}
                      >
                        <SortableCartItem
                          packItem={group.pack}
                          unitItem={group.unit}
                          commonItem={group.common}
                          itemId={itemId}
                          color={color}
                          t={t}
                          showMenu={showMenu}
                          removeFromCart={removeFromCart}
                          toggleUnitMode={toggleUnitMode}
                          updateItemDiscount={updateItemDiscount}
                          setGlobalDiscount={setGlobalDiscount}
                          updateQuantity={updateQuantity}
                          addToCart={addToCart}
                          removeDrugFromCart={removeDrugFromCart}
                          allBatches={inventory
                            .filter(
                              (d) =>
                                d.name === group.common.name &&
                                d.dosageForm === group.common.dosageForm
                            )
                            .sort(
                              (a, b) =>
                                new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                            )}
                          onSelectBatch={switchBatchWithAutoSplit}
                          isHighlighted={index === highlightedIndex}
                          currentLang={currentLang as 'en' | 'ar'}
                          globalDiscount={globalDiscount}
                          onSearchInTable={(term) => {
                            setSearch(term);
                            searchInputRef.current?.focus();
                          }}
                          userRole={userRole}
                        />
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className='px-3 py-2 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0'>
            {/* Summary Row - Horizontal Layout like Purchases */}
            <div className='flex items-center justify-between gap-2'>
              {
                /* Subtotal - Only show if different from total (i.e. if there's a discount or fee) */
                grossSubtotal !== cartTotal && (
                  <div className='flex items-center gap-2 ps-3'>
                    <span className='text-[10px] text-gray-500 font-medium uppercase'>
                      {t.subtotal}:
                    </span>
                    <span className='font-medium text-sm text-gray-700 dark:text-gray-300 tabular-nums'>
                      <PriceDisplay value={grossSubtotal} />
                    </span>
                  </div>
                )
              }

              {/* Discount */}
              {/* Discount - Only show if > 0 */}
              {orderDiscountPercent > 0 && (
                <div className='flex items-center gap-2 border-s border-gray-200 dark:border-gray-700 ps-3'>
                  <span className='text-[10px] text-gray-500 font-medium uppercase'>
                    {t.orderDiscount}:
                  </span>

                  {/* Order Discount % */}
                  <div className='flex items-center gap-1'>
                    <span className='font-medium text-sm text-gray-700 dark:text-gray-300 tabular-nums'>
                      {orderDiscountPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className='flex items-center gap-2 border-s border-gray-200 dark:border-gray-700 ps-3'>
                <span className='text-xs text-gray-500 font-bold uppercase whitespace-nowrap'>
                  {t.total}:
                </span>
                <span
                  className={`text-2xl font-black text-primary-600 dark:text-primary-400 h-8 flex items-center tabular-nums`}
                >
                  <PriceDisplay value={cartTotal} />
                </span>
              </div>
            </div>

            {/* Driver Selection UI Removed from here and moved into animated block */}

            {/* Checkout Area Container */}
            {!hasOpenShift ? (
              <div className='flex h-[42px] items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'>
                <div className='flex items-center gap-2 text-red-700 dark:text-red-300'>
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>warning</span>
                  <p className='text-xs font-medium'>
                    {t.noOpenShift || 'Open a shift before completing sales'}
                  </p>
                </div>
              </div>
            ) : (
              <div className='flex h-[42px] overflow-hidden'>
                {/* Standard Mode - Shrinks to 0 width when checkout or delivery active */}
                <div
                  className={`flex gap-2 transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isCheckoutMode || isDeliveryMode
                      ? 'w-0 opacity-0 overflow-hidden'
                      : 'w-full opacity-100'
                  }`}
                >
                  <button
                    onClick={() => {
                      setIsCheckoutMode(true);
                      setIsDeliveryMode(false);
                      setAmountPaid('');
                    }}
                    disabled={
                      !isValidOrder || !hasOpenShift || !canPerformAction(userRole, 'sale.checkout')
                    }
                    className={`flex-1 py-2.5 rounded-xl bg-primary-600 enabled:hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm transition-colors flex justify-center items-center gap-2 whitespace-nowrap`}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>payments</span>
                    {t.completeOrder}
                  </button>
                  <button
                    onClick={() => {
                      setIsDeliveryMode(true);
                      setIsCheckoutMode(false);
                    }}
                    disabled={
                      !isValidOrder || !hasOpenShift || !canPerformAction(userRole, 'sale.checkout')
                    }
                    className={`w-12 py-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 enabled:hover:bg-primary-200 dark:enabled:hover:bg-primary-900/50 disabled:opacity-50 disabled:pointer-events-none transition-colors flex justify-center items-center shrink-0`}
                    title={t.deliveryOrder}
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>local_shipping</span>
                  </button>
                </div>

                {/* Checkout Mode - Expands from 0 to full width */}
                <div
                  className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isCheckoutMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                  }`}
                >
                  {/* Amount Input */}
                  <div
                    className={`flex-1 bg-white dark:bg-gray-900 border border-primary-500 dark:border-primary-400 rounded-xl flex items-center px-3 gap-1 overflow-hidden whitespace-nowrap shadow-xs`}
                  >
                    <input
                      ref={(el) => {
                        if (el && isCheckoutMode) setTimeout(() => el.focus(), 50);
                      }}
                      type='number'
                      inputMode='decimal'
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={cartTotal.toString()}
                      className='flex-1 min-w-0 bg-transparent border-none focus:outline-hidden focus:ring-0 font-bold text-base text-gray-900 dark:text-white p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCheckout('walk-in');
                          setIsCheckoutMode(false);
                          setAmountPaid('');
                        }
                        if (e.key === 'Escape') {
                          setIsCheckoutMode(false);
                          setAmountPaid('');
                        }
                      }}
                    />
                  </div>

                  {/* Change Display */}
                  <div
                    className={`flex flex-col justify-center px-2 rounded-xl border min-w-[70px] transition-colors overflow-hidden whitespace-nowrap ${
                      (parseFloat(amountPaid) || 0) >= cartTotal
                        ? `bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700`
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className='text-[8px] text-gray-500 uppercase font-bold text-center'>
                      {t.remainder || 'Change'}
                    </span>
                    <span
                      className={`text-sm font-bold text-center tabular-nums ${
                        (parseFloat(amountPaid) || 0) >= cartTotal
                          ? `text-primary-600 dark:text-primary-400`
                          : 'text-gray-400'
                      }`}
                    >
                      <PriceDisplay
                        value={Math.max(0, (parseFloat(amountPaid) || 0) - cartTotal)}
                      />
                    </span>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={() => {
                      handleCheckout('walk-in');
                      setIsCheckoutMode(false);
                      setAmountPaid('');
                    }}
                    className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0`}
                  >
                    <span className='material-symbols-rounded'>check</span>
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setIsCheckoutMode(false);
                      setAmountPaid('');
                    }}
                    className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>

                {/* Delivery Driver Mode - Expands from 0 to full width */}
                <div
                  className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isDeliveryMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                  }`}
                >
                  {/* Driver Select */}
                  <div className={`flex-1 overflow-hidden relative`}>
                    <select
                      value={deliveryEmployeeId}
                      onChange={(e) => setDeliveryEmployeeId(e.target.value)}
                      className={`w-full h-full bg-white dark:bg-gray-900 border border-primary-400 dark:border-primary-500/50 rounded-xl text-sm px-3 focus:ring-0 focus:outline-hidden appearance-none cursor-pointer font-bold tabular-nums shadow-xs transition-all`}
                      style={{
                        backgroundImage:
                          'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: isRTL ? 'left .7em top 50%' : 'right .7em top 50%',
                        backgroundSize: '.65em auto',
                      }}
                    >
                      <option value=''>{t.selectDriver || 'Select Driver (Optional)'}</option>
                      {employees
                        .filter((e) => e.role === 'delivery')
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={() => {
                      handleCheckout('delivery', true);
                      setIsDeliveryMode(false);
                    }}
                    className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0`}
                  >
                    <span className='material-symbols-rounded'>check</span>
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setIsDeliveryMode(false);
                    }}
                    className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Modal */}
        {viewingDrug && (
          <Modal
            isOpen={true}
            onClose={() => setViewingDrug(null)}
            size='md'
            zIndex={50}
            title={t.productDetails}
            icon='info'
          >
            <div className='space-y-4'>
              <div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                  {viewingDrug.name}{' '}
                  {viewingDrug.dosageForm ? (
                    <span className='text-lg text-gray-500 font-normal'>
                      ({viewingDrug.dosageForm})
                    </span>
                  ) : (
                    ''
                  )}
                </h2>
                <p className='text-gray-500 font-medium'>{viewingDrug.genericName}</p>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='p-3 rounded-2xl bg-gray-50 dark:bg-gray-800'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>
                    {t.modal?.stock || 'Stock'}
                  </label>
                  <p
                    className={`text-xl font-bold ${
                      viewingDrug.stock === 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {viewingDrug.stock}
                  </p>
                </div>
                <div className='p-3 rounded-2xl bg-gray-50 dark:bg-gray-800'>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>
                    {t.modal?.price || 'Price'}
                  </label>
                  <p className='text-xl font-bold text-gray-700 dark:text-gray-300 tabular-nums'>
                    <PriceDisplay value={viewingDrug.price} />
                  </p>
                </div>
              </div>

              <div className='space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>{t.modal?.category || 'Category'}</span>
                  <span className='font-medium text-gray-900 dark:text-gray-100'>
                    {viewingDrug.category}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>{t.modal?.expiry || 'Expiry'}</span>
                  <span className='font-medium text-gray-900 dark:text-gray-100'>
                    {new Date(viewingDrug.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>{t.modal?.location || 'Location'}</span>
                  <span className='font-medium text-gray-900 dark:text-gray-100'>
                    {t.modal?.shelf || 'Shelf'} A-2
                  </span>
                </div>
              </div>

              <div>
                <label className='text-[10px] font-bold text-gray-400 uppercase mb-1 block'>
                  {t.modal?.description || 'Description'}
                </label>
                <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl'>
                  {viewingDrug.description || t.modal?.noDescription || 'No description available.'}
                </p>
              </div>
            </div>

            <div className='p-4 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800'>
              <button
                onClick={() => setViewingDrug(null)}
                className={`w-full py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-colors`}
              >
                {t.close}
              </button>
            </div>
          </Modal>
        )}

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
