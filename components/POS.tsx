
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useContextMenu } from '../utils/ContextMenu';
import { Drug, CartItem, Customer } from '../types';

import { useExpandingDropdown } from '../hooks/useExpandingDropdown';
import { getLocationName } from '../data/locations';
import { usePOSTabs } from '../hooks/usePOSTabs';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';
import { useSmartDirection } from '../hooks/useSmartDirection';
import { SearchInput } from '../utils/SearchInput';
import { TabBar } from './TabBar';
import { createSearchRegex, parseSearchTerm } from '../utils/searchUtils';
import { PosDropdown, PosDropdownProps } from '../utils/PosDropdown';
import { CARD_MD, CARD_LG } from '../utils/themeStyles';

interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: { items: CartItem[], customerName: string, customerCode?: string, paymentMethod: 'cash' | 'visa', saleType?: 'walk-in' | 'delivery', deliveryFee?: number, globalDiscount: number, subtotal: number, total: number }) => void;
  color: string;
  t: any;
  customers: Customer[];
}

export const POS: React.FC<POSProps> = ({ inventory, onCompleteSale, color, t, customers }) => {
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
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Ignore if focus is already on an input or textarea
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        // Check if key is alphanumeric (simple check)
        // We want to capture the start of a scan
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            searchInputRef.current?.focus();
            // We don't prevent default here so the character types into the input
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('in_stock');
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
    setCart(prev => prev.map(item => {
      if (item.id === id && !!item.isUnit === isUnit) {
        const newQty = item.quantity + delta;
        const stock = inventory.find(d => d.id === id)?.stock || 0;
        
        let isValid = false;
        if (item.isUnit && item.unitsPerPack) {
           // Allow selling units even if it breaks a pack (fractional stock supported in backend)
           // Stock is total packs. Qty is units.
           // Qty / UnitsPerPack <= Stock
           isValid = (newQty / item.unitsPerPack) <= stock;
        } else {
           isValid = newQty <= stock;
        }

        if (newQty > 0 && isValid) return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleUnitMode = (id: string, currentIsUnit: boolean) => {
    setCart(prev => {
        const itemIndex = prev.findIndex(i => i.id === id && !!i.isUnit === currentIsUnit);
        if (itemIndex === -1) return prev;
        
        const item = prev[itemIndex];
        const targetIsUnit = !currentIsUnit;
        
        // Check if target state already exists
        const targetIndex = prev.findIndex(i => i.id === id && !!i.isUnit === targetIsUnit);
        
        if (targetIndex >= 0) {
            // MERGE: Add current qty to target items qty, remove current
            // Note: When converting Packs to Units or vice versa, quantities might ideally scale? 
            // BUT: standard behavior for "Change Unit" button usually just flips the type, typically for 1 item?
            // User request usually implies just toggling the mode flag.
            // If I have 1 Pack and toggle to Unit -> 1 Unit? Or 'UnitsPerPack' Units?
            // Usually in this simple POS, toggle just changes the *pricing/mode* context.
            // Let's assume quantity is preserved (1 Pack -> 1 Unit) unless we want to convert.
            // Given "fix when cart contain one pack then add unit another unit sum together as 2 unit",
            // The user wants separation.
            // If I toggle, and the other exists, I'll merge their quantities.
            
            const updated = [...prev];
            updated[targetIndex] = { ...updated[targetIndex], quantity: updated[targetIndex].quantity + item.quantity };
            updated.splice(itemIndex, 1);
            return updated;
        } else {
            // Just flip the flag
            const updated = [...prev];
            updated[itemIndex] = { ...item, isUnit: targetIsUnit };
            return updated;
        }
    });
  };

  const updateItemDiscount = (id: string, isUnit: boolean, discount: number) => {
    const validDiscount = Math.min(100, Math.max(0, discount));
    setCart(prev => prev.map(item => 
      (item.id === id && !!item.isUnit === isUnit) ? { ...item, discount: validDiscount } : item
    ));
  };

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
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = (saleType: 'walk-in' | 'delivery' = 'walk-in') => {
    if (cart.length === 0) return;

    let deliveryFee = 0;
    if (saleType === 'delivery') {
        deliveryFee = 5;
    }

    onCompleteSale({
        items: cart,
        customerName: customerName || 'Guest Customer',
        customerCode,
        paymentMethod,
        saleType,
        deliveryFee,
        globalDiscount,
        subtotal,
        total: cartTotal + deliveryFee
    });
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
            const searchableText = d.name + ' ' + (d.dosageForm || '') + ' ' + d.category;
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

  
  const currentTouchItem = useRef<{drug: Drug, group: Drug[]} | null>(null);
  const currentTouchHeader = useRef<React.TouchEvent | null>(null);

  const { 
    onTouchStart: onRowTouchStart, 
    onTouchEnd: onRowTouchEnd, 
    onTouchMove: onRowTouchMove, 
    isLongPress: isRowLongPress 
  } = useLongPress({
    onLongPress: (e) => {
        if (currentTouchItem.current) {
            const { drug, group } = currentTouchItem.current;
            const touch = e.touches[0];
            showMenu(touch.clientX, touch.clientY, [
                { label: 'Add to Cart', icon: 'add_shopping_cart', action: () => addGroupToCart(group) },
                { label: 'View Details', icon: 'info', action: () => setViewingDrug(drug) },
                { separator: true },
                { label: t.actions.showSimilar, icon: 'category', action: () => setSelectedCategory(drug.category) }
            ]);
        }
    }
  });

  const {
    onTouchStart: onHeaderTouchStart,
    onTouchEnd: onHeaderTouchEnd,
    onTouchMove: onHeaderTouchMove,
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
            ...Object.keys(columns).map(colId => ({
              label: columns[colId as keyof typeof columns].label || 'Icon',
              icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
              action: () => toggleColumnVisibility(colId)
            }))
        ]);
      }
  });

  // Column Reorder Logic
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
    defaultColumns: ['icon', 'name', 'barcode', 'category', 'price', 'stock', 'unit', 'batches', 'inCart'],
    storageKey: 'pos_columns'
  });

  // --- Column Resize Logic ---
  const [columnWidths, setColumnWidths] = useState<Record<string, number | undefined>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('pos_column_widths');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse column widths', e); }
        }
    }
    return {
        icon: 48,
        name: 220,
        barcode: 140,
        category: 120,
        price: 80,
        stock: 80,
        unit: 110,
        batches: 140,
        inCart: 80
    };
  });

  useEffect(() => {
    localStorage.setItem('pos_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const [isColumnResizing, setIsColumnResizing] = useState(false); // Track if resizing is active
  
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startColumnResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnResizing(true); // Disable D&D
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = columnWidths[columnId] || 100;
    
    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', endColumnResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    // Use requestAnimationFrame for smoother updates if needed, but direct state update is usually fine for this React version
    const diff = e.pageX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, []);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false); // Re-enable D&D
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);
  
  // Clean up listener on unmount
  useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleColumnResizeMove);
        document.removeEventListener('mouseup', endColumnResize);
      };
  }, [endColumnResize, handleColumnResizeMove]);

  const handleAutoFit = (e: React.MouseEvent, columnId: string) => {
      e.stopPropagation();
      setColumnWidths(prev => {
          const next = { ...prev };
          delete next[columnId];
          return next;
      });
  };

  const columns = {
    icon: { label: '', className: 'px-3 py-2 text-start' },
    name: { label: t.name || 'Name', className: 'px-3 py-2 text-start' },
    barcode: { label: t.code || 'Code', className: 'px-3 py-2 text-start' },
    category: { label: t.category || 'Category', className: 'px-3 py-2 text-start' },
    price: { label: t.price || 'Price', className: 'px-3 py-2 text-start' },
    stock: { label: t.stock || 'Stock', className: 'px-3 py-2 text-start' },
    unit: { label: t.unit || 'Unit', className: 'px-3 py-2 text-center' },
    batches: { label: t.batches || 'Batches', className: 'px-3 py-2 text-start' },
    inCart: { label: t.inCart || 'In Cart', className: 'px-3 py-2 text-center' }
  };



  const renderCellContent = (drug: Drug, group: Drug[], columnId: string) => {
    const totalStock = group.reduce((sum, d) => sum + d.stock, 0);
    const inCartTotal = group.reduce((sum, d) => sum + (cart.find(c => c.id === d.id)?.quantity || 0), 0);

    switch (columnId) {
      case 'icon':
        return (
          <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
            <span className="material-symbols-rounded text-[18px]">{getDrugIcon(drug)}</span>
          </div>
        );
      case 'name':
        return (
          <div className="flex flex-col" dir="ltr">
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100 drug-name text-left">
              {drug.name} {drug.dosageForm ? <span className="text-gray-500 font-normal">({drug.dosageForm})</span> : ''}
            </span>
            <span className="text-xs text-gray-500 text-left">{drug.genericName}</span>
          </div>
        );
      case 'barcode':
        return <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{drug.internalCode || drug.barcode}</span>;
      case 'category':
        return <span className="text-xs text-gray-600 dark:text-gray-400">{drug.category}</span>;
      case 'price':
        return <span className="font-bold text-sm text-gray-700 dark:text-gray-300">${drug.price.toFixed(2)}</span>;
      case 'stock':
        return totalStock === 0 ? (
          <span className="text-xs font-bold text-red-500">Out of Stock</span>
        ) : (
          <span className="text-sm text-gray-700 dark:text-gray-300">{parseFloat(totalStock.toFixed(2))}</span>
        );
      case 'unit':
        return (
          <div className="text-center">
            {drug.unitsPerPack && drug.unitsPerPack > 1 ? (
                <PosDropdown 
                    items={['pack', 'unit']}
                    selectedItem={(selectedUnits[drug.id] || 'pack')}
                    isOpen={openUnitDropdown === drug.id}
                    onToggle={() => {
                        setOpenUnitDropdown(openUnitDropdown === drug.id ? null : drug.id);
                        setOpenBatchDropdown(null);
                    }}
                    onSelect={(item) => setSelectedUnits(prev => ({ ...prev, [drug.id]: item as 'pack' | 'unit' }))}
                    keyExtractor={(item) => item as string}
                    renderSelected={(item) => (
                        <div className="w-full px-2 py-1 text-[11px] font-medium text-center text-gray-600 dark:text-gray-400">
                             {(item as string) === 'pack' ? (t.pack || 'Pack') : (t.unit || 'Unit')}
                        </div>
                    )}
                    renderItem={(item) => (
                        <div className="w-full px-2 py-1 text-[11px] text-center text-gray-600 dark:text-gray-400">
                            <span className="font-medium capitalize">{(item as string) === 'pack' ? (t.pack || 'Pack') : (t.unit || 'Unit')}</span>
                        </div>
                    )}
                    onEnter={() => {
                        addGroupToCart(group);
                        setSearch('');
                        setActiveIndex(0);
                        searchInputRef.current?.focus();
                    }}
                    className="h-7 w-24 mx-auto"
                    color={color}
                />
            ) : (
              <span className="text-xs text-gray-400">-</span>
            )}
          </div>
        );
      case 'batches':
        // Find currently selected batch or default (FEFO)
        const selectedBatchId = selectedBatches[drug.id];
        const defaultBatch = group.find(d => d.stock > 0) || group[0];
        const currentBatch = selectedBatchId ? group.find(d => d.id === selectedBatchId) : defaultBatch;
        
        const isOpen = openBatchDropdown === drug.id;
        
        // Format date helper
        const formatDate = (dateStr: string) => {
            return new Date(dateStr).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'});
        };

        return (
          <PosDropdown 
            items={group}
            selectedItem={currentBatch}
            isOpen={isOpen}
            onToggle={() => {
                setOpenBatchDropdown(isOpen ? null : drug.id);
                setOpenUnitDropdown(null);
            }}
            onSelect={(item) => setSelectedBatches(prev => ({ ...prev, [drug.id]: (item as Drug).id }))}
            keyExtractor={(item) => (item as Drug).id}
            renderSelected={(item) => {
                const i = item as Drug | undefined;
                return (
                <div className="w-full px-2 py-1 text-[11px] text-center truncate text-gray-600 dark:text-gray-400">
                    {i ? `${formatDate(i.expiryDate)} • ${i.stock}` : 'No Stock'}
                </div>
            )}}
            renderItem={(item) => {
                const i = item as Drug;
                return (
                <div className="w-full px-2 py-1 text-[11px] text-center text-gray-600 dark:text-gray-400">
                    <span className="font-medium mr-1">{formatDate(i.expiryDate)}</span>
                    <span className="opacity-70 text-[10px]">({i.stock})</span>
                </div>
            )}}
            onEnter={() => {
                addGroupToCart(group);
                setSearch('');
                setActiveIndex(0);
                searchInputRef.current?.focus();
            }}
            className="h-7 w-32"
            color={color}
            transparentIfSingle={true}
          />
        );
      case 'inCart':
        return (
          <div className="text-center">
            {inCartTotal > 0 && (
              <div className={`inline-block bg-${color}-600 text-white text-xs font-bold px-2 py-1 rounded-md`}>
                {inCartTotal}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const searchDirection = useSmartDirection(search);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-4 px-2">
        {/* Header - Compact */}
        <h2 className="text-xl font-bold tracking-tight type-expressive shrink-0">{t.posTitle || 'Point of Sale'}</h2>

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
          />
        </div>
      </div>
      
      {/* Main POS Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden">
      {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
      <div className={`flex-1 flex flex-col gap-3 h-full overflow-hidden ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Customer Details */}
          <div className={`${CARD_MD} p-3 border border-gray-200 dark:border-gray-800`}>
            {selectedCustomer ? (
              // Locked Customer Card
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in">
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                      <span className="material-symbols-rounded text-[24px]">person</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-lg">
                        {selectedCustomer.name}
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 font-mono border border-gray-200 dark:border-gray-600">
                          {selectedCustomer.code || `#${selectedCustomer.serialId}`}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-rounded text-[16px]">call</span>
                        {selectedCustomer.phone}
                      </p>
                    </div>
                 </div>
                 
                 <div className="flex-1 border-s-2 border-gray-100 dark:border-gray-700 ps-6 ms-2 hidden sm:block">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                      <span className="material-symbols-rounded text-[14px]">location_on</span>
                      Address
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedCustomer.streetAddress ? selectedCustomer.streetAddress + ' - ' : ''}
                      {selectedCustomer.area ? getLocationName(selectedCustomer.area, 'area', 'AR') + ' - ' : ''}
                      {selectedCustomer.city ? getLocationName(selectedCustomer.city, 'city', 'AR') : ''}
                    </p>
                 </div>

                 <div className="flex flex-col gap-2 min-w-[140px]">
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                        <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                            paymentMethod === 'cash'
                            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        >
                        <span className="material-symbols-rounded text-[16px]">payments</span>
                        {t.cash}
                        </button>
                        <button
                        onClick={() => setPaymentMethod('visa')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                            paymentMethod === 'visa'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        >
                        <span className="material-symbols-rounded text-[16px]">credit_card</span>
                        {t.visa}
                        </button>
                    </div>
                    <button 
                        onClick={clearCustomerSelection}
                        className="w-full py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-rounded text-[16px]">close</span>
                        Change Customer
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
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.customerInfo || 'Customer Information'}</label>
                <SearchInput
                  value={customerName}
                  onSearchChange={(val) => {
                    setCustomerName(val);
                    setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(0);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={customerDropdownHook.handleKeyDown}
                  placeholder={t.customers?.searchPlaceholder || 'Search by name, phone, code...'}
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
                            onClick={() => handleCustomerSelect(customer)}
                            onMouseEnter={() => setHighlightedCustomerIndex(index)}
                        >
                            <span className={`text-sm font-bold ${index === highlightedCustomerIndex ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                {customer.name}
                            </span>
                            <div className="flex gap-2 text-xs text-gray-500">
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
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl gap-1">
                    <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-24 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'cash'
                        ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    >
                    <span className="material-symbols-rounded text-[18px]">payments</span>
                    {t.cash}
                    </button>
                    <button
                    onClick={() => setPaymentMethod('visa')}
                    className={`w-24 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'visa'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    >
                    <span className="material-symbols-rounded text-[18px]">credit_card</span>
                    {t.visa}
                    </button>
                </div>
                </div>
              </div>
            )}
          </div>
        {/* Search & Filter */}
        <div className={`${CARD_MD} p-2.5 border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-2 shrink-0`}>
             <div className="relative flex-1">
                <SearchInput
                    ref={searchInputRef}
                    value={search}
                    onSearchChange={(val) => {
                        setSearch(val);
                        setActiveIndex(0);
                    }}
                    placeholder={t.searchPlaceholder}
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
                            ...(selection ? [{ label: 'Copy', icon: 'content_copy', action: () => navigator.clipboard.writeText(selection) }] : []),
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
            <div className="relative min-w-[150px] h-[42px]">
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
            <div className="relative min-w-[150px] h-[42px]">
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
            <div className={`${CARD_MD} flex-1 overflow-auto border border-gray-200 dark:border-gray-800`}>
              <table className="w-full min-w-full table-fixed border-collapse">
                <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
                  <tr>
                    {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                      <th
                        key={columnId}
                        data-column-id={columnId}
                        className={`${columns[columnId as keyof typeof columns].className} ${!isColumnResizing ? 'cursor-grab active:cursor-grabbing' : ''} select-none transition-colors relative group/header hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          draggedColumn === columnId ? 'opacity-50' : ''
                        } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                        title={columns[columnId as keyof typeof columns].label}
                        dir={columnId === 'name' ? 'ltr' : undefined}
                        draggable={!isColumnResizing}
                        onDragStart={(e) => {
                          // Only allow dragging if NOT resizing
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
                            onHeaderTouchMove();
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
                            ...Object.keys(columns).map(colId => ({
                              label: columns[colId as keyof typeof columns].label || 'Icon',
                              icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
                              action: () => toggleColumnVisibility(colId)
                            }))
                          ]);
                        }}
                        style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                      >
                       <div className="flex items-center justify-between h-full w-full">
                        <span className="truncate flex-1">{columns[columnId as keyof typeof columns].label}</span>
                        
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
                  {groupedDrugs.slice(0, 100).map((group, index) => {
                    const drug = group[0];
                    const totalStock = group.reduce((sum, d) => sum + d.stock, 0);
                    
                    return (
                      <tr 
                        key={drug.id}
                        onClick={(e) => {
                            if (isRowLongPress.current) {
                                isRowLongPress.current = false;
                                return;
                            }
                            addGroupToCart(group);
                        }}
                        onTouchStart={(e) => {
                            currentTouchItem.current = { drug, group };
                            onRowTouchStart(e);
                        }}
                        onTouchEnd={onRowTouchEnd}
                        onTouchMove={onRowTouchMove}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          showMenu(e.clientX, e.clientY, [
                            { label: 'Add to Cart', icon: 'add_shopping_cart', action: () => addGroupToCart(group) },
                            { label: 'View Details', icon: 'info', action: () => setViewingDrug(drug) },
                            { separator: true },
                            { label: 'Copy Name', icon: 'content_copy', action: () => navigator.clipboard.writeText(drug.name) },
                            { label: t.actions.showSimilar, icon: 'category', action: () => setSelectedCategory(drug.category) }
                          ]);
                        }}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 cursor-pointer transition-colors ${totalStock === 0 ? 'opacity-50' : ''} ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}`}
                      >
                        {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                          <td 
                            key={columnId} 
                            className="px-3 py-2"
                            style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                          >
                            {renderCellContent(drug, group, columnId)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
        className="hidden lg:flex w-4 items-center justify-center cursor-col-resize group z-10 -mx-2"
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
                cart.map(item => (
                    <div
                        key={`${item.id}-${item.isUnit ? 'unit' : 'pack'}`}
                        className="flex flex-col p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 relative group transition-all"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showMenu(e.clientX, e.clientY, [
                                { label: 'Remove Item', icon: 'delete', action: () => removeFromCart(item.id, !!item.isUnit), danger: true },
                                { separator: true },
                                {
                                    label: item.isUnit ? `Switch to ${t.pack}` : `Switch to ${t.unit}`,
                                    icon: 'swap_horiz',
                                    action: () => toggleUnitMode(item.id, !!item.isUnit),
                                    disabled: !item.unitsPerPack || item.unitsPerPack <= 1
                                },
                                {
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
                                    }
                                }
                            ]);
                        }}
                    >
                        {/* Delete Button - Absolute Top Right */}
                        <button
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id, !!item.isUnit); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 hover:scale-110"
                        >
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>

                        {/* Row 1: Name & Price */}
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 flex-1 drug-name" title={item.name}>
                                {item.name} {item.dosageForm ? <span className="font-normal text-gray-500">({item.dosageForm})</span> : ''}
                            </h4>
                            <div className="text-end shrink-0">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    ${calculateItemTotal(item).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Meta & Controls */}
                        <div className="flex items-center justify-between gap-2 mt-1">
                            {/* Meta Info */}
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-gray-500 font-medium bg-gray-100 dark:bg-gray-700/50 px-1 rounded">
                                        {new Date(item.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'})}
                                    </span>
                                    {item.isUnit && <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1 rounded">{t.unit}</span>}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1">
                                {/* Unit Toggle (if applicable) */}
                                {item.unitsPerPack && item.unitsPerPack > 1 && (
                                    <button
                                        onClick={() => toggleUnitMode(item.id, !!item.isUnit)}
                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                                        title={item.isUnit ? "Switch to Pack" : "Switch to Unit"}
                                    >
                                        <span className="material-symbols-rounded text-[14px]">swap_horiz</span>
                                    </button>
                                )}

                                {/* Discount Button & Input */}
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => {
                                            const currentDiscount = item.discount || 0;
                                            if (currentDiscount > 0) {
                                                // Remove discount
                                                updateItemDiscount(item.id, !!item.isUnit, 0);
                                            } else {
                                                // Apply max discount (default 10%)
                                                const maxDisc = item.maxDiscount ?? 10;
                                                updateItemDiscount(item.id, !!item.isUnit, maxDisc);
                                                setGlobalDiscount(0);
                                            }
                                        }}
                                        className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${(item.discount || 0) > 0 ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' : 'text-gray-400'}`}
                                        title={`Toggle Max Discount (${item.maxDiscount ?? 10}%)`}
                                    >
                                        <span className="material-symbols-rounded text-[14px]">percent</span>
                                    </button>
                                    <input 
                                        type="number" 
                                        value={item.discount || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 0 && val <= 100) {
                                                const maxDisc = item.maxDiscount ?? 10;
                                                if (val > maxDisc) {
                                                    updateItemDiscount(item.id, !!item.isUnit, maxDisc);
                                                    if (maxDisc > 0) setGlobalDiscount(0);
                                                } else {
                                                    updateItemDiscount(item.id, !!item.isUnit, val);
                                                    if (val > 0) setGlobalDiscount(0);
                                                }
                                            } else if (e.target.value === '') {
                                                 updateItemDiscount(item.id, !!item.isUnit, 0);
                                            }
                                        }}
                                        className="w-7 h-5 text-[10px] rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>

                                {/* Qty Control */}
                                <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-6 overflow-hidden">
                                    <button
                                        onClick={() => updateQuantity(item.id, !!item.isUnit, -1)}
                                        className="w-6 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 active:bg-gray-100"
                                    >
                                        <span className="material-symbols-rounded text-[14px]">remove</span>
                                    </button>
                                    <div className="w-8 h-full flex items-center justify-center text-xs font-bold border-x border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                        {item.quantity}
                                    </div>
                                    <button
                                        onClick={() => updateQuantity(item.id, !!item.isUnit, 1)}
                                        className="w-6 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 active:bg-gray-100"
                                    >
                                        <span className="material-symbols-rounded text-[14px]">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
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

            <div className="flex gap-2">
                <button 
                    onClick={() => handleCheckout('walk-in')}
                    disabled={cart.length === 0}
                    className={`flex-1 py-2.5 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold text-sm shadow-md shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2`}
                >
                    <span className="material-symbols-rounded text-[18px]">payments</span>
                    {t.completeOrder}
                </button>
                <button
                    onClick={() => handleCheckout('delivery')}
                    disabled={cart.length === 0}
                    className={`w-12 py-2.5 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-900/50 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center`}
                    title="Delivery Order"
                >
                    <span className="material-symbols-rounded text-[20px]">local_shipping</span>
                </button>
            </div>
        </div>
      </div>
      
      {/* Product Details Modal */}
      {viewingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setViewingDrug(null)}>
          <div className={`${CARD_LG} w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
            <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
              <h3 className={`text-lg font-bold type-expressive text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}>
                <span className="material-symbols-rounded">info</span>
                Product Details
              </h3>
              <button onClick={() => setViewingDrug(null)} className="text-gray-400 hover:text-gray-600">
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
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
                        <p className={`text-xl font-bold ${viewingDrug.stock === 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                            {viewingDrug.stock}
                        </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Price</label>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            ${viewingDrug.price.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{viewingDrug.category}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Expiry</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(viewingDrug.expiryDate).toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Shelf A-2</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Description</label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        {viewingDrug.description || 'No description available.'}
                    </p>
                </div>
            </div>
            
             <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                 <button 
                    onClick={() => setViewingDrug(null)}
                    className={`w-full py-3 rounded-xl font-bold text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all`}
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Close Main POS Content div */}
      </div>
    </div>
  );
};

// --- Local Component for Dropdown ---
// Inlined to avoid extra files, reusing the generic hook efficiently.

