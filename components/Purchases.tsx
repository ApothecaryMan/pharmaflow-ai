
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useContextMenu } from '../components/ContextMenu';
import { Drug, Supplier, Purchase, PurchaseItem, PurchaseReturn } from '../types';
import { createSearchRegex, parseSearchTerm } from '../utils/searchUtils';
import { PosDropdown } from '../utils/PosDropdown';
import { useSmartDirection } from '../hooks/useSmartDirection';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';


interface PurchasesProps {
  inventory: Drug[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  onPurchaseComplete: (purchase: Purchase) => void;
  color: string;
  t: any;
}

// Floating Label Input Component
interface FloatingInputProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  inputClassName?: string;
  min?: string | number;
  max?: string | number;
  title?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  maxLength?: number;
  placeholder?: string;
}

const FloatingInput = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  className = "", 
  inputClassName = "",
  min, 
  max, 
  title,
  onFocus,
  onBlur,
  maxLength,
  placeholder = " "
}: FloatingInputProps) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        className={`block px-2 pb-1 pt-2 w-full text-xs font-medium text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer ${inputClassName}`}
        placeholder={placeholder}
        value={value === 0 ? '' : value}
        onChange={onChange}
        min={min}
        max={max}
        title={title}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
      />
      <label className="absolute text-[8px] text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-2.5 scale-75 top-1 z-10 origin-[0] bg-gray-50 dark:bg-gray-800 px-1 peer-focus:px-1 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1 peer-focus:scale-75 peer-focus:-translate-y-2.5 left-1 pointer-events-none font-bold tracking-wide">
        {label}
      </label>
    </div>
  );
};

// Helper to validate expiry date (MMYY)
// Returns: 'valid' | 'invalid' | 'near-expiry'
const checkExpiryStatus = (date: string): 'valid' | 'invalid' | 'near-expiry' => {
  if (!date || date.length !== 4) return 'valid'; // Neutral if incomplete
  
  const month = parseInt(date.slice(0, 2));
  const year = parseInt(date.slice(2)); // yy
  
  if (month < 1 || month > 12) return 'invalid';
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const currentTotalMonths = currentYear * 12 + currentMonth;
  const expiryTotalMonths = year * 12 + month;
  
  // Past date
  if (expiryTotalMonths < currentTotalMonths) return 'invalid';
  
  // Near expiry: current month (0 diff) or up to 2 months future
  const diff = expiryTotalMonths - currentTotalMonths;
  if (diff >= 0 && diff <= 2) return 'near-expiry';
  
  return 'valid';
};

export const Purchases: React.FC<PurchasesProps> = ({ inventory, suppliers, purchases, purchaseReturns, onPurchaseComplete, color, t }) => {
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  
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

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'in-stock', label: 'In Stock' },
    { id: 'out-stock', label: 'Out Stock' }
  ];



  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  
  // Smart direction for inputs
  const supplierSearchDir = useSmartDirection(supplierSearch);
  const drugSearchDir = useSmartDirection(search);
  
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('credit');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

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
    orderId: { label: 'Order #', className: 'px-3 py-2 text-start' },
    invId: { label: 'Inv #', className: 'px-3 py-2 text-start' },
    date: { label: 'Date', className: 'px-3 py-2 text-start' },
    supplier: { label: 'Supplier', className: 'px-3 py-2 text-start' },
    payment: { label: 'Payment', className: 'px-3 py-2 text-center' },
    items: { label: 'Items', className: 'px-3 py-2 text-center' },
    discount: { label: 'Discount', className: 'px-3 py-2 text-end' },
    total: { label: 'Total', className: 'px-3 py-2 text-end' },
    action: { label: 'Action', className: 'px-3 py-2 text-center' }
  };
    
  // Long Press for Header (Show/Hide)
  const {
      onTouchStart: onHeaderTouchStart,
      onTouchEnd: onHeaderTouchEnd,
      onTouchMove: onHeaderTouchMoveHook,
      isLongPress: isHeaderLongPress
    } = useLongPress({
        onLongPress: (e) => {
          const touch = e.touches[0];
          showMenu(touch.clientX, touch.clientY, [
              { 
                label: 'Show/Hide Columns', 
                icon: 'visibility', 
                action: () => {} 
              },
              { separator: true },
              ...Object.keys(historyColumnsDef).map(colId => ({
                label: historyColumnsDef[colId as keyof typeof historyColumnsDef].label,
                icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
                action: () => toggleColumnVisibility(colId)
              }))
          ]);
        }
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
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 truncate">{p.invoiceId || '-'}</span>
                        {hasReturns && (
                            <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                title={`${returns.length} return(s) - Total: $${totalReturned.toFixed(2)}`}
                            >
                                <span className="material-symbols-rounded text-[12px]">assignment_return</span>
                                {returns.length}
                            </span>
                        )}
                    </div>
                );
            case 'invId':
                return <span className="text-xs font-mono text-gray-500 truncate">{p.externalInvoiceId || '-'}</span>;
            case 'date':
                return <span className="text-xs text-gray-500 truncate">{new Date(p.date).toLocaleDateString()}</span>;
            case 'supplier':
                return <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{p.supplierName}</span>;
            case 'payment':
                return (
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${p.paymentType === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {p.paymentType || 'credit'}
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
                                -${totalReturned.toFixed(2)} returned
                            </span>
                        )}
                    </div>
                );
            case 'action':
                return (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors outline-none"
                        title="View Details"
                    >
                        <span className="material-symbols-rounded text-[20px]">visibility</span>
                    </button>
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


    // Manual touch handling for rows (can't use useLongPress in map)
    const touchTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleRowTouchStart = (e: React.TouchEvent, purchase: Purchase) => {
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        
        touchTimer.current = setTimeout(() => {
            showMenu(touch.clientX, touch.clientY, [
                { label: 'View Details', icon: 'visibility', action: () => setSelectedPurchase(purchase) },
                { separator: true },
                { label: 'Copy Invoice', icon: 'content_copy', action: () => copyToClipboard(purchase.invoiceId || '') },
                { label: 'Copy Supplier', icon: 'person', action: () => copyToClipboard(purchase.supplierName || '') }
            ]);
        }, 500);
    };

    const handleRowTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos.current) return;
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
        
        if (deltaX > 10 || deltaY > 10) {
            if (touchTimer.current) {
                clearTimeout(touchTimer.current);
                touchTimer.current = null;
            }
        }
    };

    const handleRowTouchEnd = () => {
        if (touchTimer.current) {
            clearTimeout(touchTimer.current);
            touchTimer.current = null;
        }
        touchStartPos.current = null;
    };
  
  // Sidebar Resize Logic with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('purchases_cart_width');
      return saved ? parseInt(saved) : 384; // Default lg:w-96 is 24rem = 384px
    }
    return 384;
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
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSupplierOpen]);

  const handleAddItem = (drug: Drug) => {
    setCart(prev => {
      const existing = prev.find(i => i.drugId === drug.id);
      if (existing) {
        return prev.map(i => i.drugId === drug.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      
      const cost = drug.costPrice || 0;
      const sale = drug.price || 0;
      let initialDiscount = 0;
      
      // Auto-calculate discount if Sale > Cost
      if (sale > 0 && cost >= 0) {
        initialDiscount = ((sale - cost) / sale) * 100;
        // initialDiscount = Math.max(0, initialDiscount); // Should we clear negative discount (loss)? Let's keep it raw or 0.
        // Usually margin is positive. If cost > sale, discount is negative? 
        // Formula: Discount from Sale Price. If Cost=80, Sale=100 -> Disc=20%.
        // If Cost=120, Sale=100 -> Disc=-20%.
        // Let's keep the formula consistent.
      }

      return [...prev, { 
        drugId: drug.id, 
        name: drug.name, 
        quantity: 1, 
        costPrice: cost, 
        dosageForm: drug.dosageForm,
        salePrice: sale, 
        discount: parseFloat(initialDiscount.toFixed(2)), 
        expiryDate: ''
      }];
    });
    setSearch(''); // Clear search on add
  };

  const updateItem = (drugId: string, field: keyof PurchaseItem, value: number | string) => {
    setCart(prev => prev.map(i => {
      if (i.drugId !== drugId) return i;
      
      let updatedItem = { ...i, [field]: value };

      // Interdependent Calculation Logic
      if (field === 'discount') {
        // Change Discount -> Update Cost based on Sale calculated from Cost & Discount (Assuming Sale is fixed or derived?)
        // Actually, user said "depend on salea price". 
        // Typically: Sale Price is the base.
        // Cost = Sale * (1 - Discount/100)
        const disc = typeof value === 'number' ? value : 0;
        updatedItem.costPrice = Number((i.salePrice * (1 - disc / 100)).toFixed(2));
      } else if (field === 'costPrice') {
        // Change Cost -> Update Discount based on Sale
        // Discount % = ((Sale - Cost) / Sale) * 100
        const cost = typeof value === 'number' ? value : 0;
        if (i.salePrice > 0) {
           const disc = ((i.salePrice - cost) / i.salePrice) * 100;
           updatedItem.discount = Number(disc.toFixed(2));
        }
      } else if (field === 'salePrice') {
         // Change Sale -> Keep Cost constant, Update Discount to reflect the new margin/discount?
         // User: "fix sale don't change it it fixed until i change and when change just adjust discount to fit"
         // This implies Cost stays the same (what we pay supplier is fixed). 
         // New Sale Price implies a different markup/margin/discount structure.
         // Formula: Discount % = ((NewSale - Cost) / NewSale) * 100
         const sale = typeof value === 'number' ? value : 0;
         if (sale > 0 && i.costPrice >= 0) {
             const disc = ((sale - i.costPrice) / sale) * 100;
             updatedItem.discount = Number(disc.toFixed(2));
         } else {
             updatedItem.discount = 0;
         }
      }

      return updatedItem;
    }));
  };

  const removeItem = (drugId: string) => {
    setCart(prev => prev.filter(i => i.drugId !== drugId));
  };

  const handleConfirm = () => {
    if (!selectedSupplierId || cart.length === 0) return;
    
    // 1. Validate Invoice ID
    if (!externalInvoiceId || externalInvoiceId.trim() === '') {
        alert("Please enter the Invoice Number (Inv #) from the supplier.");
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
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0),
      status: 'completed',
      invoiceId,
      externalInvoiceId,
      paymentType: paymentMethod
    };
    
    onPurchaseComplete(purchase);
    setCart([]);
    setSelectedSupplierId('');
    
    // Generate Next ID
    const currentNum = parseInt(invoiceId.replace('INV-', ''), 10) || 0;
    setInvoiceId(`INV-${String(currentNum + 1).padStart(6, '0')}`); 
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
             <h2 className="text-2xl font-medium tracking-tight">{mode === 'create' ? t.title : t.historyTitle}</h2>
             <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
         <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex text-xs font-bold">
            <button 
                onClick={() => setMode('create')}
                className={`px-4 py-2 rounded-full transition-all ${mode === 'create' ? `bg-${color}-600 text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.newPurchase}
            </button>
            <button 
                onClick={() => setMode('history')}
                className={`px-4 py-2 rounded-full transition-all ${mode === 'history' ? `bg-${color}-600 text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.viewHistory}
            </button>
         </div>
       </div>

       {mode === 'create' ? (
           <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
               {/* LEFT: Selection Area */}
               <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                   {/* Supplier Select with Autocomplete */}
                   <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t.selectSupplier}</label>
                        
                        <div ref={supplierDropdownRef} className="relative">
                            <input
                                type="text"
                                placeholder="Search and select supplier..."
                                value={supplierSearch || (selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId)?.name : '')}
                                onChange={(e) => {
                                    setSupplierSearch(e.target.value);
                                    if (!isSupplierOpen) setIsSupplierOpen(true);
                                }}
                                onFocus={() => setIsSupplierOpen(true)}
                                dir={supplierSearchDir}
                                autoComplete="off"
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                            
                            {/* Dropdown Results */}
                            {isSupplierOpen && filteredSuppliers.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                    {filteredSuppliers.map(supplier => (
                                        <div
                                            key={supplier.id}
                                            onClick={() => {
                                                setSelectedSupplierId(supplier.id);
                                                setSupplierSearch('');
                                                setIsSupplierOpen(false);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors ${
                                                selectedSupplierId === supplier.id ? `bg-${color}-50 dark:bg-${color}-900/20` : ''
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{supplier.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                   </div>

                   {/* Drug Search & Grid */}
                   <div className="flex-1 bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
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
                                        ...(selection ? [{ label: 'Copy', icon: 'content_copy', action: () => copyToClipboard(selection) }] : []),
                                        { label: 'Paste', icon: 'content_paste', action: async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                setSearch(prev => prev + text);
                                            } catch (err) {
                                                console.error('Failed to read clipboard', err);
                                            }
                                        }},
                                        { separator: true },
                                        { label: 'Clear', icon: 'backspace', action: () => setSearch('') }
                                    ]);
                                }}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {search.trim() === '' ? (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8">
                                <span className="material-symbols-rounded text-6xl opacity-20">search</span>
                                <p className="text-sm font-medium">{t.searchDrug}</p>
                                <p className="text-xs text-center max-w-xs opacity-70">
                                  {t.startSearching || 'Start searching for products to add to purchase order'}
                                </p>
                              </div>
                            ) : filteredDrugs.length === 0 ? (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {filteredDrugs.map(drug => (
                                    <div key={drug.id} 
                                         onClick={() => handleAddItem(drug)}
                                         onContextMenu={(e) => {
                                             e.preventDefault();
                                            e.preventDefault();
                                            e.stopPropagation();
                                            showMenu(e.clientX, e.clientY, [
                                                { label: 'Add to Order', icon: 'add_shopping_cart', action: () => handleAddItem(drug) },
                                                { separator: true },
                                                { label: 'Copy Name', icon: 'content_copy', action: () => copyToClipboard(drug.name) }
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
                 className="w-full lg:w-[var(--sidebar-width)] bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-xl"
               >
                   <div className="flex justify-between items-start mb-4">
                       <h3 className="font-bold text-lg flex items-center gap-2 mt-1">
                           <span className="material-symbols-rounded">shopping_cart</span>
                           {t.cartTitle}
                       </h3>

                       <div className="flex items-center gap-4">
                           {/* System Order ID (Read Only) */}
                           <div className="group relative">
                                <label className="text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1">Order #</label>
                                <input 
                                    type="text"
                                    value={invoiceId}
                                    readOnly
                                    dir="ltr"
                                    className="text-lg font-mono font-bold bg-transparent border border-transparent rounded-lg px-2 py-0.5 outline-none cursor-default w-36 text-left text-gray-500 dark:text-gray-400 select-all"
                                />
                           </div>

                           {/* Manual Invoice ID */}
                           <div className="group relative">
                                <label className="text-[10px] uppercase font-bold text-gray-400 absolute -top-3 left-1">Invoice #</label>
                                <input 
                                    type="text"
                                    placeholder="Enter ID"
                                    value={externalInvoiceId}
                                    onChange={(e) => setExternalInvoiceId(e.target.value)}
                                    dir="ltr"
                                    className="text-lg font-mono font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 rounded-lg px-2 py-0.5 outline-none transition-all w-28 text-left text-gray-600 dark:text-gray-400 placeholder-gray-300"
                                />
                           </div>

                           {/* Payment Method Toggle */}
                           <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                               <button
                                   onClick={() => setPaymentMethod('cash')}
                                   className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentMethod === 'cash' ? `bg-green-600 text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
                               >
                                   Cash
                               </button>
                               <button
                                   onClick={() => setPaymentMethod('credit')}
                                   className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${paymentMethod === 'credit' ? `bg-blue-600 text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
                               >
                                   Credit
                               </button>
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                       {cart.length === 0 ? (
                           <div className="text-center text-gray-400 py-10">{t.emptyCart}</div>
                       ) : (
                           cart.map(item => (
                               <div 
                                   key={item.drugId} 
                                   dir="ltr"
                                   className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl relative group pr-8"
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
                                           { label: 'Remove Item', icon: 'delete', action: () => removeItem(item.drugId), danger: true }
                                       ]);
                                   }}
                                >
                                    <button 
                                        onClick={() => removeItem(item.drugId)} 
                                        className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-symbols-rounded text-lg">close</span>
                                    </button>
                                    
                                    {/* Single Row: Name + All Inputs */}
                                    <div className="flex gap-1.5 items-center pe-6">
                                        {/* Product Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs drug-name truncate mb-1" title={item.name}>
                                                {item.name} {item.dosageForm ? <span className="font-normal text-gray-500 text-[10px]">({item.dosageForm})</span> : ''}
                                            </p>
                                        </div>
                                        
                                        {/* 1. Qty */}
                                        <div className="w-12">
                                            <FloatingInput
                                                label="Qty"
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.drugId, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* 2. Expiry */}
                                        <div className="w-16">
                                            <FloatingInput
                                                label="Exp"
                                                type="text"
                                                maxLength={7}
                                                inputClassName={(() => {
                                                    const status = checkExpiryStatus(item.expiryDate || '');
                                                    if (status === 'invalid') return 'text-red-500 dark:text-red-400 border-red-300 focus:border-red-500';
                                                    if (status === 'near-expiry') return 'text-yellow-600 dark:text-yellow-400 border-yellow-300 focus:border-yellow-500';
                                                    return '';
                                                })()}
                                                value={
                                                    // If focused, show raw value for easy editing.
                                                    // If not focused, show formatted MM/20YY (if applicable).
                                                    focusedInput?.id === item.drugId && focusedInput?.field === 'expiryDate'
                                                        ? item.expiryDate || ''
                                                        : (item.expiryDate && item.expiryDate.length === 4 && !item.expiryDate.includes('/')
                                                            ? `${item.expiryDate.slice(0, 2)}/20${item.expiryDate.slice(2)}`
                                                            : item.expiryDate || '')
                                                }
                                                onFocus={() => setFocusedInput({ id: item.drugId, field: 'expiryDate' })}
                                                onBlur={() => setFocusedInput(null)}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    // Check if clearing
                                                    if (!val) {
                                                        updateItem(item.drugId, 'expiryDate', '');
                                                        return;
                                                    }
                                                    
                                                    // Logic: Allow user to type raw digits '1125'
                                                    // Only allow numbers and slash
                                                    if (/^[\d/]*$/.test(val)) {
                                                        updateItem(item.drugId, 'expiryDate', val);
                                                    }
                                                }}
                                            />
                                        </div>
                                        
                                        {/* 3. Cost */}
                                        <div className="w-14">
                                            <FloatingInput
                                                label="Cost"
                                                type="number"
                                                value={item.costPrice}
                                                onChange={e => updateItem(item.drugId, 'costPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        
                                        {/* 4. Discount */}
                                        <div className="w-12">
                                            <FloatingInput
                                                label="Disc %"
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={item.discount || 0}
                                                onChange={e => updateItem(item.drugId, 'discount', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        
                                        {/* 5. Sale Price */}
                                        <div className="w-14">
                                            <FloatingInput
                                                label="Sale"
                                                type="number"
                                                value={item.salePrice || 0}
                                                onChange={e => updateItem(item.drugId, 'salePrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* 6. Total Cost (Read Only) */}
                                        <div className="w-16">
                                            <FloatingInput
                                                label="Total"
                                                type="number"
                                                value={Number((item.costPrice * item.quantity).toFixed(2))}
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
                                <span className="text-[10px] text-gray-500 font-medium uppercase">Discount</span>
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

                            {/* Total Cost */}
                            <div className="flex items-center gap-2 text-right border-s border-gray-200 dark:border-gray-700 ps-4">
                                <span className="text-xs text-gray-500 font-bold uppercase whitespace-nowrap">{t.summary.totalCost}:</span>
                                <span className={`text-2xl font-bold ${paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>${cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0).toFixed(2)}</span>
                            </div>
                        </div>
                       <button 
                           onClick={handleConfirm}
                           disabled={cart.length === 0 || !selectedSupplierId}
                           className={`w-full py-3 rounded-xl ${paymentMethod === 'cash' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold transition-all shadow-lg dark:shadow-none active:scale-95`}
                       >
                           {t.summary.confirm} ({paymentMethod === 'cash' ? 'Cash' : 'Credit'})
                       </button>
                   </div>
               </div>
           </div>
       ) : (
           /* HISTORY VIEW */
           <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
           <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
               <table className="w-full min-w-full table-fixed border-collapse">
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
                              onHeaderTouchStart(e);
                              handleColumnDragStart(e, columnId);
                            }}
                            onTouchMove={(e) => {
                                onHeaderTouchMoveHook();
                                handleColumnTouchMove(e);
                            }}
                            onTouchEnd={(e) => {
                                onHeaderTouchEnd();
                                handleColumnTouchEnd(e);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              showMenu(e.clientX, e.clientY, [
                                { 
                                  label: 'Show/Hide Columns', 
                                  icon: 'visibility', 
                                  action: () => {} 
                                },
                                { separator: true },
                                ...Object.keys(historyColumnsDef).map(colId => ({
                                  label: historyColumnsDef[colId as keyof typeof historyColumnsDef].label,
                                  icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
                                  action: () => toggleColumnVisibility(colId)
                                }))
                              ]);
                            }}
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
                     {purchases.map((p, index) => (
                         <tr 
                            key={p.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }}
                            onTouchStart={(e) => handleRowTouchStart(e, p)}
                            onTouchEnd={handleRowTouchEnd}
                            onTouchMove={handleRowTouchMove}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showMenu(e.clientX, e.clientY, [
                                    { label: 'View Details', icon: 'visibility', action: () => setSelectedPurchase(p) },
                                    { separator: true },
                                    { label: 'Copy Invoice', icon: 'content_copy', action: () => copyToClipboard(p.invoiceId || '') },
                                    { label: 'Copy Supplier', icon: 'person', action: () => copyToClipboard(p.supplierName || '') }
                                ]);
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
                    {purchases.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-gray-400">No purchase history found</td></tr>}
                </tbody>
               </table>
           </div>
           </div>
       )}
       
       {/* Purchase Details Modal */}
       {selectedPurchase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                                <span className="material-symbols-rounded">receipt_long</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Purchase Order Details</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="font-mono">{selectedPurchase.invoiceId}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedPurchase.date).toLocaleString()}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedPurchase(null)}
                            className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    
                    {/* Info Bar */}
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Supplier</p>
                            <p className="font-bold">{selectedPurchase.supplierName}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Inv #</p>
                            <p className="font-mono">{selectedPurchase.externalInvoiceId || '-'}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Payment</p>
                             <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${selectedPurchase.paymentType === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                                {selectedPurchase.paymentType || 'credit'}
                            </span>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Cost</p>
                            <p className={`font-bold text-lg text-${color}-600`}>${selectedPurchase.totalCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-sm">
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase">
                                    <th className="p-2 font-bold bg-gray-50 dark:bg-gray-900">Item</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">Batch/Expiry</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">Qty</th>
                                    <th className="p-2 font-bold text-center bg-gray-50 dark:bg-gray-900">Returned</th>
                                    <th className="p-2 font-bold text-right bg-gray-50 dark:bg-gray-900">Cost</th>
                                    <th className="p-2 font-bold text-right bg-gray-50 dark:bg-gray-900">Total</th>
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
                                                                    {ret.quantityReturned} returned - {ret.reason} ({ret.condition})
                                                                    {returnRecord && <span className="text-gray-500">• {new Date(returnRecord.date).toLocaleDateString()}</span>}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                {item.expiryDate ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${checkExpiryStatus(item.expiryDate) === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {new Date(item.expiryDate).toLocaleDateString()}
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
                                                            {isFullReturn ? 'Full' : 'Partial'}
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
                </div>
            </div>
       )}
    </div>
  );
};
