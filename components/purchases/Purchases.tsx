import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import { canPerformAction, type UserRole } from '../../config/permissions';
import { useAlert } from '../../context';
import { useColumnReorder } from '../../hooks/useColumnReorder';
import { useLongPress } from '../../hooks/useLongPress';
import { settingsService } from '../../services';
import type { Drug, Purchase, PurchaseItem, PurchaseReturn, Supplier } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import {
  checkExpiryStatus,
  formatExpiryDisplay,
  getExpiryStatusConfig,
  getExpiryStatusStyle,
  parseExpiryDisplay,
  sanitizeExpiryInput,
} from '../../utils/expiryUtils';
import { formatStock } from '../../utils/inventory';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import { DatePicker } from '../common/DatePicker';
import { FilterDropdown } from '../common/FilterDropdown';
import { FloatingInput } from '../common/FloatingInput';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { Modal } from '../common/Modal';
import { SearchDropdown } from '../common/SearchDropdown';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { useSmartDirection } from '../common/SmartInputs';
import { TanStackTable } from '../common/TanStackTable';

interface PurchasesProps {
  inventory: Drug[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  onPurchaseComplete: (purchase: Purchase) => void;
  color: string;
  t: any;
  userRole: UserRole;
  onApprovePurchase?: (purchase: Purchase) => void;
  onRejectPurchase?: (purchase: Purchase) => void;
  language: 'EN' | 'AR';
}

export const Purchases: React.FC<PurchasesProps> = ({
  inventory,
  suppliers,
  purchases,
  purchaseReturns,
  onPurchaseComplete,
  color,
  t,
  userRole,
  onApprovePurchase,
  onRejectPurchase,
  language,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const { error: showToastError } = useAlert();
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Helper: Format time with Arabic AM/PM
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    const period = hours >= 12 ? t.time?.pm || 'PM' : t.time?.am || 'AM';
    return `${hour12}:${minuteStr} ${period}`;
  };

  // Initialize from localStorage
  const [cart, setCart] = useState<PurchaseItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchases_cart_items');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('purchases_cart_supplier') || '';
    }
    return '';
  });
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);

  const [focusedInput, setFocusedInput] = useState<{ id: string; field: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'out-stock'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedCartIndex, setSelectedCartIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchases_cart_selected');
      return saved ? parseInt(saved, 10) : -1;
    }
    return -1;
  });
  const [taxRate, setTaxRate] = useState(14); // Default 14%, loaded from settings

  const filterOptions = [
    { id: 'all', label: t.filters?.all || 'All' },
    { id: 'in-stock', label: t.filters?.inStock || 'In Stock' },
    { id: 'out-stock', label: t.filters?.outOfStock || 'Out Stock' },
  ];

  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sound effects
  const { playBeep } = usePosSounds();

  // Refs for keyboard navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Global Keydown - Focus search on alphanumeric key press + Arrow navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if already in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setShowSuggestions(false);
        }
        return;
      }

      // Arrow navigation for cart items
      if (e.key === 'ArrowDown' && cart.length > 0) {
        e.preventDefault();
        setSelectedCartIndex((prev) => (prev + 1) % cart.length);
        return;
      }
      if (e.key === 'ArrowUp' && cart.length > 0) {
        e.preventDefault();
        setSelectedCartIndex((prev) => (prev - 1 + cart.length) % cart.length);
        return;
      }

      // Capture Alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearch((prev) => prev + e.key);
        setShowSuggestions(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart.length]);

  // Auto-add on barcode match
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 4) return;

    const match = inventory.find((d) => d.barcode === trimmed || d.internalCode === trimmed);

    if (match) {
      handleAddItem(match);
      setSearch('');
      setShowSuggestions(false);
    }
  }, [search, inventory]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: string
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRowIndex = (rowIndex + 1) % cart.length;
      const nextInput = inputRefs.current[`${nextRowIndex}-${field}`];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
        setSelectedCartIndex(nextRowIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRowIndex = (rowIndex - 1 + cart.length) % cart.length;
      const prevInput = inputRefs.current[`${prevRowIndex}-${field}`];
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
        setSelectedCartIndex(prevRowIndex);
      }
    }
  };

  // Smart direction for inputs
  const supplierSearchDir = useSmartDirection(
    supplierSearch,
    t.placeholders?.searchSupplier || 'Search and select supplier...'
  );
  const drugSearchDir = useSmartDirection(search, t.searchDrug);

  // Invoice ID State
  // Invoice ID State
  const [invoiceId, setInvoiceId] = useState(() => {
    if (!purchases || purchases.length === 0) return 'INV-000001';

    // Find max ID
    const maxId = purchases.reduce((max, p) => {
      const match = p.invoiceId?.match(/INV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    return `INV-${String(maxId + 1).padStart(6, '0')}`;
  });
  const [externalInvoiceId, setExternalInvoiceId] = useState('');
  const externalInvoiceIdDir = useSmartDirection(
    externalInvoiceId,
    t.placeholders?.enterId || 'Enter ID'
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('credit');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'completed' | 'returned' | 'rejected'
  >('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const historySearchDir = useSmartDirection(
    historySearch,
    t.placeholders?.searchHistory || 'Search ID, Supplier...'
  );
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const searchSuggestionsRef = useRef<HTMLDivElement>(null);

  // Animation state for order ID (YouTube-style)
  const [isOrderIdAnimating, setIsOrderIdAnimating] = useState(false);
  const prevInvoiceId = useRef(invoiceId);

  useEffect(() => {
    if (invoiceId !== prevInvoiceId.current) {
      setIsOrderIdAnimating(true);
      prevInvoiceId.current = invoiceId;
      const timer = setTimeout(() => setIsOrderIdAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [invoiceId]);

  // Filter Logic
  const sortedHistory = useMemo(() => {
    let data = [...purchases].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Date Filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from).getTime();
      data = data.filter((p) => new Date(p.date).getTime() >= fromDate);
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to).getTime();
      data = data.filter((p) => new Date(p.date).getTime() <= toDate);
    }

    // Search Filter
    if (historySearch.trim()) {
      const { mode: searchMode, regex } = parseSearchTerm(historySearch);

      if (searchMode === 'ingredient' || searchMode === 'generic') {
        data = data.filter(
          (p) => p.items && p.items.some((item) => item.name && regex.test(item.name))
        );
      } else {
        data = data.filter(
          (p) =>
            (p.invoiceId && regex.test(p.invoiceId)) ||
            (p.externalInvoiceId && regex.test(p.externalInvoiceId)) ||
            (p.supplierName && regex.test(p.supplierName))
        );
      }
    }

    if (statusFilter === 'all') return data;

    return data.filter((p) => {
      if (statusFilter === 'returned') {
        // Check if any returns exist for this purchase
        return purchaseReturns.some((r) => r.purchaseId === p.id);
      }
      if (statusFilter === 'rejected') {
        return p.status === 'rejected';
      }
      if (statusFilter === 'completed') {
        // Completed ONLY if NO returns exist (otherwise it fits 'returned' filter)
        return p.status === 'completed' && !purchaseReturns.some((r) => r.purchaseId === p.id);
      }
      return p.status === statusFilter;
    });
  }, [purchases, statusFilter, purchaseReturns, dateRange, historySearch]);

  const filteredSearchSuggestions = useMemo(() => {
    const { mode, regex } = parseSearchTerm(historySearch);
    if (mode !== 'ingredient' && mode !== 'generic') return [];
    return (inventory || []).filter((d) => d.name && regex.test(d.name)).slice(0, 10);
  }, [historySearch, inventory]);

  const columns = useMemo<ColumnDef<Purchase>[]>(
    () => [
      {
        header: t.tableHeaders?.orderId || 'Order #',
        accessorKey: 'invoiceId',
        meta: { align: 'start' },
      },
      {
        header: t.tableHeaders?.invId || 'Inv #',
        accessorKey: 'externalInvoiceId',
        meta: { align: 'start' },
      },
      {
        header: t.tableHeaders?.date || 'Date',
        accessorKey: 'date',
        meta: { align: 'center' },
      },
      {
        header: t.tableHeaders?.supplier || 'Supplier',
        accessorKey: 'supplierName',
        cell: (info: any) => (
          <span className='text-sm font-bold text-gray-800 dark:text-gray-100'>
            {info.getValue()}
          </span>
        ),
      },
      {
        header: t.tableHeaders?.payment || 'Payment',
        accessorKey: 'paymentType',
        cell: (info: any) => {
          const type = info.getValue() as string;
          const config =
            type === 'cash'
              ? { color: 'emerald', icon: 'payments', label: t.cash || 'Cash' }
              : { color: 'blue', icon: 'credit_card', label: t.credit || 'Credit' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-xs'>{config.icon}</span>
              {config.label}
            </span>
          );
        },
      },
      {
        header: t.tableHeaders?.items || 'Items',
        accessorFn: (row: any) => row.items?.length || 0,
        cell: (info: any) => (
          <span className='text-xs text-gray-500 font-medium'>{info.getValue()}</span>
        ),
      },
      {
        header: t.tableHeaders?.discount || 'Discount',
        accessorFn: (p: any) => {
          const totalSale = p.items.reduce(
            (sum: number, i: any) => sum + i.salePrice * i.quantity,
            0
          );
          const totalCost = p.totalCost;
          const totalDiscount = totalSale - totalCost;
          return totalSale > 0 ? (totalDiscount / totalSale) * 100 : 0;
        },
        cell: (info: any) => {
          const val = info.getValue() as number;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-xs'>percent</span>
              {val.toFixed(1)}
            </span>
          );
        },
      },
      {
        header: t.tableHeaders?.total || 'Total',
        accessorKey: 'totalCost',
        cell: (info: any) => {
          const p = info.row.original;
          const returns = getPurchaseReturns(p.id);
          const hasReturns = returns.length > 0;
          const totalReturned = returns.reduce((sum, r) => sum + r.totalRefund, 0);
          return (
            <div className='flex flex-col items-end'>
              <span className='text-sm font-bold text-gray-900 dark:text-white'>
                ${info.getValue().toFixed(2)}
              </span>
              {hasReturns && (
                <span className='text-[10px] text-orange-600 dark:text-orange-400 font-medium'>
                  -${totalReturned.toFixed(2)} {t.detailsModal?.returnedLabel || 'returned'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: t.tableHeaders?.action || 'Status',
        id: 'status',
        accessorFn: (p: any) => {
          const hasReturns = getPurchaseReturns(p.id).length > 0;
          if (p.status === 'rejected') return 'REJECTED';
          if (p.status === 'pending') return 'PENDING';
          if (hasReturns) return 'RETURNED';
          return 'COMPLETED';
        },
        cell: (info: any) => {
          const status = info.getValue() as string;
          let config = {
            color: 'emerald',
            icon: 'check_circle',
            label: t.tooltips?.completed || 'Completed',
          };
          if (status === 'PENDING')
            config = { color: 'amber', icon: 'pending', label: t.tooltips?.pending || 'Pending' };
          else if (status === 'REJECTED')
            config = { color: 'red', icon: 'cancel', label: t.tooltips?.rejected || 'Rejected' };
          else if (status === 'RETURNED')
            config = {
              color: 'purple',
              icon: 'assignment_return',
              label: t.tooltips?.returned || 'Returned',
            };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-xs'>{config.icon}</span>
              {config.label}
            </span>
          );
        },
      },
    ],
    [t, language, purchaseReturns]
  );

  // Helper: Get returns for a purchase
  const getPurchaseReturns = (purchaseId: string) => {
    return purchaseReturns.filter((r) => r.purchaseId === purchaseId);
  };

  // Copy helper with fallback
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Helper: Get context menu actions for a purchase row
  const getRowContextActions = (purchase: Purchase) => [
    {
      label: t.contextMenu?.viewDetails || 'View Details',
      icon: 'visibility',
      action: () => setSelectedPurchase(purchase),
    },
    { separator: true },
    {
      label: t.contextMenu?.copyInvoice || 'Copy Invoice',
      icon: 'content_copy',
      action: () => copyToClipboard(purchase.invoiceId || ''),
    },
    {
      label: t.contextMenu?.copySupplier || 'Copy Supplier',
      icon: 'person',
      action: () => copyToClipboard(purchase.supplierName || ''),
    },
  ];

  // Row touch/long-press support
  const currentTouchRow = useRef<Purchase | null>(null);

  const {
    onTouchStart: onRowTouchStart,
    onTouchEnd: onRowTouchEnd,
    onTouchMove: onRowTouchMove,
  } = useLongPress({
    onLongPress: (e) => {
      if (currentTouchRow.current) {
        const touch = e.touches[0];
        showMenu(touch.clientX, touch.clientY, getRowContextActions(currentTouchRow.current));
      }
    },
  });

  // Sidebar Resize Logic with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchases_cart_width');
      return saved ? parseInt(saved) : 900; // Default lg:w-96 is 24rem = 384px
    }
    return 900;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('purchases_cart_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Persist Cart, Supplier, and Selected Index
  useEffect(() => {
    localStorage.setItem('purchases_cart_items', JSON.stringify(cart));
    localStorage.setItem('purchases_cart_supplier', selectedSupplierId);
    localStorage.setItem('purchases_cart_selected', selectedCartIndex.toString());
  }, [cart, selectedSupplierId, selectedCartIndex]);

  // Load tax rate from settings
  useEffect(() => {
    settingsService.get('purchaseTaxRate').then((rate) => {
      if (rate) setTaxRate(rate);
    });
  }, []);

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
      const isRTL =
        document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';

      let newWidth;
      if (isRTL) {
        // In RTL, sidebar is on the Left. Draggable edge is on the Right.
        // Width = Mouse Position - Left Edge
        newWidth = clientX - rect.left;
      } else {
        // In LTR, sidebar is on the Right. Draggable edge is on the Left.
        // Width = Right Edge - Mouse Position
        newWidth = rect.right - clientX;
      }

      // Max width constrained to middle of screen (approx 50vw)
      const maxWidth = window.innerWidth / 2;
      if (newWidth > 300 && newWidth < maxWidth) {
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

  // Click outside to close supplier dropdown
  useEffect(() => {
    if (!isSupplierOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSupplierOpen(false);
      }
      if (
        searchSuggestionsRef.current &&
        !searchSuggestionsRef.current.contains(event.target as Node)
      ) {
        setIsSearchSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSupplierOpen]);

  const handleAddItem = (drug: Drug) => {
    playBeep();
    setCart((prev) => {
      const existing = prev.find((i) => i.drugId === drug.id);
      if (existing) {
        // Update quantity and recalculate tax
        return prev.map((i) => {
          if (i.drugId === drug.id) {
            const newQty = i.quantity + 1;
            const newTax = Number((i.costPrice * newQty * (taxRate / 100)).toFixed(2));
            return { ...i, quantity: newQty, tax: newTax };
          }
          return i;
        });
      }

      const cost = drug.costPrice || 0;
      const sale = drug.price || 0;
      let initialDiscount = 0;

      // Auto-calculate discount if Sale > Cost
      if (sale > 0 && cost >= 0) {
        initialDiscount = ((sale - cost) / sale) * 100;
      }

      // Initial tax percentage from settings
      const initialTaxPercent = taxRate;

      return [
        ...prev,
        {
          drugId: drug.id,
          name: drug.name,
          quantity: 1,
          costPrice: cost,
          dosageForm: drug.dosageForm,
          salePrice: sale,
          discount: parseFloat(initialDiscount.toFixed(2)),
          expiryDate: '',
          tax: initialTaxPercent, // Tax as percentage
        },
      ];
    });
    // Select the newly added item (will be at the end of cart)
    setSelectedCartIndex(cart.length);
    setSearch(''); // Clear search on add
  };

  const updateItem = (drugId: string, field: keyof PurchaseItem, value: number | string) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.drugId !== drugId) return i;

        const updatedItem = { ...i, [field]: value };

        // Auto-format expiry date: 1125 -> 11/2025
        if (
          field === 'expiryDate' &&
          typeof value === 'string' &&
          value.length === 4 &&
          /^\d+$/.test(value)
        ) {
          const month = value.slice(0, 2);
          const year = value.slice(2);
          updatedItem.expiryDate = `${month}/20${year}`;
        }

        // Interdependent Calculation Logic
        if (field === 'discount') {
          const disc = typeof value === 'number' ? value : 0;
          updatedItem.costPrice = Number((i.salePrice * (1 - disc / 100)).toFixed(2));
          // Tax percentage stays the same, just the calculated amount changes
        } else if (field === 'costPrice') {
          const cost = typeof value === 'number' ? value : 0;
          if (i.salePrice > 0) {
            const disc = ((i.salePrice - cost) / i.salePrice) * 100;
            updatedItem.discount = Number(disc.toFixed(2));
          }
          // Tax percentage stays the same
        } else if (field === 'salePrice') {
          const sale = typeof value === 'number' ? value : 0;
          if (sale > 0 && i.costPrice >= 0) {
            const disc = ((sale - i.costPrice) / sale) * 100;
            updatedItem.discount = Number(disc.toFixed(2));
          } else {
            updatedItem.discount = 0;
          }
        } else if (field === 'quantity') {
          // Tax percentage stays the same, calculated amount updates automatically
        } else if (field === 'tax') {
          // Manual tax percentage edit
          updatedItem.tax = typeof value === 'number' ? value : 0;
        }

        return updatedItem;
      })
    );
  };

  const removeItem = (drugId: string) => {
    setCart((prev) => prev.filter((i) => i.drugId !== drugId));
  };

  // Helper: Generate unique order ID (auto-increment if duplicate)
  const getUniqueOrderId = (): string => {
    let currentId = invoiceId;
    let currentNum = parseInt(currentId.replace('INV-', ''), 10) || 0;

    // Check if current ID exists in purchases
    while (purchases.some((p) => p.invoiceId === currentId)) {
      currentNum++;
      currentId = `INV-${String(currentNum).padStart(6, '0')}`;
    }

    return currentId;
  };

  const handleConfirm = () => {
    if (!selectedSupplierId || cart.length === 0) return;

    // 1. Validate Invoice ID
    if (!externalInvoiceId || externalInvoiceId.trim() === '') {
      alert(t.alerts?.enterInvoice || 'Please enter the Invoice Number (Inv #) from the supplier.');
      return;
    }

    // 2. Check for duplicate Invoice ID
    const isDuplicate = purchases.some((p) => p.externalInvoiceId === externalInvoiceId.trim());
    if (isDuplicate) {
      alert(
        t.alerts?.duplicateInvoice ||
          'This Invoice ID already exists. Please enter a unique Invoice ID.'
      );
      return;
    }

    // 2. Validate Cart Items
    for (const item of cart) {
      if (!item.quantity || item.quantity <= 0) {
        alert(`Please enter a valid quantity for ${item.name}`);
        return;
      }
      if (!item.costPrice || item.costPrice <= 0) {
        alert(`Please enter a valid Cost Price for ${item.name}`);
        return;
      }
      if (!item.salePrice || item.salePrice <= 0) {
        alert(`Please enter a valid Sale Price for ${item.name}`);
        return;
      }
      if (!item.expiryDate) {
        alert(`Please enter an Expiry Date for ${item.name}`);
        return;
      }
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    // Get unique order ID (auto-increment if duplicate)
    const uniqueOrderId = getUniqueOrderId();

    const purchase: Purchase = {
      id: getVerifiedDate().getTime().toString(),
      date: getVerifiedDate().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + i.costPrice * i.quantity, 0),
      totalTax: cart.reduce((sum, i) => sum + i.costPrice * i.quantity * ((i.tax || 0) / 100), 0),
      status: 'completed',
      invoiceId: uniqueOrderId,
      externalInvoiceId,
      paymentType: paymentMethod,
    };

    if (!canPerformAction(userRole, 'purchase.create')) {
      showToastError('Permission Denied: Cannot complete purchase');
      return;
    }

    onPurchaseComplete(purchase);
    setCart([]);
    setSelectedSupplierId('');

    // Generate Next ID
    const nextNum = parseInt(uniqueOrderId.replace('INV-', ''), 10) + 1;
    setInvoiceId(`INV-${String(nextNum).padStart(6, '0')}`);
    setExternalInvoiceId('');
  };

  const handlePendingPO = () => {
    if (!selectedSupplierId || cart.length === 0) return;

    // 1. Validate Invoice ID
    if (!externalInvoiceId || externalInvoiceId.trim() === '') {
      alert(t.alerts?.enterInvoice || 'Please enter the Invoice Number (Inv #) from the supplier.');
      return;
    }

    // 2. Check for duplicate Invoice ID
    const isDuplicate = purchases.some((p) => p.externalInvoiceId === externalInvoiceId.trim());
    if (isDuplicate) {
      alert(
        t.alerts?.duplicateInvoice ||
          'This Invoice ID already exists. Please enter a unique Invoice ID.'
      );
      return;
    }

    // 2. Validate Cart Items
    for (const item of cart) {
      if (!item.quantity || item.quantity <= 0) {
        alert(`Please enter a valid quantity for ${item.name}`);
        return;
      }
      if (!item.costPrice || item.costPrice <= 0) {
        alert(`Please enter a valid Cost Price for ${item.name}`);
        return;
      }
      if (!item.salePrice || item.salePrice <= 0) {
        alert(`Please enter a valid Sale Price for ${item.name}`);
        return;
      }
      if (!item.expiryDate) {
        alert(`Please enter an Expiry Date for ${item.name}`);
        return;
      }
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    // Get unique order ID (auto-increment if duplicate)
    const uniqueOrderId = getUniqueOrderId();

    const purchase: Purchase = {
      id: getVerifiedDate().getTime().toString(),
      date: getVerifiedDate().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + i.costPrice * i.quantity, 0),
      totalTax: cart.reduce((sum, i) => sum + i.costPrice * i.quantity * ((i.tax || 0) / 100), 0),
      status: 'pending',
      invoiceId: uniqueOrderId,
      externalInvoiceId,
      paymentType: paymentMethod,
    };

    if (!canPerformAction(userRole, 'purchase.create')) {
      showToastError('Permission Denied: Cannot complete purchase');
      return;
    }

    onPurchaseComplete(purchase);
    setCart([]);
    setSelectedSupplierId('');

    // Generate Next ID
    const nextNum = parseInt(uniqueOrderId.replace('INV-', ''), 10) + 1;
    setInvoiceId(`INV-${String(nextNum).padStart(6, '0')}`);
    setExternalInvoiceId('');
  };

  const { mode: searchMode, regex } = parseSearchTerm(search);

  const filteredDrugs = (inventory || [])
    .filter((d) => {
      // 1. Stock Filter
      if (filter === 'in-stock' && d.stock <= 0) return false;
      if (filter === 'out-stock' && d.stock > 0) return false;

      // 2. Search Filter
      if (searchMode === 'ingredient') {
        return d.activeIngredients && d.activeIngredients.some((ing) => regex.test(ing));
      }

      const searchableText =
        d.name +
        ' ' +
        (d.dosageForm || '') +
        ' ' +
        (d.internalCode || '') +
        ' ' +
        (d.barcode || '');
      return regex.test(searchableText);
    })
    .slice(0, 30); // Limit to 30 results for performance

  // Filter suppliers by search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const searchLower = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(searchLower) || s.id.toLowerCase().includes(searchLower)
    );
  }, [suppliers, supplierSearch]);

  return (
    <div className='h-full flex flex-col gap-2 animate-fade-in overflow-hidden'>
      {/* Header with toggle */}
      <div className='flex justify-between items-center px-2 flex-shrink-0'>
        <div>
          <div className='flex items-center gap-3'>
            <h2 className='text-2xl font-bold tracking-tight type-expressive'>
              {mode === 'create' ? t.title : t.historyTitle}
            </h2>
          </div>
          <p className='text-sm text-gray-500'>{t.subtitle}</p>
        </div>
        <div className='flex items-center gap-2'>
          {/* Status Filter (History Mode Only) */}
          {mode === 'history' && (
            <>
              <div className='flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl me-2'>
                <DatePicker
                  value={dateRange.from}
                  onChange={(val) => setDateRange((prev) => ({ ...prev, from: val }))}
                  label={t.fromDate || 'From'}
                  color='gray'
                  icon='calendar_today'
                  translations={{
                    cancel: t.cancel || 'Cancel',
                    ok: t.ok || 'OK',
                    hour: t.hour || 'Hour',
                    minute: t.minute || 'Minute',
                    am: t.time?.am || t.am || 'AM',
                    pm: t.time?.pm || t.pm || 'PM',
                  }}
                />
                <span className='text-gray-400 material-symbols-rounded px-1 text-lg rtl:rotate-180'>
                  arrow_forward
                </span>
                <DatePicker
                  value={dateRange.to}
                  onChange={(val) => setDateRange((prev) => ({ ...prev, to: val }))}
                  label={t.toDate || 'To'}
                  color='gray'
                  icon='event'
                  translations={{
                    cancel: t.cancel || 'Cancel',
                    ok: t.ok || 'OK',
                    hour: t.hour || 'Hour',
                    minute: t.minute || 'Minute',
                    am: t.time?.am || t.am || 'AM',
                    pm: t.time?.pm || t.pm || 'PM',
                  }}
                />
              </div>
            </>
          )}

          <SegmentedControl
            value={mode}
            onChange={(val) => setMode(val as 'create' | 'history')}
            color={color}
            shape='pill'
            size='sm'
            options={[
              { label: t.newPurchase, value: 'create' },
              { label: t.viewHistory, value: 'history' },
            ]}
          />
        </div>
      </div>

      {mode === 'create' ? (
        <div className='flex flex-col gap-4 h-full overflow-hidden'>
          {/* TOP: Search Controls */}
          <div
            className={`${CARD_BASE} p-4 rounded-xl flex flex-col xl:flex-row gap-4 items-end flex-shrink-0`}
          >
            {/* Drug Search & Filter */}
            <div className='flex-[1.5] w-full flex gap-2'>
              <FilterDropdown
                items={filterOptions}
                selectedItem={filterOptions.find((o) => o.id === filter)}
                isOpen={isFilterOpen}
                onToggle={() => setIsFilterOpen(!isFilterOpen)}
                onSelect={(item) => {
                  setFilter(item.id as any);
                  setIsFilterOpen(false);
                }}
                keyExtractor={(item) => item.id}
                renderItem={(item, isSelected) => (
                  <div className='flex items-center justify-between w-full'>
                    <span>{item.label}</span>
                    {isSelected && <span className='material-symbols-rounded text-sm'>check</span>}
                  </div>
                )}
                renderSelected={(item) => item?.label}
                className='w-32 h-[42px]'
                variant='input'
                color={color}
              />

              <div className='relative flex-1' ref={searchRef}>
                <SearchInput
                  ref={searchInputRef}
                  value={search}
                  onSearchChange={(val) => {
                    setSearch(val);
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (selectedSuggestionIndex >= 0 && filteredDrugs[selectedSuggestionIndex]) {
                        handleAddItem(filteredDrugs[selectedSuggestionIndex]);
                      } else if (filteredDrugs.length > 0) {
                        handleAddItem(filteredDrugs[0]);
                      }
                      setShowSuggestions(false);
                      setSearch('');
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) => (prev + 1) % filteredDrugs.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedSuggestionIndex(
                        (prev) => (prev - 1 + filteredDrugs.length) % filteredDrugs.length
                      );
                    }
                  }}
                  placeholder={t.placeholders?.searchDrug || 'Search products...'}
                  className={`w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-[42px] focus:ring-${color}-500 focus:border-${color}-500`}
                />

                <SearchDropdown
                  results={filteredDrugs}
                  onSelect={(drug) => {
                    handleAddItem(drug);
                    setSearch('');
                  }}
                  columns={[
                    {
                      header: t.headers?.codes || 'Codes',
                      width: 'w-32 shrink-0',
                      className: 'text-gray-900 dark:text-gray-400 justify-center text-center',
                      render: (drug: Drug) => drug.barcode || drug.internalCode || '---',
                    },
                    {
                      header: t.headers?.name || 'Name',
                      width: 'flex-1',
                      className: 'text-gray-900 dark:text-gray-400',
                      render: (drug: Drug) => (
                        <span className={`truncate`}>{getDisplayName(drug)}</span>
                      ),
                    },
                    {
                      header: t.headers?.expiry || 'Expiry',
                      width: 'w-24 shrink-0',
                      className: 'justify-center text-center text-gray-900 dark:text-gray-400',
                      render: (drug: Drug) => {
                        if (!drug.expiryDate) return '---';
                        const date = new Date(drug.expiryDate);
                        if (isNaN(date.getTime())) return drug.expiryDate;
                        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
                      },
                    },
                    {
                      header: t.headers?.stock || 'Stock',
                      width: 'w-[60px] shrink-0',
                      className: 'justify-center text-center text-gray-900 dark:text-gray-400',
                      render: (drug: Drug) => (
                        <div className='tabular-nums border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 rounded-lg shrink-0 min-w-[36px] text-center'>
                          {drug.stock}
                        </div>
                      ),
                    },
                  ]}
                  isVisible={showSuggestions && !!search.trim()}
                  emptyMessage={t.noResults}
                />
              </div>
            </div>

            {/* Supplier Select */}
            <div className='flex-1 w-full'>
              <label className='text-xs font-bold text-gray-400 uppercase mb-2 block'>
                {t.selectSupplier}
              </label>

              <div ref={supplierDropdownRef} className='relative'>
                <SearchInput
                  value={
                    supplierSearch ||
                    (selectedSupplierId
                      ? suppliers.find((s) => s.id === selectedSupplierId)?.name
                      : '') ||
                    ''
                  }
                  onSearchChange={(val) => {
                    setSupplierSearch(val);
                    setSelectedSupplierId('');
                    if (!isSupplierOpen) setIsSupplierOpen(true);
                  }}
                  onFocus={() => setIsSupplierOpen(true)}
                  // Clear handled via value update, explicit functionality if needed
                  dir={supplierSearchDir}
                  placeholder={t.placeholders?.searchSupplier || 'Search and select supplier...'}
                  className={`w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-[42px] focus:ring-${color}-500 focus:border-${color}-500`}
                />

                <SearchDropdown
                  results={filteredSuppliers}
                  onSelect={(supplier) => {
                    setSelectedSupplierId(supplier.id);
                    setSupplierSearch('');
                    setIsSupplierOpen(false);
                  }}
                  columns={[
                    {
                      header: t.headers?.name || 'Name',
                      width: 'flex-1',
                      className: 'text-gray-900 dark:text-gray-400',
                      render: (supplier: Supplier) => (
                        <span className='truncate'>{supplier.name}</span>
                      ),
                    },
                    {
                      header: t.headers?.codes || 'Codes',
                      width: 'w-24 shrink-0',
                      className: 'text-gray-900 dark:text-gray-400 justify-center text-center',
                      render: (supplier: Supplier) => supplier.id,
                    },
                  ]}
                  isVisible={isSupplierOpen}
                  emptyMessage={t.noResults || 'No suppliers found'}
                />
              </div>
            </div>
          </div>
          {/* BOTTOM: Order Cart */}
          <div className={`flex-1 ${CARD_BASE} p-5 rounded-3xl flex flex-col overflow-hidden`}>
            <div className='flex justify-between items-center mb-4 gap-4'>
              {/* Left: Selected Item Details (Existing Inventory) */}
              <div className='flex-1 min-w-0'>
                {(() => {
                  if (selectedCartIndex === -1 || !cart[selectedCartIndex]) return null;
                  const selectedItem = cart[selectedCartIndex];
                  const invItem = inventory.find((d) => d.id === selectedItem.drugId);
                  if (!invItem) return null;

                  const profit =
                    invItem.costPrice > 0
                      ? ((invItem.price - invItem.costPrice) / invItem.costPrice) * 100
                      : 0;

                  return (
                    <div className='flex items-center gap-3 animate-fadeIn'>
                      {/* Stock */}
                      <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50'>
                        <span className='material-symbols-rounded text-gray-400 text-lg'>
                          inventory_2
                        </span>
                        <div className='flex flex-col'>
                          <span className='text-[9px] text-gray-400 uppercase font-bold leading-none mb-0.5'>
                            {t.headers?.stock || 'Stock'}
                          </span>
                          <span className='text-xs font-bold text-gray-700 dark:text-gray-200 font-mono leading-none'>
                            {Math.floor(invItem.stock / invItem.unitsPerPack)} {t.pack || 'Packs'}
                            {invItem.stock % invItem.unitsPerPack > 0 &&
                              ` + ${invItem.stock % invItem.unitsPerPack} ${t.unit || 'Units'}`}
                          </span>
                        </div>
                      </div>

                      {/* Expiry */}
                      <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50'>
                        <span className='material-symbols-rounded text-orange-400 text-lg'>
                          event_upcoming
                        </span>
                        <div className='flex flex-col'>
                          <span className='text-[9px] text-gray-400 uppercase font-bold leading-none mb-0.5'>
                            {t.cartFields?.expiry || 'Expiry'}
                          </span>
                          <span className='text-xs font-bold text-gray-700 dark:text-gray-200 font-mono leading-none'>
                            {invItem.expiryDate
                              ? new Date(invItem.expiryDate).toLocaleDateString('en-US', {
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>

                      {/* Profit */}
                      <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50'>
                        <span
                          className={`material-symbols-rounded text-lg ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {profit >= 0 ? 'trending_up' : 'trending_down'}
                        </span>
                        <div className='flex flex-col'>
                          <span className='text-[9px] text-gray-400 uppercase font-bold leading-none mb-0.5'>
                            {t.headers?.profit || 'Profit'}
                          </span>
                          <span
                            className={`text-xs font-bold font-mono leading-none ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            {profit.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className='flex items-center gap-4'>
                {/* System Order ID (Read Only) */}
                <div className='group relative'>
                  <label className='text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1'>
                    {t.tableHeaders?.orderId || 'Order #'}
                  </label>
                  <div className='relative overflow-hidden h-8 flex items-center'>
                    <input
                      type='text'
                      readOnly
                      value={invoiceId}
                      dir='ltr'
                      className={`text-lg font-mono font-bold bg-transparent border border-transparent rounded-lg px-2 py-0.5 outline-none cursor-default w-36 text-left select-all transition-all duration-500 ease-out ${
                        isOrderIdAnimating
                          ? 'text-green-500 dark:text-green-400 animate-[rollUp_0.5s_ease-out]'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      style={{
                        animation: isOrderIdAnimating ? 'rollUp 0.5s ease-out' : 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Manual Invoice ID */}
                <div className='group relative'>
                  <label className='text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1'>
                    {t.tableHeaders?.invId || 'Invoice #'}
                  </label>
                  <input
                    type='text'
                    placeholder={t.placeholders?.enterId || 'Enter ID'}
                    value={externalInvoiceId}
                    onChange={(e) => setExternalInvoiceId(e.target.value)}
                    dir={externalInvoiceIdDir}
                    className='text-lg font-mono font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded-lg px-2 py-0.5 outline-none transition-all w-28 text-left text-gray-600 dark:text-gray-400 placeholder-gray-300'
                  />
                </div>

                {/* Payment Method Toggle */}
                <SegmentedControl
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as 'cash' | 'credit')}
                  color={color}
                  size='sm'
                  variant='onPage'
                  options={[
                    { label: t.cash || 'Cash', value: 'cash', activeColor: 'green' },
                    { label: t.credit || 'Credit', value: 'credit', activeColor: 'blue' },
                  ]}
                  className='w-fit'
                />
              </div>
            </div>

            <div
              className={`flex-1 space-y-3 mb-4 cart-scroll pe-3 ${cart.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
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
                <div className='text-center text-gray-400 py-10'>{t.emptyCart}</div>
              ) : (
                cart.map((item, index) => (
                  <div
                    key={item.drugId}
                    dir='ltr'
                    onClick={() => setSelectedCartIndex(index)}
                    className={`p-3 rounded-2xl relative group pr-2 type-functional cursor-pointer transition-all ${
                      selectedCartIndex === index
                        ? `bg-${color}-50 dark:bg-gray-700`
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showMenu(e.clientX, e.clientY, [
                        {
                          label: t.actions.viewDetails,
                          icon: 'visibility',
                          action: () =>
                            alert(
                              `Details for ${item.name}\nQuantity: ${item.quantity}\nCost Price: ${item.costPrice}`
                            ),
                        },
                        {
                          label: t.actions.editQty,
                          icon: 'edit',
                          action: () => {
                            const qty = prompt('Enter quantity:', item.quantity.toString());
                            if (qty) updateItem(item.drugId, 'quantity', parseFloat(qty) || 1);
                          },
                        },
                        { separator: true },
                        {
                          label: t.contextMenu?.removeItem || 'Remove Item',
                          icon: 'delete',
                          action: () => removeItem(item.drugId),
                          danger: true,
                        },
                      ]);
                    }}
                  >
                    <button
                      onClick={() => removeItem(item.drugId)}
                      className='absolute top-1/2 -translate-y-1/2 right-0 w-6 h-full flex items-center justify-center text-gray-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-2xl'
                    >
                      <span className='material-symbols-rounded text-lg'>close</span>
                    </button>

                    {/* Single Row: Name + All Inputs */}
                    <div className='flex gap-1.5 items-center pe-4'>
                      {/* Product Name */}
                      <div className='flex-1 min-w-0'>
                        <p className='font-bold text-md drug-name truncate mb-1' title={item.name}>
                          {getDisplayName(item)}
                        </p>
                      </div>

                      {/* 1. Qty */}
                      <div className='w-12'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-quantity`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'quantity')}
                          label={t.cartFields?.qty || 'Qty'}
                          type='number'
                          maxLength={4}
                          value={item.quantity}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            e.target.select();
                          }}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 4);
                            updateItem(item.drugId, 'quantity', parseFloat(val) || 0);
                          }}
                        />
                      </div>

                      {/* 2. Expiry */}
                      <div className='w-[74px]'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-expiryDate`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'expiryDate')}
                          label={t.cartFields?.expiry || 'Expiry'}
                          type='text'
                          maxLength={4}
                          inputClassName={(() => {
                            const isFocused =
                              focusedInput?.id === item.drugId &&
                              focusedInput?.field === 'expiryDate';
                            const status = checkExpiryStatus(item.expiryDate || '', {
                              checkIncomplete: !isFocused,
                            });
                            return getExpiryStatusStyle(status, 'input');
                          })()}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          value={
                            focusedInput?.id === item.drugId && focusedInput?.field === 'expiryDate'
                              ? parseExpiryDisplay(item.expiryDate || '')
                              : formatExpiryDisplay(item.expiryDate || '')
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            setFocusedInput({ id: item.drugId, field: 'expiryDate' });
                            setTimeout(() => e.target.select(), 10);
                          }}
                          onBlur={() => {
                            setFocusedInput(null);
                            // Alert if expiry date is incomplete (1-3 digits)
                            const status = checkExpiryStatus(item.expiryDate || '');
                            if (status === 'incomplete') {
                              alert(
                                t.alerts?.incompleteExpiry ||
                                  'Please enter a complete expiry date (4 digits: MMYY)'
                              );
                            }
                          }}
                          onChange={(e) => {
                            const sanitized = sanitizeExpiryInput(
                              e.target.value,
                              item.expiryDate || ''
                            );
                            if (sanitized !== null) {
                              updateItem(item.drugId, 'expiryDate', sanitized);
                            }
                          }}
                        />
                      </div>

                      {/* 3. Cost */}
                      <div className='w-14'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-costPrice`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'costPrice')}
                          label={t.cartFields?.cost || 'Cost'}
                          type='number'
                          value={item.costPrice}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            updateItem(item.drugId, 'costPrice', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* 4. Discount */}
                      <div className='w-14'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-discount`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'discount')}
                          label={t.cartFields?.discount || 'Disc %'}
                          type='number'
                          min={0}
                          max={100}
                          value={item.discount || 0}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            updateItem(item.drugId, 'discount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* 5. Sale Price */}
                      <div className='w-14'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-salePrice`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'salePrice')}
                          label={t.cartFields?.sale || 'Sale'}
                          type='number'
                          value={item.salePrice || 0}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            updateItem(item.drugId, 'salePrice', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* 6. Tax % */}
                      <div className='w-14'>
                        <FloatingInput
                          inputRef={(el) => {
                            inputRefs.current[`${index}-tax`] = el;
                          }}
                          onKeyDown={(e) => handleInputKeyDown(e, index, 'tax')}
                          label={t.cartFields?.tax || 'Tax %'}
                          type='number'
                          min={0}
                          max={100}
                          value={item.tax || 0}
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          onFocus={(e) => {
                            setSelectedCartIndex(index);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            updateItem(item.drugId, 'tax', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* 7. Subtotal (Cost × Qty) - Read Only */}
                      <div className='w-16'>
                        <FloatingInput
                          label={t.cartFields?.subtotal || 'Subtotal'}
                          type='number'
                          value={Number((item.costPrice * item.quantity).toFixed(2))}
                          onChange={() => {}} // Read only
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          className='opacity-75 pointer-events-none' // Visual cue
                        />
                      </div>

                      {/* 8. Grand Total (Subtotal + Tax) - Read Only */}
                      <div className='w-[70px]'>
                        <FloatingInput
                          label={t.cartFields?.totalWithTax || 'Total+Tax'}
                          type='number'
                          value={Number(
                            (
                              item.costPrice * item.quantity +
                              item.costPrice * item.quantity * ((item.tax || 0) / 100)
                            ).toFixed(2)
                          )}
                          onChange={() => {}} // Read only
                          labelBgClassName={
                            selectedCartIndex === index
                              ? `bg-${color}-50 dark:bg-gray-700`
                              : 'bg-gray-50 dark:bg-gray-800'
                          }
                          className='opacity-75 pointer-events-none' // Visual cue
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className='pt-4 border-t border-gray-100 dark:border-gray-800'>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                {/* Left: Metrics Group */}
                <div className='flex items-center gap-6 text-sm'>
                  {/* Items Count */}
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-400 font-medium'>{t.summary.totalItems}</span>
                    <span className='font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg'>
                      {cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)}
                    </span>
                  </div>

                  {/* Discount */}
                  {(() => {
                    const totalCost = cart.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
                    const totalSale = cart.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
                    const totalDiscount = totalSale - totalCost;
                    const discountPercent = totalSale > 0 ? (totalDiscount / totalSale) * 100 : 0;

                    return (
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-400 font-medium'>
                          {t.summary.discount || 'Disc'}
                        </span>
                        <span
                          className={`font-medium ${totalDiscount > 0 ? 'text-green-600' : 'text-gray-600'}`}
                        >
                          ${totalDiscount.toFixed(2)}{' '}
                          <span className='text-xs opacity-75'>
                            ({discountPercent.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                    );
                  })()}

                  {/* Tax */}
                  {(() => {
                    const totalTaxAmount = cart.reduce((sum, i) => {
                      const subtotal = i.costPrice * i.quantity;
                      return sum + subtotal * ((i.tax || 0) / 100);
                    }, 0);
                    return (
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-400 font-medium'>{t.summary.tax || 'Tax'}</span>
                        <span className='font-medium text-orange-600'>
                          ${totalTaxAmount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Total & Actions */}
                <div className='flex items-center gap-4 flex-1 justify-end'>
                  {/* Total Display */}
                  <div className='text-right me-2'>
                    <div className='text-[10px] uppercase text-gray-500 font-bold tracking-wider'>
                      {t.summary.totalCost}
                    </div>
                    {(() => {
                      const subtotal = cart.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
                      const totalTax = cart.reduce((sum, i) => {
                        const itemSubtotal = i.costPrice * i.quantity;
                        return sum + itemSubtotal * ((i.tax || 0) / 100);
                      }, 0);
                      return (
                        <div
                          className={`text-2xl font-black ${paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}
                        >
                          ${(subtotal + totalTax).toFixed(2)}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={handlePendingPO}
                      disabled={cart.length === 0 || !selectedSupplierId}
                      title={t.pending || 'Save as Pending'}
                      className='h-12 w-12 flex items-center justify-center rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:disabled:bg-gray-800 transition-all active:scale-95'
                    >
                      <span className='material-symbols-rounded'>pending_actions</span>
                    </button>

                    <button
                      onClick={handleConfirm}
                      disabled={cart.length === 0 || !selectedSupplierId}
                      className={`h-12 w-80 justify-center rounded-xl flex items-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none ${paymentMethod === 'cash' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:shadow-none text-white font-bold transition-all active:scale-95`}
                    >
                      <span>{t.summary.confirm}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY VIEW */
        <div className='flex flex-col flex-1 gap-4 overflow-hidden'>
          <div className='flex items-center gap-3'>
            <div className='relative w-[512px]' ref={searchSuggestionsRef}>
              <SearchInput
                value={historySearch}
                onSearchChange={(val) => {
                  setHistorySearch(val);
                  setIsSearchSuggestionsOpen(true);
                }}
                onClear={() => setHistorySearch('')}
                onFocus={() => setIsSearchSuggestionsOpen(true)}
                placeholder={
                  (t.placeholders?.searchHistory || 'Search ID, Supplier...') +
                  ' (use @ to search medicine)'
                }
                className={`${historySearch.startsWith('@') ? 'text-left' : ''}`}
                rounded='xl'
              />
              <SearchDropdown
                results={filteredSearchSuggestions}
                onSelect={(drug) => {
                  setHistorySearch(`@${drug.name}`);
                  setIsSearchSuggestionsOpen(false);
                }}
                columns={[
                  {
                    header: t.headers?.barcode || 'Barcode',
                    width: 'w-32 shrink-0',
                    className: 'text-gray-900 dark:text-gray-400',
                    render: (drug: Drug) => drug.barcode || drug.id || drug.internalCode || '---',
                  },
                  {
                    header: t.headers?.name || 'Name',
                    width: 'flex-1',
                    className: 'text-gray-900 dark:text-gray-400',
                    render: (drug: Drug) => (
                      <span className='truncate'>{getDisplayName(drug)}</span>
                    ),
                  },
                ]}
                isVisible={isSearchSuggestionsOpen && filteredSearchSuggestions.length > 0}
              />
            </div>

            <FilterDropdown
              items={[
                { id: 'all', label: t.status?.all || 'All Status' },
                { id: 'pending', label: t.status?.pending || 'Pending' },
                { id: 'completed', label: t.status?.completed || 'Completed' },
                { id: 'returned', label: t.status?.returned || 'Returned' },
                { id: 'rejected', label: t.status?.rejected || 'Rejected' },
              ]}
              selectedItem={{
                id: statusFilter,
                label:
                  statusFilter === 'all'
                    ? t.status?.all || 'All Status'
                    : t.status?.[statusFilter] ||
                      statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1),
              }}
              isOpen={isStatusFilterOpen}
              onToggle={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              onSelect={(item) => {
                setStatusFilter(item.id as any);
                setIsStatusFilterOpen(false);
              }}
              keyExtractor={(item) => item.id}
              renderItem={(item, isSelected) => (
                <div className='flex items-center justify-between w-full'>
                  <span>{item.label}</span>
                  {isSelected && <span className='material-symbols-rounded text-sm'>check</span>}
                </div>
              )}
              renderSelected={(item) => <span className='text-xs font-bold'>{item?.label}</span>}
              className='w-40 h-[42px]'
              variant='input'
              color={color}
            />
          </div>

          <div className={`flex-1 ${CARD_BASE} rounded-xl overflow-hidden flex flex-col`}>
            <TanStackTable
              data={sortedHistory}
              columns={columns}
              color={color}
              onRowClick={(p) => setSelectedPurchase(p)}
              tableId='purchases_history_v2'
              manualFiltering={true}
              enableSearch={false}
            />
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPurchase(null)}
          size='4xl'
          zIndex={50}
          title={t.detailsModal?.title || 'Purchase Order Details'}
          icon='receipt_long'
          subtitle={`${selectedPurchase.invoiceId} • ${new Date(selectedPurchase.date).toLocaleDateString()} ${formatTime(new Date(selectedPurchase.date))}`}
        >
          {/* Info Bar */}
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2 bg-white dark:bg-gray-900 text-sm mb-4'>
            <div>
              <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                {t.detailsModal?.supplier || 'Supplier'}
              </p>
              <p className='font-bold'>{selectedPurchase.supplierName}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                {t.detailsModal?.invNumber || 'Inv #'}
              </p>
              <p className='font-mono'>{selectedPurchase.externalInvoiceId || '-'}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                {t.detailsModal?.payment || 'Payment'}
              </p>
              {(() => {
                const config =
                  selectedPurchase.paymentType === 'cash'
                    ? { color: 'emerald', icon: 'payments', label: t.cash || 'Cash' }
                    : { color: 'blue', icon: 'credit_card', label: t.credit || 'Credit' };
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                  >
                    <span className='material-symbols-rounded text-xs'>{config.icon}</span>
                    {config.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                {t.detailsModal?.totalCost || 'Total Cost'}
              </p>
              <p className={`font-bold text-lg text-${color}-600`}>
                ${selectedPurchase.totalCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                {t.detailsModal?.status || 'Status'}
              </p>
              {(() => {
                const status = selectedPurchase.status as string;
                let config = { color: 'gray', icon: 'help', label: status };

                switch (status) {
                  case 'pending':
                    config = {
                      color: 'amber',
                      icon: 'pending',
                      label: t.detailsModal?.pendingApproval || 'Pending Approval',
                    };
                    break;
                  case 'completed':
                    config = {
                      color: 'emerald',
                      icon: 'check_circle',
                      label: t.detailsModal?.completed || 'Completed',
                    };
                    break;
                  case 'rejected':
                    config = {
                      color: 'red',
                      icon: 'cancel',
                      label: t.detailsModal?.rejected || 'Rejected',
                    };
                    break;
                  case 'returned':
                    config = {
                      color: 'orange',
                      icon: 'assignment_return',
                      label: t.detailsModal?.returned || 'Returned',
                    };
                    break;
                }

                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                  >
                    <span className='material-symbols-rounded text-xs'>{config.icon}</span>
                    {config.label}
                  </span>
                );
              })()}
            </div>
            {selectedPurchase.approvalDate && (
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                  {t.detailsModal?.approvedOn || 'Approved On'}
                </p>
                <p className='font-bold'>
                  {new Date(selectedPurchase.approvalDate).toLocaleDateString()}{' '}
                  {formatTime(new Date(selectedPurchase.approvalDate))}
                </p>
              </div>
            )}

            {selectedPurchase.approvedBy && (
              <div>
                <p className='text-xs text-gray-500 uppercase font-bold mb-1'>
                  {t.detailsModal?.approvedBy || 'Approved By'}
                </p>
                <p className='font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1'>
                  <span className='material-symbols-rounded text-sm text-green-600'>
                    verified_user
                  </span>
                  {selectedPurchase.approvedBy}
                </p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className='bg-gray-50 dark:bg-black/20 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800'>
            <table className='w-full text-left border-collapse'>
              <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-sm'>
                <tr className='border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase'>
                  <th className='p-2 font-bold bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.item || 'Item'}
                  </th>
                  <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.expiry || 'Expiry'}
                  </th>
                  <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.qty || 'Qty'}
                  </th>
                  <th className='p-2 font-bold text-center bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.returned || 'Returned'}
                  </th>
                  <th className='p-2 font-bold text-right bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.cost || 'Cost'}
                  </th>
                  <th className='p-2 font-bold text-right bg-gray-50 dark:bg-gray-900'>
                    {t.detailsModal?.total || 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody className='text-sm'>
                {selectedPurchase.items.map((item, idx) => {
                  const itemReturns = getPurchaseReturns(selectedPurchase.id).flatMap((r) =>
                    r.items.filter((ri) => ri.drugId === item.drugId)
                  );
                  const totalReturned = itemReturns.reduce(
                    (sum, ri) => sum + ri.quantityReturned,
                    0
                  );
                  const hasReturns = totalReturned > 0;
                  const isPartialReturn = hasReturns && totalReturned < item.quantity;
                  const isFullReturn = hasReturns && totalReturned >= item.quantity;

                  return (
                    <tr
                      key={idx}
                      className='border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-gray-800 transition-colors'
                    >
                      <td className='p-2'>
                        <p className='font-bold text-gray-800 dark:text-gray-200'>
                          {getDisplayName(item)}
                        </p>
                        {hasReturns && (
                          <div className='mt-1 space-y-1'>
                            {itemReturns.map((ret, ridx) => {
                              const returnRecord = getPurchaseReturns(selectedPurchase.id).find(
                                (r) =>
                                  r.items.some(
                                    (ri) =>
                                      ri.drugId === ret.drugId &&
                                      ri.quantityReturned === ret.quantityReturned
                                  )
                              );
                              return (
                                <p
                                  key={ridx}
                                  className='text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1'
                                >
                                  <span className='material-symbols-rounded text-[12px]'>
                                    assignment_return
                                  </span>
                                  {ret.quantityReturned}{' '}
                                  {t.detailsModal?.returnedLabel || 'returned'} - {ret.reason} (
                                  {ret.condition})
                                  {returnRecord && (
                                    <span className='text-gray-500'>
                                      • {new Date(returnRecord.date).toLocaleDateString()}
                                    </span>
                                  )}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className='p-2 text-center'>
                        {item.expiryDate
                          ? (() => {
                              const status = checkExpiryStatus(item.expiryDate);
                              const config = getExpiryStatusConfig(status);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-[10px] font-bold uppercase tracking-wider bg-transparent`}
                                >
                                  {formatExpiryDisplay(item.expiryDate)}
                                </span>
                              );
                            })()
                          : '-'}
                      </td>
                      <td className='p-2 text-center font-bold'>{item.quantity}</td>
                      <td className='p-2 text-center'>
                        {hasReturns ? (
                          <div className='flex flex-col items-center gap-1'>
                            <span
                              className={`font-bold ${isFullReturn ? 'text-red-600' : 'text-orange-600'}`}
                            >
                              {totalReturned}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${isFullReturn ? 'red' : 'orange'}-200 dark:border-${isFullReturn ? 'red' : 'orange'}-900/50 text-${isFullReturn ? 'red' : 'orange'}-700 dark:text-${isFullReturn ? 'red' : 'orange'}-400 text-[9px] font-bold uppercase tracking-wider bg-transparent`}
                            >
                              <span className='material-symbols-rounded text-xs'>
                                {isFullReturn ? 'assignment_return' : 'assignment_return'}
                              </span>
                              {isFullReturn
                                ? t.detailsModal?.fullReturn || 'Full'
                                : t.detailsModal?.partialReturn || 'Partial'}
                            </span>
                          </div>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </td>
                      <td className='p-2 text-right'>${item.costPrice.toFixed(2)}</td>
                      <td className='p-2 text-right font-bold'>
                        ${(item.costPrice * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};
