import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import { Drug, Supplier, Purchase, PurchaseItem, PurchaseReturn } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { PosDropdown } from '../common/PosDropdown';
import { DatePicker } from '../common/DatePicker';
import { useSmartDirection } from '../common/SmartInputs';
import { useColumnReorder } from '../../hooks/useColumnReorder';
import { useLongPress } from '../../hooks/useLongPress';
import { settingsService } from '../../services';
import { FloatingInput } from '../common/FloatingInput';
import { checkExpiryStatus, sanitizeExpiryInput, formatExpiryDisplay, parseExpiryDisplay, getExpiryStatusStyle } from '../../utils/expiryUtils';
import { Modal } from '../common/Modal';


interface PurchasesProps {
  inventory: Drug[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  onPurchaseComplete: (purchase: Purchase) => void;
  color: string;
  t: any;
}

export const Purchases: React.FC<PurchasesProps> = ({ inventory, suppliers, purchases, purchaseReturns, onPurchaseComplete, color, t }) => {
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
    const period = hours >= 12 ? (t.time?.pm || 'PM') : (t.time?.am || 'AM');
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
 
  const [focusedInput, setFocusedInput] = useState<{id: string, field: string} | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'out-stock'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(14); // Default 14%, loaded from settings

  const filterOptions = [
    { id: 'all', label: t.filters?.all || 'All' },
    { id: 'in-stock', label: t.filters?.inStock || 'In Stock' },
    { id: 'out-stock', label: t.filters?.outOfStock || 'Out Stock' }
  ];



  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  
  // Refs for keyboard navigation
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const nextRowIndex = rowIndex + 1;
        // Key format: "rowIndex-field"
        const nextInput = inputRefs.current[`${nextRowIndex}-${field}`];
        if (nextInput) {
            nextInput.focus();
            // Select text if needed
            nextInput.select(); 
        }
    }
  };

  
  // Smart direction for inputs
  const supplierSearchDir = useSmartDirection(supplierSearch, t.placeholders?.searchSupplier || 'Search and select supplier...');
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
  const externalInvoiceIdDir = useSmartDirection(externalInvoiceId, t.placeholders?.enterId || 'Enter ID');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('credit');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'returned' | 'rejected'>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const historySearchDir = useSmartDirection(historySearch, t.placeholders?.searchHistory || 'Search ID, Supplier...');
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
      let data = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Date Filter
      if (dateRange.from) {
          const fromDate = new Date(dateRange.from).getTime();
          data = data.filter(p => new Date(p.date).getTime() >= fromDate);
      }
      if (dateRange.to) {
          const toDate = new Date(dateRange.to).getTime();
          data = data.filter(p => new Date(p.date).getTime() <= toDate);
      }

      // Search Filter
      if (historySearch.trim()) {
          const { mode: searchMode, regex } = parseSearchTerm(historySearch);
          
          if (searchMode === 'ingredient') {
             data = data.filter(p => 
                 p.items && p.items.some(item => 
                     item.name && regex.test(item.name)
                 )
             );
          } else {
             data = data.filter(p => 
                  (p.invoiceId && regex.test(p.invoiceId)) ||
                  (p.externalInvoiceId && regex.test(p.externalInvoiceId)) ||
                  (p.supplierName && regex.test(p.supplierName))
             );
          }
      }

      if (statusFilter === 'all') return data;
      
      return data.filter(p => {
          if (statusFilter === 'returned') {
              // Check if any returns exist for this purchase
              return purchaseReturns.some(r => r.purchaseId === p.id);
          }
          if (statusFilter === 'rejected') {
            return p.status === 'rejected';
          }
          if (statusFilter === 'completed') {
            // Completed ONLY if NO returns exist (otherwise it fits 'returned' filter)
            return p.status === 'completed' && !purchaseReturns.some(r => r.purchaseId === p.id);
          }
          return p.status === statusFilter;
      });
  }, [purchases, statusFilter, purchaseReturns, dateRange, historySearch]);

  const filteredSearchSuggestions = useMemo(() => {
      const { mode, regex } = parseSearchTerm(historySearch);
      if (mode !== 'ingredient') return [];
      return (inventory || []).filter(d => d.name && regex.test(d.name)).slice(0, 10);
  }, [historySearch, inventory]);


  // History Table Column State
  // History Table Column State - REFACTORED TO MATCH POS
  const {
    columnOrder,
    hiddenColumns,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnTouchMove,
    handleColumnDrop,
    handleColumnTouchEnd,
    handleColumnDragEnd,
  } = useColumnReorder({
    defaultColumns: ['orderId', 'invId', 'date', 'supplier', 'payment', 'items', 'discount', 'total', 'action'],
    storageKey: 'purchases_history_columns'
  });

  // --- Column Resize Logic (History) ---
  const [historyColumnWidths, setHistoryColumnWidths] = useState<Record<string, number | undefined>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('purchases_history_column_widths');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse column widths', e); }
        }
    }
    return {
      orderId: 100,
      invId: 100,
      date: 120,
      supplier: 200,
      payment: 100,
      items: 80,
      discount: 100,
      total: 120,
      action: 80
    };
  });

  useEffect(() => {
    localStorage.setItem('purchases_history_column_widths', JSON.stringify(historyColumnWidths));
  }, [historyColumnWidths]);

  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startColumnResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnResizing(true);
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = historyColumnWidths[columnId] || 100;

    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', endColumnResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.pageX - startX.current;
    
    // Check RTL
    const isRTL = document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const finalDiff = isRTL ? -diff : diff;
    
    const newWidth = Math.max(50, startWidth.current + finalDiff);
    setHistoryColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, [historyColumnWidths]);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);

  useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleColumnResizeMove);
        document.removeEventListener('mouseup', endColumnResize);
      };
  }, [endColumnResize, handleColumnResizeMove]);

  const handleAutoFit = (e: React.MouseEvent, columnId: string) => {
      e.stopPropagation();
      setHistoryColumnWidths(prev => {
          const next = { ...prev };
          delete next[columnId];
          return next;
      });
  };

  const historyColumnsDef = {
    orderId: { label: t.tableHeaders?.orderId || 'Order #', className: 'px-3 py-2 text-start' },
    invId: { label: t.tableHeaders?.invId || 'Inv #', className: 'px-3 py-2 text-start' },
    date: { label: t.tableHeaders?.date || 'Date', className: 'px-3 py-2 text-start' },
    supplier: { label: t.tableHeaders?.supplier || 'Supplier', className: 'px-3 py-2 text-start' },
    payment: { label: t.tableHeaders?.payment || 'Payment', className: 'px-3 py-2 text-center' },
    items: { label: t.tableHeaders?.items || 'Items', className: 'px-3 py-2 text-center' },
    discount: { label: t.tableHeaders?.discount || 'Discount', className: 'px-3 py-2 text-end' },
    total: { label: t.tableHeaders?.total || 'Total', className: 'px-3 py-2 text-end' },
    action: { label: t.tableHeaders?.action || 'Action', className: 'px-3 py-2 text-center' }
  };
    
  // Header context menu actions
  const getHeaderActions = () => [
    { label: t.contextMenu?.showHideColumns || 'Show/Hide Columns', icon: 'visibility', action: () => {} },
    { separator: true },
    ...Object.keys(historyColumnsDef).map(colId => ({
      label: historyColumnsDef[colId as keyof typeof historyColumnsDef].label,
      icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
      action: () => toggleColumnVisibility(colId)
    }))
  ];

  // Header context menu trigger (replaces manual useLongPress)
  const { triggerProps: headerTriggerProps } = useContextMenuTrigger({
    actions: getHeaderActions
  });

    // Helper: Get returns for a purchase
    const getPurchaseReturns = (purchaseId: string) => {
        return purchaseReturns.filter(r => r.purchaseId === purchaseId);
    };

    const renderHistoryCell = (p: Purchase, columnId: string) => {
        const totalSale = p.items.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);
        const totalCost = p.totalCost;
        const totalDiscount = totalSale - totalCost;
        const discountPercent = totalSale > 0 ? (totalDiscount / totalSale) * 100 : 0;
        const returns = getPurchaseReturns(p.id);
        const hasReturns = returns.length > 0;
        const totalReturned = returns.reduce((sum, r) => sum + r.totalRefund, 0);

        switch(columnId) {
            case 'orderId':
                return <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 truncate">{p.invoiceId || '-'}</span>;
            case 'invId':
                return <span className="text-xs font-mono text-gray-500 truncate">{p.externalInvoiceId || '-'}</span>;
            case 'date':
                return (
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{new Date(p.date).toLocaleDateString()}</span>
                        <span className="text-[10px] text-gray-400">{formatTime(new Date(p.date))}</span>
                    </div>
                );
            case 'supplier':
                return <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{p.supplierName}</span>;
            case 'payment':
                return (
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${p.paymentType === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {p.paymentType === 'cash' ? (t.cash || 'Cash') : (t.credit || 'Credit')}
                    </span>
                );
            case 'items':
                return <span className="text-xs text-gray-500 font-medium">{p.items.length}</span>;
            case 'discount':
                return <span className="text-xs font-bold text-green-600">{discountPercent.toFixed(1)}%</span>;
            case 'total':
                return (
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">${p.totalCost.toFixed(2)}</span>
                        {hasReturns && (
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                -${totalReturned.toFixed(2)} {t.detailsModal?.returnedLabel || 'returned'}
                            </span>
                        )}
                    </div>
                );
            case 'action':
                if (p.status === 'pending') {
                    return (
                        <div className="flex justify-center">
                            <span 
                                className="material-symbols-rounded text-orange-500 text-[20px]" 
                                title={t.tooltips?.pending || 'Pending Approval'}
                            >
                                pending
                            </span>
                        </div>
                    );
                }
                if (p.status === 'rejected') {
                     return (
                        <div className="flex justify-center">
                            <span 
                                className="material-symbols-rounded text-red-500 text-[20px]" 
                                title={t.tooltips?.rejected || 'Rejected'}
                            >
                                cancel
                            </span>
                        </div>
                    );
                }
                if (hasReturns) {
                     return (
                        <div className="flex justify-center">
                            <span 
                                className="material-symbols-rounded text-purple-500 text-[20px]" 
                                title={t.tooltips?.returned || 'Returned'}
                            >
                                assignment_return
                            </span>
                        </div>
                    );
                }
                return (
                    <div className="flex justify-center">
                        <span 
                            className="material-symbols-rounded text-green-500 text-[20px]" 
                            title={t.tooltips?.completed || 'Completed'}
                        >
                            check_circle
                        </span>
                    </div>
                );
            default:
                return null;
        }
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
        { label: t.contextMenu?.viewDetails || 'View Details', icon: 'visibility', action: () => setSelectedPurchase(purchase) },
        { separator: true },
        { label: t.contextMenu?.copyInvoice || 'Copy Invoice', icon: 'content_copy', action: () => copyToClipboard(purchase.invoiceId || '') },
        { label: t.contextMenu?.copySupplier || 'Copy Supplier', icon: 'person', action: () => copyToClipboard(purchase.supplierName || '') }
    ];

    // Row touch/long-press support
    const currentTouchRow = useRef<Purchase | null>(null);
    
    const { 
      onTouchStart: onRowTouchStart, 
      onTouchEnd: onRowTouchEnd, 
      onTouchMove: onRowTouchMove
    } = useLongPress({
      onLongPress: (e) => {
        if (currentTouchRow.current) {
          const touch = e.touches[0];
          showMenu(touch.clientX, touch.clientY, getRowContextActions(currentTouchRow.current));
        }
      }
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

  // Persist Cart & Supplier
  useEffect(() => {
      localStorage.setItem('purchases_cart_items', JSON.stringify(cart));
      localStorage.setItem('purchases_cart_supplier', selectedSupplierId);
  }, [cart, selectedSupplierId]);

  // Load tax rate from settings
  useEffect(() => {
    settingsService.get('purchaseTaxRate').then(rate => {
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
        const isRTL = document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';

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
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierOpen(false);
      }
      if (searchSuggestionsRef.current && !searchSuggestionsRef.current.contains(event.target as Node)) {
        setIsSearchSuggestionsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSupplierOpen]);

  const handleAddItem = (drug: Drug) => {
    setCart(prev => {
      const existing = prev.find(i => i.drugId === drug.id);
      if (existing) {
        // Update quantity and recalculate tax
        return prev.map(i => {
          if (i.drugId === drug.id) {
            const newQty = i.quantity + 1;
            const newTax = Number(((i.costPrice * newQty) * (taxRate / 100)).toFixed(2));
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

      return [...prev, { 
        drugId: drug.id, 
        name: drug.name, 
        quantity: 1, 
        costPrice: cost, 
        dosageForm: drug.dosageForm,
        salePrice: sale, 
        discount: parseFloat(initialDiscount.toFixed(2)), 
        expiryDate: '',
        tax: initialTaxPercent // Tax as percentage
      }];
    });
    setSearch(''); // Clear search on add
  };

  const updateItem = (drugId: string, field: keyof PurchaseItem, value: number | string) => {
    setCart(prev => prev.map(i => {
      if (i.drugId !== drugId) return i;
      
      let updatedItem = { ...i, [field]: value };
      
      // Auto-format expiry date: 1125 -> 11/2025
      if (field === 'expiryDate' && typeof value === 'string' && value.length === 4 && /^\d+$/.test(value)) {
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
    }));
  };

  const removeItem = (drugId: string) => {
    setCart(prev => prev.filter(i => i.drugId !== drugId));
  };

  // Helper: Generate unique order ID (auto-increment if duplicate)
  const getUniqueOrderId = (): string => {
    let currentId = invoiceId;
    let currentNum = parseInt(currentId.replace('INV-', ''), 10) || 0;
    
    // Check if current ID exists in purchases
    while (purchases.some(p => p.invoiceId === currentId)) {
      currentNum++;
      currentId = `INV-${String(currentNum).padStart(6, '0')}`;
    }
    
    return currentId;
  };

  const handleConfirm = () => {
    if (!selectedSupplierId || cart.length === 0) return;
    
    // 1. Validate Invoice ID
    if (!externalInvoiceId || externalInvoiceId.trim() === '') {
        alert(t.alerts?.enterInvoice || "Please enter the Invoice Number (Inv #) from the supplier.");
        return;
    }
    
    // 2. Check for duplicate Invoice ID
    const isDuplicate = purchases.some(p => p.externalInvoiceId === externalInvoiceId.trim());
    if (isDuplicate) {
        alert(t.alerts?.duplicateInvoice || "This Invoice ID already exists. Please enter a unique Invoice ID.");
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

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    
    // Get unique order ID (auto-increment if duplicate)
    const uniqueOrderId = getUniqueOrderId();
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0),
      totalTax: cart.reduce((sum, i) => sum + ((i.costPrice * i.quantity) * ((i.tax || 0) / 100)), 0),
      status: 'completed',
      invoiceId: uniqueOrderId,
      externalInvoiceId,
      paymentType: paymentMethod
    };
    
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
        alert(t.alerts?.enterInvoice || "Please enter the Invoice Number (Inv #) from the supplier.");
        return;
    }
    
    // 2. Check for duplicate Invoice ID
    const isDuplicate = purchases.some(p => p.externalInvoiceId === externalInvoiceId.trim());
    if (isDuplicate) {
        alert(t.alerts?.duplicateInvoice || "This Invoice ID already exists. Please enter a unique Invoice ID.");
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

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    
    // Get unique order ID (auto-increment if duplicate)
    const uniqueOrderId = getUniqueOrderId();
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0),
      totalTax: cart.reduce((sum, i) => sum + ((i.costPrice * i.quantity) * ((i.tax || 0) / 100)), 0),
      status: 'pending',
      invoiceId: uniqueOrderId,
      externalInvoiceId,
      paymentType: paymentMethod
    };
    
    onPurchaseComplete(purchase);
    setCart([]);
    setSelectedSupplierId('');
    
    // Generate Next ID
    const nextNum = parseInt(uniqueOrderId.replace('INV-', ''), 10) + 1;
    setInvoiceId(`INV-${String(nextNum).padStart(6, '0')}`); 
    setExternalInvoiceId('');
  };

  const { mode: searchMode, regex } = parseSearchTerm(search);

  const filteredDrugs = (inventory || []).filter(d => {
    // 1. Stock Filter
    if (filter === 'in-stock' && d.stock <= 0) return false;
    if (filter === 'out-stock' && d.stock > 0) return false;

    // 2. Search Filter
    if (searchMode === 'ingredient') {
        return d.activeIngredients && d.activeIngredients.some(ing => regex.test(ing));
    }
    
    const searchableText = d.name + ' ' + (d.dosageForm || '') + ' ' + (d.internalCode || '') + ' ' + (d.barcode || '');
    return regex.test(searchableText);
  }).slice(0, 30); // Limit to 30 results for performance

  // Filter suppliers by search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const searchLower = supplierSearch.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.id.toLowerCase().includes(searchLower)
    );
  }, [suppliers, supplierSearch]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 overflow-hidden">
       {/* Header with toggle */}
       <div className="flex justify-between items-center flex-shrink-0">
          <div>
              <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight type-expressive">{mode === 'create' ? t.title : t.historyTitle}</h2>
                  {mode === 'history' && (
                      <>
                          <span className="text-gray-300 text-2xl font-light">|</span>
                          <PosDropdown
                              items={[
                                  { id: 'all', label: t.status?.all || 'All Status' },
                                  { id: 'pending', label: t.status?.pending || 'Pending' },
                                  { id: 'completed', label: t.status?.completed || 'Completed' },
                                  { id: 'returned', label: t.status?.returned || 'Returned' },
                                  { id: 'rejected', label: t.status?.rejected || 'Rejected' }
                              ]}
                              selectedItem={{ id: statusFilter, label: statusFilter === 'all' ? (t.status?.all || 'All Status') : (t.status?.[statusFilter] || statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)) }}
                              isOpen={isStatusFilterOpen}
                              onToggle={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                              onSelect={(item) => {
                                  setStatusFilter(item.id as any);
                                  setIsStatusFilterOpen(false);
                              }}
                              keyExtractor={(item) => item.id}
                              renderItem={(item, isSelected) => (
                                  <div className="flex items-center justify-between w-full">
                                      <span>{item.label}</span>
                                      {isSelected && <span className="material-symbols-rounded text-sm">check</span>}
                                  </div>
                              )}
                              renderSelected={(item) => <span className="text-[11px] font-bold">{item?.label}</span>}
                              className="w-32 h-[28px]"
                              minHeight="28px"
                              variant="input"
                              color={color}
                          />
                      </>
                  )}
              </div>
             <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
         <div className="flex items-center gap-2">
             {/* Status Filter (History Mode Only) */}
             {mode === 'history' && (
                  <>
                  <div className="relative me-2" ref={searchSuggestionsRef}>
                      <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-gray-500 material-symbols-rounded text-lg">search</span>
                      <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => {
                              setHistorySearch(e.target.value);
                              setIsSearchSuggestionsOpen(true);
                          }}
                          onFocus={() => setIsSearchSuggestionsOpen(true)}
                          dir={historySearch.startsWith('@') ? 'ltr' : historySearchDir}
                          placeholder={t.placeholders?.searchHistory || 'Search ID, Supplier...'}
                          className={`ps-10 pe-4 py-1 h-[32px] bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 w-48 placeholder-gray-400 ${historySearch.startsWith('@') ? 'text-left' : ''}`}
                      />
                      {isSearchSuggestionsOpen && filteredSearchSuggestions.length > 0 && (
                          <div dir="ltr" className="absolute top-full mt-2 start-0 w-60 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                              {filteredSearchSuggestions.map((drug) => (
                                  <div 
                                      key={drug.id}
                                      onClick={() => {
                                          setHistorySearch(`@${drug.name}`);
                                          setIsSearchSuggestionsOpen(false);
                                      }}
                                      className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-3 transition-colors border-b last:border-0 border-gray-50 dark:border-gray-700/50"
                                  >
                                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                           <span className="material-symbols-rounded text-blue-500 text-lg">medication</span>
                                      </div>
                                      <div className="flex flex-col min-w-0 justify-center">
                                           <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{drug.name}</span>
                                                {drug.dosageForm && <span className="text-[10px] text-gray-400 flex-shrink-0">{drug.dosageForm}</span>}
                                           </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-full me-2">
                      <DatePicker
                          value={dateRange.from}
                          onChange={(val) => setDateRange(prev => ({ ...prev, from: val }))}
                          label={t.fromDate || "From"}
                          color="gray"
                          icon="calendar_today"
                          className="py-1 px-3 text-xs h-[32px] focus:ring-0 hover:bg-white dark:hover:bg-gray-800"
                      />
                      <span className="text-gray-400 material-symbols-rounded px-1 text-lg rtl:rotate-180">arrow_forward</span>
                      <DatePicker
                          value={dateRange.to}
                          onChange={(val) => setDateRange(prev => ({ ...prev, to: val }))}
                          label={t.toDate || "To"}
                          color="gray"
                          icon="event"
                          className="py-1 px-3 text-xs h-[32px] focus:ring-0 hover:bg-white dark:hover:bg-gray-800"
                      />
                  </div>
                  </>
             )}

             <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex text-xs font-bold">
                <button 
                    onClick={() => setMode('create')}
                    className={`px-4 py-2 rounded-full transition-all type-interactive ${mode === 'create' ? `bg-${color}-600 text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.newPurchase}
                </button>
                <button 
                    onClick={() => setMode('history')}
                    className={`px-4 py-2 rounded-full transition-all type-interactive ${mode === 'history' ? `bg-${color}-600 text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.viewHistory}
                </button>
             </div>
         </div>
       </div>


       {mode === 'create' ? (
           <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
               {/* LEFT: Selection Area */}
               <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                   {/* Supplier Select with Autocomplete */}
                   <div className={`${CARD_BASE} p-4 rounded-3xl`}>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t.selectSupplier}</label>
                        
                        <div ref={supplierDropdownRef} className="relative">
                            <input
                                type="text"
                                placeholder={t.placeholders?.searchSupplier || 'Search and select supplier...'}
                                value={supplierSearch || (selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId)?.name : '')}
                                onChange={(e) => {
                                    setSupplierSearch(e.target.value);
                                    setSelectedSupplierId('');
                                    if (!isSupplierOpen) setIsSupplierOpen(true);
                                }}
                                onFocus={() => setIsSupplierOpen(true)}
                                onBlur={() => {
                                    // Delay to allow click on dropdown item
                                    setTimeout(() => {
                                        // If no supplier selected and search text doesn't match any supplier, clear it
                                        if (!selectedSupplierId && supplierSearch) {
                                            const match = suppliers.find(s => 
                                                s.name.toLowerCase() === supplierSearch.toLowerCase()
                                            );
                                            if (match) {
                                                setSelectedSupplierId(match.id);
                                                setSupplierSearch('');
                                            } else {
                                                setSupplierSearch('');
                                            }
                                        }
                                        setIsSupplierOpen(false);
                                    }, 200);
                                }}
                                dir={supplierSearchDir}
                                autoComplete="off"
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                            
                            {/* Clear button when supplier selected */}
                            {selectedSupplierId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSupplierId('');
                                        setSupplierSearch('');
                                    }}
                                    className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <span className="material-symbols-rounded text-lg">close</span>
                                </button>
                            )}
                            
                            {/* Dropdown Results */}
                            {isSupplierOpen && filteredSuppliers.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                    {filteredSuppliers.map(supplier => (
                                        <div
                                            key={supplier.id}
                                            onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                                            onClick={() => {
                                                setSelectedSupplierId(supplier.id);
                                                setSupplierSearch('');
                                                setIsSupplierOpen(false);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors ${
                                                selectedSupplierId === supplier.id ? `bg-${color}-50 dark:bg-${color}-900/20` : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{supplier.name}</span>
                                                <span className="text-xs text-gray-400 font-mono">{supplier.id}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* No results message */}
                            {isSupplierOpen && supplierSearch && filteredSuppliers.length === 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-center text-sm text-gray-500">
                                    {t.noResults || 'No suppliers found'}
                                </div>
                            )}
                        </div>
                   </div>

                   {/* Drug Search & Grid */}
                   <div className={`flex-1 ${CARD_BASE} p-4 rounded-3xl flex flex-col overflow-hidden`}>
                        <div className="flex gap-2 mb-4">
                            {/* Filter Dropdown */}
                            <PosDropdown
                                items={filterOptions}
                                selectedItem={filterOptions.find(o => o.id === filter)}
                                isOpen={isFilterOpen}
                                onToggle={() => setIsFilterOpen(!isFilterOpen)}
                                onSelect={(item) => {
                                    setFilter(item.id as any);
                                    setIsFilterOpen(false);
                                }}
                                keyExtractor={(item) => item.id}
                                renderItem={(item, isSelected) => (
                                    <div className="flex items-center justify-between w-full">
                                        <span>{item.label}</span>
                                        {isSelected && <span className="material-symbols-rounded text-sm">check</span>}
                                    </div>
                                )}
                                renderSelected={(item) => item?.label}
                                className="w-32 h-[46px]"
                                variant="input"
                                color={color}
                            />

                            <input 
                                type="text" 
                                placeholder={t.searchDrug}
                                className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2"
                                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredDrugs.length > 0) {
                                        handleAddItem(filteredDrugs[0]);
                                    }
                                }}
                                dir={drugSearchDir}
                                autoComplete="off"
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const selection = window.getSelection()?.toString();
                                    showMenu(e.clientX, e.clientY, [
                                        ...(selection ? [{ label: t.contextMenu?.copy || 'Copy', icon: 'content_copy', action: () => copyToClipboard(selection) }] : []),
                                        { label: t.contextMenu?.paste || 'Paste', icon: 'content_paste', action: async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                setSearch(prev => prev + text);
                                            } catch (err) {
                                                console.error('Failed to read clipboard', err);
                                            }
                                        }},
                                        { separator: true },
                                        { label: t.contextMenu?.clear || 'Clear', icon: 'backspace', action: () => setSearch('') }
                                    ]);
                                }}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {search.trim() === '' ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 p-8">
                                <span className="material-symbols-rounded text-8xl opacity-30">search</span>
                                <p className="text-lg font-bold">{t.searchDrug}</p>
                                <p className="text-sm text-center max-w-xs opacity-70">
                                  {t.startSearching || 'Start searching for products to add to purchase order'}
                                </p>
                              </div>
                            ) : filteredDrugs.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 p-8">
                                <span className="material-symbols-rounded text-8xl opacity-30">search_off</span>
                                <p className="text-lg font-bold">
                                  {t.noResults || 'No results found'}
                                </p>
                                <p className="text-sm text-center max-w-xs opacity-70">
                                  {t.tryDifferentKeywords || 'Try searching with different keywords'}
                                </p>
                              </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2">
                                    {filteredDrugs.map(drug => (
                                    <div key={drug.id} 
                                         onClick={() => handleAddItem(drug)}
                                         onContextMenu={(e) => {
                                             e.preventDefault();
                                            e.preventDefault();
                                            e.stopPropagation();
                                            showMenu(e.clientX, e.clientY, [
                                                { label: t.contextMenu?.addToOrder || 'Add to Order', icon: 'add_shopping_cart', action: () => handleAddItem(drug) },
                                                { separator: true },
                                                { label: t.contextMenu?.copyName || 'Copy Name', icon: 'content_copy', action: () => copyToClipboard(drug.name) }
                                            ]);
                                         }}
                                         className={`p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-900/20 cursor-pointer transition-colors group`}
                                    >    <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 drug-name">
                                                    {drug.name} {drug.dosageForm ? <span className="font-normal text-gray-500">({drug.dosageForm})</span> : ''}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono tracking-wider">{drug.internalCode || drug.barcode || drug.id}</p>
                                            </div>
                                            <span className={`material-symbols-rounded text-${color}-600 opacity-0 group-hover:opacity-100`}>add_circle</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            )}
                        </div>
                   </div>
               </div>

               {/* Resize Handle (Desktop Only) */}
               <div 
                 className="hidden lg:flex w-4 items-center justify-center cursor-col-resize group z-10 -mx-2"
                 onMouseDown={startResizing}
                 onTouchStart={startResizing}
               >
                 <div className="w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors"></div>
               </div>

               {/* RIGHT: Order Cart */}
               <div 
                 ref={sidebarRef}
                 style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
                 className={`w-full lg:w-[var(--sidebar-width)] ${CARD_BASE} p-5 rounded-3xl flex flex-col`}
               >
                   <div className="flex justify-between items-start mb-4">
                       <h3 className="font-bold text-lg flex items-center gap-2 mt-1">
                           <span className="material-symbols-rounded">shopping_cart</span>
                           {t.cartTitle}
                       </h3>

                       <div className="flex items-center gap-4">
                           {/* System Order ID (Read Only) */}
                           <div className="group relative">
                                <label className="text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1">{t.tableHeaders?.orderId || 'Order #'}</label>
                                <div className="relative overflow-hidden h-8 flex items-center">
                                    <input 
                                        type="text"
                                        readOnly
                                        value={invoiceId}
                                        dir="ltr"
                                        className={`text-lg font-mono font-bold bg-transparent border border-transparent rounded-lg px-2 py-0.5 outline-none cursor-default w-36 text-left select-all transition-all duration-500 ease-out ${
                                            isOrderIdAnimating 
                                                ? 'text-green-500 dark:text-green-400 animate-[rollUp_0.5s_ease-out]' 
                                                : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                        style={{
                                            animation: isOrderIdAnimating ? 'rollUp 0.5s ease-out' : 'none'
                                        }}
                                    />
                                </div>
                           </div>

                           {/* Manual Invoice ID */}
                           <div className="group relative">
                                <label className="text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1">{t.tableHeaders?.invId || 'Invoice #'}</label>
                                <input 
                                    type="text"
                                    placeholder={t.placeholders?.enterId || 'Enter ID'}
                                    value={externalInvoiceId}
                                    onChange={(e) => setExternalInvoiceId(e.target.value)}
                                    dir={externalInvoiceIdDir}
                                    className="text-lg font-mono font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded-lg px-2 py-0.5 outline-none transition-all w-28 text-left text-gray-600 dark:text-gray-400 placeholder-gray-300"
                                />
                           </div>

                           {/* Payment Method Toggle */}
                           <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                               <button
                                   onClick={() => setPaymentMethod('cash')}
                                   className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentMethod === 'cash' ? `bg-green-600 text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
                               >
                                   {t.cash || 'Cash'}
                               </button>
                               <button
                                   onClick={() => setPaymentMethod('credit')}
                                   className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentMethod === 'credit' ? `bg-blue-600 text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
                               >
                                   {t.credit || 'Credit'}
                               </button>
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                       {cart.length === 0 ? (
                           <div className="text-center text-gray-400 py-10">{t.emptyCart}</div>
                       ) : (
                           cart.map((item, index) => (
                               <div 
                                   key={item.drugId} 
                                   dir="ltr"
                                   className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl relative group pr-2 type-functional"
                                   onContextMenu={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       showMenu(e.clientX, e.clientY, [
                                           { label: t.actions.viewDetails, icon: 'visibility', action: () => alert(`Details for ${item.name}\nQuantity: ${item.quantity}\nCost Price: ${item.costPrice}`) },
                                           { 
                                               label: t.actions.editQty, 
                                               icon: 'edit', 
                                               action: () => {
                                                   const qty = prompt('Enter quantity:', item.quantity.toString());
                                                   if (qty) updateItem(item.drugId, 'quantity', parseFloat(qty) || 1);
                                               } 
                                           },
                                           { separator: true },
                                           { label: t.contextMenu?.removeItem || 'Remove Item', icon: 'delete', action: () => removeItem(item.drugId), danger: true }
                                       ]);
                                   }}
                                >
                                    <button 
                                        onClick={() => removeItem(item.drugId)} 
                                        className="absolute top-1/2 -translate-y-1/2 right-0 w-6 h-full flex items-center justify-center text-gray-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-2xl"
                                    >
                                        <span className="material-symbols-rounded text-lg">close</span>
                                    </button>
                                    
                                    {/* Single Row: Name + All Inputs */}
                                    <div className="flex gap-1.5 items-center pe-4">
                                        {/* Product Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs drug-name truncate mb-1" title={item.name}>
                                                {item.name} {item.dosageForm ? <span className="font-normal text-gray-500 text-[10px]">({item.dosageForm})</span> : ''}
                                            </p>
                                        </div>
                                        
                                        {/* 1. Qty */}
                                        <div className="w-12">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-quantity`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'quantity')}
                                                label={t.cartFields?.qty || 'Qty'}
                                                type="number"
                                                maxLength={4}
                                                value={item.quantity}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => {
                                                    const val = e.target.value.slice(0, 4);
                                                    updateItem(item.drugId, 'quantity', parseFloat(val) || 0);
                                                }}
                                            />
                                        </div>

                                        {/* 2. Expiry */}
                                        <div className="w-[74px]">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-expiryDate`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'expiryDate')}
                                                label={t.cartFields?.expiry || 'Expiry'}
                                                type="text"
                                                maxLength={4}
                                                inputClassName={(() => {
                                                    const isFocused = focusedInput?.id === item.drugId && focusedInput?.field === 'expiryDate';
                                                    const status = checkExpiryStatus(item.expiryDate || '', { checkIncomplete: !isFocused });
                                                    return getExpiryStatusStyle(status, 'input');
                                                })()}
                                                value={
                                                    focusedInput?.id === item.drugId && focusedInput?.field === 'expiryDate'
                                                        ? parseExpiryDisplay(item.expiryDate || '')
                                                        : formatExpiryDisplay(item.expiryDate || '')
                                                }
                                                onFocus={(e) => {
                                                    setFocusedInput({ id: item.drugId, field: 'expiryDate' });
                                                    setTimeout(() => e.target.select(), 10);
                                                }}
                                                onBlur={() => {
                                                    setFocusedInput(null);
                                                    // Alert if expiry date is incomplete (1-3 digits)
                                                    const status = checkExpiryStatus(item.expiryDate || '');
                                                    if (status === 'incomplete') {
                                                        alert(t.alerts?.incompleteExpiry || 'Please enter a complete expiry date (4 digits: MMYY)');
                                                    }
                                                }}
                                                onChange={e => {
                                                    const sanitized = sanitizeExpiryInput(e.target.value, item.expiryDate || '');
                                                    if (sanitized !== null) {
                                                        updateItem(item.drugId, 'expiryDate', sanitized);
                                                    }
                                                }}
                                            />
                                        </div>
                                        
                                        {/* 3. Cost */}
                                        <div className="w-14">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-costPrice`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'costPrice')}
                                                label={t.cartFields?.cost || 'Cost'}
                                                type="number"
                                                value={item.costPrice}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => updateItem(item.drugId, 'costPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        
                                        {/* 4. Discount */}
                                        <div className="w-14">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-discount`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'discount')}
                                                label={t.cartFields?.discount || 'Disc %'}
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={item.discount || 0}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => updateItem(item.drugId, 'discount', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        
                                        {/* 5. Sale Price */}
                                        <div className="w-14">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-salePrice`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'salePrice')}
                                                label={t.cartFields?.sale || 'Sale'}
                                                type="number"
                                                value={item.salePrice || 0}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => updateItem(item.drugId, 'salePrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* 6. Tax % */}
                                        <div className="w-14">
                                            <FloatingInput
                                                inputRef={(el) => { inputRefs.current[`${index}-tax`] = el; }}
                                                onKeyDown={(e) => handleInputKeyDown(e, index, 'tax')}
                                                label={t.cartFields?.tax || 'Tax %'}
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={item.tax || 0}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => updateItem(item.drugId, 'tax', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* 7. Subtotal (Cost × Qty) - Read Only */}
                                        <div className="w-16">
                                            <FloatingInput
                                                label={t.cartFields?.subtotal || 'Subtotal'}
                                                type="number"
                                                value={Number((item.costPrice * item.quantity).toFixed(2))}
                                                onChange={() => {}} // Read only
                                                className="opacity-75 pointer-events-none" // Visual cue
                                            />
                                        </div>

                                        {/* 8. Grand Total (Subtotal + Tax) - Read Only */}
                                        <div className="w-[70px]">
                                            <FloatingInput
                                                label={t.cartFields?.totalWithTax || 'Total+Tax'}
                                                type="number"
                                                value={Number(((item.costPrice * item.quantity) + ((item.costPrice * item.quantity) * ((item.tax || 0) / 100))).toFixed(2))}
                                                onChange={() => {}} // Read only
                                                className="opacity-75 pointer-events-none" // Visual cue
                                            />
                                        </div>
                                    </div>
                                </div>
                           ))
                       )}
                   </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                        {/* Summary Row */}
                        <div className="flex items-center justify-between gap-2">
                             {/* Items */}
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-medium uppercase">{t.summary.totalItems}</span>
                                <span className="font-bold text-sm">{cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)}</span>
                            </div>
                            
                            {/* Discount */}
                            <div className="flex flex-col border-s border-gray-200 dark:border-gray-700 ps-4">
                                <span className="text-[10px] text-gray-500 font-medium uppercase">{t.summary.discount || 'Discount'}</span>
                                {(() => {
                                    const totalCost = cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
                                    const totalSale = cart.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);
                                    const totalDiscount = totalSale - totalCost;
                                    const discountPercent = totalSale > 0 ? (totalDiscount / totalSale) * 100 : 0;
                                    
                                    return (
                                        <span className="font-medium text-sm text-green-600">
                                            ${totalDiscount.toFixed(2)} ({discountPercent.toFixed(1)}%)
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Tax */}
                            <div className="flex flex-col border-s border-gray-200 dark:border-gray-700 ps-4">
                                <span className="text-[10px] text-gray-500 font-medium uppercase">{t.summary.tax || 'Tax'}</span>
                                {(() => {
                                    const totalTaxAmount = cart.reduce((sum, i) => {
                                        const subtotal = i.costPrice * i.quantity;
                                        return sum + (subtotal * ((i.tax || 0) / 100));
                                    }, 0);
                                    return (
                                        <span className="font-medium text-sm text-orange-600">
                                            ${totalTaxAmount.toFixed(2)}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Total Cost */}
                            <div className="flex items-center gap-2 text-right border-s border-gray-200 dark:border-gray-700 ps-4">
                                <span className="text-xs text-gray-500 font-bold uppercase whitespace-nowrap">{t.summary.totalCost}:</span>
                                {(() => {
                                    const subtotal = cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
                                    const totalTax = cart.reduce((sum, i) => {
                                        const itemSubtotal = i.costPrice * i.quantity;
                                        return sum + (itemSubtotal * ((i.tax || 0) / 100));
                                    }, 0);
                                    return (
                                        <span className={`text-2xl font-bold ${paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>
                                            ${(subtotal + totalTax).toFixed(2)}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                       <div className="flex items-center gap-2">
                            <button 
                                onClick={handleConfirm}
                                disabled={cart.length === 0 || !selectedSupplierId}
                                className={`flex-1 py-3 rounded-xl type-interactive ${paymentMethod === 'cash' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold transition-all active:scale-95`}
                                style={{ boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px' }}
                            >
                                {t.summary.confirm} ({paymentMethod === 'cash' ? (t.cash || 'Cash') : (t.credit || 'Credit')})
                            </button>
                            <button 
                                onClick={handlePendingPO}
                                disabled={cart.length === 0 || !selectedSupplierId}
                                title={t.pending || 'Save as Pending'} 
                                className="w-12 py-3 flex items-center justify-center rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-600 disabled:bg-orange-50 disabled:text-orange-300 transition-all active:scale-95 type-interactive"
                                style={{ boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px' }}
                            >
                                <span className="material-symbols-rounded">pending_actions</span>
                            </button>
                       </div>
                   </div>
               </div>
           </div>
       ) : (
           /* HISTORY VIEW */
           <div className={`flex-1 ${CARD_BASE} rounded-3xl overflow-hidden flex flex-col`}>
           <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
               <table className="w-full min-w-full table-fixed border-collapse type-functional">
                <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
                    <tr>
                        {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                          <th
                            key={columnId}
                            data-column-id={columnId}
                            className={`${historyColumnsDef[columnId as keyof typeof historyColumnsDef].className} ${!isColumnResizing ? 'cursor-grab active:cursor-grabbing' : ''} select-none transition-colors relative group/header hover:bg-gray-100 dark:hover:bg-gray-800 ${
                              draggedColumn === columnId ? 'opacity-50' : ''
                            } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                            title={historyColumnsDef[columnId as keyof typeof historyColumnsDef].label}
                            draggable={!isColumnResizing}
                            onDragStart={(e) => {
                              if ((e.target as HTMLElement).closest('.resize-handle')) {
                                  e.preventDefault();
                                  return;
                              }
                              handleColumnDragStart(e, columnId);
                            }}
                            onDragOver={(e) => handleColumnDragOver(e, columnId)}
                            onDrop={(e) => handleColumnDrop(e, columnId)}
                            onDragEnd={handleColumnDragEnd}
                            onTouchStart={(e) => {
                              if ((e.target as HTMLElement).closest('.resize-handle')) return;
                              e.stopPropagation();
                              handleColumnDragStart(e, columnId);
                            }}
                            onTouchMove={(e) => {
                                handleColumnTouchMove(e);
                            }}
                            onTouchEnd={(e) => {
                                handleColumnTouchEnd(e);
                            }}
                            {...headerTriggerProps}
                            style={{ width: historyColumnWidths[columnId] ? `${historyColumnWidths[columnId]}px` : 'auto' }}
                          >
                           <div className="flex items-center justify-between h-full w-full">
                            <span className="truncate flex-1">{historyColumnsDef[columnId as keyof typeof historyColumnsDef].label}</span>
                            
                            {/* Resize Handle / Separator */}
                            <div 
                                className="resize-handle absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity"
                                style={{ right: '-8px' }}
                                onMouseDown={(e) => startColumnResize(e, columnId)}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => handleAutoFit(e, columnId)}
                            >
                                 {/* Hit area only, no visual line */}
                            </div>
                           </div>
                          </th>
                        ))}
                    </tr>
                </thead>
                 <tbody>
                     {sortedHistory.map((p, index) => (
                         <tr 
                            key={p.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }}
                            onTouchStart={(e) => {
                                currentTouchRow.current = p;
                                onRowTouchStart(e);
                            }}
                            onTouchEnd={onRowTouchEnd}
                            onTouchMove={onRowTouchMove}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showMenu(e.clientX, e.clientY, getRowContextActions(p));
                            }}
                            className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}`}
                        >
                            {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                                <td 
                                    key={columnId} 
                                    className={`${historyColumnsDef[columnId as keyof typeof historyColumnsDef].className} align-middle border-none`}
                                    style={{ width: historyColumnWidths[columnId] ? `${historyColumnWidths[columnId]}px` : 'auto' }}
                                >
                                    {renderHistoryCell(p, columnId)}
                                </td>
                            ))}
                        </tr>
                     ))}
                    {purchases.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-gray-400">{t.noHistory || 'No purchase history found'}</td></tr>}
                </tbody>
               </table>
           </div>
           </div>
       )}
       
       {/* Purchase Details Modal */}
       {selectedPurchase && (
            <Modal
                isOpen={true}
                onClose={() => setSelectedPurchase(null)}
                size="4xl"
                zIndex={50}
            >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                                <span className="material-symbols-rounded">receipt_long</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.detailsModal?.title || 'Purchase Order Details'}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="font-mono">{selectedPurchase.invoiceId}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedPurchase.date).toLocaleDateString()} {formatTime(new Date(selectedPurchase.date))}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedPurchase(null)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    
                    {/* Info Bar */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2 bg-white dark:bg-gray-900 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.supplier || 'Supplier'}</p>
                            <p className="font-bold">{selectedPurchase.supplierName}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.invNumber || 'Inv #'}</p>
                            <p className="font-mono">{selectedPurchase.externalInvoiceId || '-'}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.payment || 'Payment'}</p>
                                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${selectedPurchase.paymentType === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                                {selectedPurchase.paymentType === 'cash' ? (t.cash || 'Cash') : (t.credit || 'Credit')}
                            </span>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.totalCost || 'Total Cost'}</p>
                            <p className={`font-bold text-lg text-${color}-600`}>${selectedPurchase.totalCost.toFixed(2)}</p>
                        </div>
                        {selectedPurchase.approvalDate ? (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.approvedOn || 'Approved On'}</p>
                                <p className="font-bold">{new Date(selectedPurchase.approvalDate).toLocaleDateString()} {formatTime(new Date(selectedPurchase.approvalDate))}</p>
                            </div>
                        ) : selectedPurchase.status === 'pending' ? (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.status || 'Status'}</p>
                                <p className="font-bold text-orange-500 flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">pending</span>
                                    {t.detailsModal?.pendingApproval || 'Pending Approval'}
                                </p>
                            </div>
                        ) : null}

                        {selectedPurchase.approvedBy && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t.detailsModal?.approvedBy || 'Approved By'}</p>
                                <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm text-green-600">verified_user</span>
                                    {selectedPurchase.approvedBy}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-sm">
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase">
                                    <th className="p-2 font-bold bg-gray-50 dark:bg-gray-900">{t.detailsModal?.item || 'Item'}</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">{t.detailsModal?.expiry || 'Expiry'}</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">{t.detailsModal?.qty || 'Qty'}</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">{t.detailsModal?.returned || 'Returned'}</th>
                                    <th className="p-2 font-bold text-right bg-gray-50 dark:bg-gray-900">{t.detailsModal?.cost || 'Cost'}</th>
                                    <th className="p-2 font-bold text-right bg-gray-50 dark:bg-gray-900">{t.detailsModal?.total || 'Total'}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {selectedPurchase.items.map((item, idx) => {
                                    const itemReturns = getPurchaseReturns(selectedPurchase.id).flatMap(r => 
                                        r.items.filter(ri => ri.drugId === item.drugId)
                                    );
                                    const totalReturned = itemReturns.reduce((sum, ri) => sum + ri.quantityReturned, 0);
                                    const hasReturns = totalReturned > 0;
                                    const isPartialReturn = hasReturns && totalReturned < item.quantity;
                                    const isFullReturn = hasReturns && totalReturned >= item.quantity;
                                    
                                    return (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                            <td className="p-2">
                                                <p className="font-bold text-gray-800 dark:text-gray-200">{item.name}</p>
                                                {hasReturns && (
                                                    <div className="mt-1 space-y-1">
                                                        {itemReturns.map((ret, ridx) => {
                                                            const returnRecord = getPurchaseReturns(selectedPurchase.id).find(r => 
                                                                r.items.some(ri => ri.drugId === ret.drugId && ri.quantityReturned === ret.quantityReturned)
                                                            );
                                                            return (
                                                                <p key={ridx} className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                                                    <span className="material-symbols-rounded text-[12px]">assignment_return</span>
                                                                    {ret.quantityReturned} {t.detailsModal?.returnedLabel || 'returned'} - {ret.reason} ({ret.condition})
                                                                    {returnRecord && <span className="text-gray-500">• {new Date(returnRecord.date).toLocaleDateString()}</span>}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                {item.expiryDate ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getExpiryStatusStyle(checkExpiryStatus(item.expiryDate), 'badge')}`}>
                                                        {formatExpiryDisplay(item.expiryDate)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 text-center font-bold">{item.quantity}</td>
                                            <td className="p-2 text-center">
                                                {hasReturns ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`font-bold ${isFullReturn ? 'text-red-600' : 'text-orange-600'}`}>
                                                            {totalReturned}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                            isFullReturn 
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        }`}>
                                                            {isFullReturn ? (t.detailsModal?.fullReturn || 'Full') : (t.detailsModal?.partialReturn || 'Partial')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-right">${item.costPrice.toFixed(2)}</td>
                                            <td className="p-2 text-right font-bold">${(item.costPrice * item.quantity).toFixed(2)}</td>
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
