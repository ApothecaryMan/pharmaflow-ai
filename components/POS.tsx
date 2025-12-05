import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useContextMenu } from '../components/ContextMenu';
import { Drug, CartItem } from '../types';
import { usePOSTabs } from '../hooks/usePOSTabs';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';
import { TabBar } from './TabBar';

interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: { items: CartItem[], customerName: string, globalDiscount: number, subtotal: number, total: number }) => void;
  color: string;
  t: any;
}

export const POS: React.FC<POSProps> = ({ inventory, onCompleteSale, color, t }) => {
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
  const [search, setSearch] = useState('');
  // Selected category state key: 'All', 'Medicine', 'Cosmetics', 'Non-Medicine'
  const [customerCode, setCustomerCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa'>('cash');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, 'pack' | 'unit'>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // drugId -> batchId
  const [openBatchDropdown, setOpenBatchDropdown] = useState<string | null>(null);
  const [batchSearch, setBatchSearch] = useState('');
  
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('in_stock');
  
  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(350);
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
        const rightEdge = sidebarRef.current.getBoundingClientRect().right;
        const newWidth = rightEdge - clientX;
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
    { id: 'Non-Medicine', label: t.categories.nonMedicine },
  ];

  // Helper to map specific categories to broad groups
  const getBroadCategory = (category: string): string => {
    const cosmetics = ['Skin Care', 'Personal Care'];
    const nonMedicine = ['Medical Equipment', 'Medical Supplies', 'Baby Care'];
    
    if (cosmetics.includes(category)) return 'Cosmetics';
    if (nonMedicine.includes(category)) return 'Non-Medicine';
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
      const existing = prev.find(item => item.id === drug.id);
      if (existing) {
        // Check if unit mode matches
        if (existing.isUnit !== isUnitMode) {
            // If mode differs, we might need to handle it (e.g., show error or separate items if supported)
            // For now, let's assume we just update the existing item's mode if quantity is 1, or add new logic.
            // But simpler: just alert or block. Or better: allow mixed? 
            // The current logic assumes one entry per drug ID. 
            // Let's stick to: if existing, use existing mode. OR, allow toggling mode in cart (which we already have).
            
            // If user explicitly selected a different unit in the list, maybe we should respect it?
            // Let's just add quantity for now, assuming the user handles mode switching in cart if needed, 
            // OR better: if the cart item is 'pack' and user adds 'unit', we could convert? No, too complex.
            
            // Correct logic:
            // If existing item has different unit mode, we should probably notify user or handle it.
            // For this iteration, let's assume we stick to the existing item's mode to avoid conflicts, 
            // UNLESS we want to support multiple lines for same drug (not supported by ID key).
            
            // Let's go with: If not in cart, use selected mode. If in cart, increment quantity (respecting existing mode).
             if (existing.quantity >= drug.stock && !existing.isUnit) return prev; 
             return prev.map(item => item.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        
        // Same mode, check limits
        if (isUnitMode && existing.unitsPerPack) {
             // Check unit stock limits if needed
        } else {
             if (existing.quantity >= drug.stock) return prev;
        }
        
        return prev.map(item => item.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item);
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
            const inCart = cart.find(c => c.id === d.id)?.quantity || 0;
            return (d.stock - inCart) > 0;
        });
    }
    
    if (targetBatch) {
        const unitMode = selectedUnits[firstDrug.id] === 'unit';
        addToCart(targetBatch, unitMode);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
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

  const toggleUnitMode = (id: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.unitsPerPack && item.unitsPerPack > 1) {
        // Toggle isUnit
        return { ...item, isUnit: !item.isUnit, quantity: 1 }; // Reset qty to 1 when switching to avoid huge numbers
      }
      return item;
    }));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    const validDiscount = Math.min(100, Math.max(0, discount));
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, discount: validDiscount } : item
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

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onCompleteSale({
        items: cart,
        customerName: customerName || 'Guest Customer',
        customerCode,
        paymentMethod,
        globalDiscount,
        subtotal,
        total: cartTotal
    });
    setCart([]);
    setCustomerName('');
    setCustomerCode('');
    setPaymentMethod('cash');
    setGlobalDiscount(0);
    setMobileTab('products');
  };

  const filteredDrugs = useMemo(() => {
    const term = search.trim();
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escapedTerm.split(/\s+/).join('.*');
    const searchRegex = new RegExp(pattern, 'i');

    return inventory.filter(d => {
        const drugBroadCat = getBroadCategory(d.category);
        const matchesCategory = selectedCategory === 'All' || drugBroadCat === selectedCategory;
        
        const matchesSearch = 
            searchRegex.test(d.name) || 
            searchRegex.test(d.genericName) ||
            searchRegex.test(d.description) ||
            searchRegex.test(d.category) ||
            (d.barcode && searchRegex.test(d.barcode)) ||
            (d.internalCode && searchRegex.test(d.internalCode));
        
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

  const columns = {
    icon: { label: '', className: 'px-3 py-2 text-start w-12' },
    name: { label: t.name || 'Name', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    barcode: { label: t.barcode || 'Barcode', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    category: { label: t.category || 'Category', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    price: { label: t.price || 'Price', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    stock: { label: t.stock || 'Stock', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    unit: { label: t.unit || 'Unit', className: 'px-3 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300' },
    batches: { label: t.batches || 'Batches', className: 'px-3 py-2 text-start text-xs font-bold text-slate-700 dark:text-slate-300' },
    inCart: { label: t.inCart || 'In Cart', className: 'px-3 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300' }
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
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 drug-name">
              {drug.name}
            </span>
            <span className="text-xs text-slate-500">{drug.genericName}</span>
          </div>
        );
      case 'barcode':
        return <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{drug.barcode}</span>;
      case 'category':
        return <span className="text-xs text-slate-600 dark:text-slate-400">{drug.category}</span>;
      case 'price':
        return <span className="font-bold text-sm text-slate-700 dark:text-slate-300">${drug.price.toFixed(2)}</span>;
      case 'stock':
        return totalStock === 0 ? (
          <span className="text-xs font-bold text-red-500">Out of Stock</span>
        ) : (
          <span className="text-sm text-slate-700 dark:text-slate-300">{parseFloat(totalStock.toFixed(2))}</span>
        );
      case 'unit':
        return (
          <div className="text-center">
            {drug.unitsPerPack && drug.unitsPerPack > 1 ? (
              <select 
                className={`px-2 py-1 text-xs rounded-lg border transition-colors cursor-pointer focus:outline-none bg-${color}-50 dark:bg-${color}-900/30 border-${color}-200 dark:border-${color}-700 text-${color}-700 dark:text-${color}-300`}
                onClick={(e) => e.stopPropagation()}
                value={selectedUnits[drug.id] || 'pack'}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedUnits(prev => ({ ...prev, [drug.id]: e.target.value as 'pack' | 'unit' }));
                }}
              >
                <option value="pack">{t.pack || 'Pack'}</option>
                <option value="unit">{t.unit || 'Unit'}</option>
              </select>
            ) : (
              <span className="text-xs text-slate-400">-</span>
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
          <div className="relative w-32">
            <div 
                className={`flex items-center justify-between w-full px-1.5 py-1 text-[11px] rounded-lg border transition-all cursor-text bg-slate-50 dark:bg-slate-800 ${isOpen ? `border-${color}-500 ring-1 ring-${color}-500` : 'border-slate-200 dark:border-slate-700'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenBatchDropdown(drug.id);
                    setBatchSearch('');
                }}
            >
                {isOpen ? (
                    <input 
                        autoFocus
                        className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
                        placeholder="Type MM/YY..."
                        value={batchSearch}
                        onChange={(e) => setBatchSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                            // Delay closing to allow click on option
                            setTimeout(() => setOpenBatchDropdown(null), 200);
                        }}
                    />
                ) : (
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                        {currentBatch ? `${formatDate(currentBatch.expiryDate)} • ${currentBatch.stock}` : 'No Stock'}
                    </span>
                )}
                <span className="material-symbols-rounded text-[14px] text-slate-400">arrow_drop_down</span>
            </div>
            
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 z-50 max-h-40 overflow-y-auto">
                    {group
                        .filter(b => {
                            if (!batchSearch) return true;
                            const date = formatDate(b.expiryDate);
                            return date.includes(batchSearch) || b.stock.toString().includes(batchSearch);
                        })
                        .map(batch => (
                        <div 
                            key={batch.id}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center ${selectedBatches[drug.id] === batch.id ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700` : 'text-slate-600 dark:text-slate-400'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBatches(prev => ({ ...prev, [drug.id]: batch.id }));
                                setOpenBatchDropdown(null);
                            }}
                        >
                            <span className="font-medium">{formatDate(batch.expiryDate)}</span>
                            <span className="opacity-70">Qty: {batch.stock}</span>
                        </div>
                    ))}
                    {group.filter(b => formatDate(b.expiryDate).includes(batchSearch)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400 text-center">No matches</div>
                    )}
                </div>
            )}
          </div>
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

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={switchTab}
        onTabClose={removeTab}
        onTabAdd={addTab}
        onTabRename={renameTab}
        onTogglePin={togglePin}
        maxTabs={maxTabs}
        color={color}
      />
      
      {/* Main POS Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden">
      {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
      <div className={`flex-1 flex flex-col gap-3 h-full overflow-hidden ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Customer Details */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.customerName}</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t.customerName}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.customerCode}</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">badge</span>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t.customerCode}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.paymentMethod}</label>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-rounded text-[18px]">payments</span>
                  {t.cash}
                </button>
                <button
                  onClick={() => setPaymentMethod('visa')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'visa'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-rounded text-[18px]">credit_card</span>
                  {t.visa}
                </button>
              </div>
            </div>
          </div>
        {/* Search & Filter */}
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative flex-1">
                <span className="material-symbols-rounded absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rtl:left-auto rtl:right-3 ltr:left-3 text-[18px]">search</span>
                <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 transition-all text-sm"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
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
            <div className="relative min-w-[150px]">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none ps-3 pe-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                >
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                </select>
                <span className="material-symbols-rounded absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
            </div>
            <div className="relative min-w-[150px]">
                <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as 'all' | 'in_stock' | 'out_of_stock')}
                    className="w-full appearance-none ps-3 pe-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                >
                    <option value="all">{t.allStock || 'All Stock'}</option>
                    <option value="in_stock">{t.inStock || 'In Stock'}</option>
                    <option value="out_of_stock">{t.outOfStock || 'Out of Stock'}</option>
                </select>
                <span className="material-symbols-rounded absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col overflow-hidden pe-1 pb-24 lg:pb-0">
            {search.trim() === '' ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">search</span>
                <p className="text-sm font-medium">{t.searchPlaceholder}</p>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.startSearching || 'Start searching for products to add them to cart'}
                </p>
              </div>
            ) : groupedDrugs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">search_off</span>
                <p className="text-sm font-medium">
                  {t.noResults || 'No results found'}
                </p>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.tryDifferentKeywords || 'Try searching with different keywords'}
                </p>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full">
                <thead className={`bg-${color}-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm`}>
                  <tr>
                    {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                      <th
                        key={columnId}
                        data-column-id={columnId}
                        className={`${columns[columnId as keyof typeof columns].className} cursor-move select-none transition-all ${
                          draggedColumn === columnId ? 'opacity-50' : ''
                        } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                        draggable
                        onDragStart={(e) => handleColumnDragStart(e, columnId)}
                        onDragOver={(e) => handleColumnDragOver(e, columnId)}
                        onDrop={(e) => handleColumnDrop(e, columnId)}
                        onDragEnd={handleColumnDragEnd}
                        onTouchStart={(e) => {
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
                      >
                        {columns[columnId as keyof typeof columns].label}
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
                        className={`border-b border-slate-100 dark:border-slate-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 cursor-pointer transition-colors ${totalStock === 0 ? 'opacity-50' : ''} ${index % 2 === 0 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}
                      >
                        {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                          <td key={columnId} className="px-3 py-2">
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
        <div className="w-1 h-16 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div>
      </div>

      {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
      <div 
        ref={sidebarRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`w-full lg:w-[var(--sidebar-width)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden h-full ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
        <div className={`p-3 bg-${color}-50 dark:bg-${color}-950/30 space-y-2 shrink-0`}>
            <div className="flex items-center justify-between">
                <h2 className={`text-sm font-bold text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}>
                    <span className="material-symbols-rounded text-[18px]">shopping_cart</span>
                    {t.cartTitle}
                </h2>
                
                {/* Mobile Back Button */}
                <button 
                    onClick={() => setMobileTab('products')}
                    className="lg:hidden p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                    <span className="material-symbols-rounded text-[18px]">close</span>
                </button>
            </div>


        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
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
                        key={item.id}
                        className="flex flex-col p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative group transition-all hover:shadow-sm"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showMenu(e.clientX, e.clientY, [
                                { label: 'Remove Item', icon: 'delete', action: () => removeFromCart(item.id), danger: true },
                                { separator: true },
                                {
                                    label: item.isUnit ? `Switch to ${t.pack}` : `Switch to ${t.unit}`,
                                    icon: 'swap_horiz',
                                    action: () => toggleUnitMode(item.id),
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
                                                    setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: val } : i));
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
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 hover:scale-110"
                        >
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>

                        {/* Row 1: Name & Price */}
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 flex-1 drug-name" title={item.name}>
                                {item.name}
                            </h4>
                            <div className="text-end shrink-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                    ${calculateItemTotal(item).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Meta & Controls */}
                        <div className="flex items-center justify-between gap-2 mt-1">
                            {/* Meta Info */}
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-700/50 px-1 rounded">
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
                                        onClick={() => toggleUnitMode(item.id)}
                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
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
                                                setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: 0 } : i));
                                            } else {
                                                // Apply max discount (default 10%)
                                                const maxDisc = item.maxDiscount ?? 10;
                                                setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: maxDisc } : i));
                                                setGlobalDiscount(0);
                                            }
                                        }}
                                        className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${(item.discount || 0) > 0 ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' : 'text-slate-400'}`}
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
                                                    setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: maxDisc } : i));
                                                    if (maxDisc > 0) setGlobalDiscount(0);
                                                } else {
                                                    setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: val } : i));
                                                    if (val > 0) setGlobalDiscount(0);
                                                }
                                            } else if (e.target.value === '') {
                                                 setCart(prev => prev.map(i => i.id === item.id ? { ...i, discount: 0 } : i));
                                            }
                                        }}
                                        className="w-7 h-5 text-[10px] rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>

                                {/* Qty Control */}
                                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm h-6 overflow-hidden">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-6 h-full flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 active:bg-slate-100"
                                    >
                                        <span className="material-symbols-rounded text-[14px]">remove</span>
                                    </button>
                                    <div className="w-8 h-full flex items-center justify-center text-xs font-bold border-x border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                        {item.quantity}
                                    </div>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-6 h-full flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 active:bg-slate-100"
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

        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
            
            {/* Totals Section */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{t.subtotal}</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">{t.orderDiscount}</span>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px] text-slate-400">percent</span>
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
                            className="w-10 px-1 py-0.5 text-end rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 text-slate-700 dark:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <span>{t.total}</span>
                    <span className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}>${cartTotal.toFixed(2)}</span>
                </div>
            </div>

            <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`w-full py-2.5 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2`}
            >
                <span className="material-symbols-rounded text-[18px]">payments</span>
                {t.completeOrder}
            </button>
        </div>
      </div>
      
      {/* Product Details Modal */}
      {viewingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setViewingDrug(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}>
                <span className="material-symbols-rounded">info</span>
                Product Details
              </h3>
              <button onClick={() => setViewingDrug(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{viewingDrug.name}</h2>
                    <p className="text-slate-500 font-medium">{viewingDrug.genericName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Stock</label>
                        <p className={`text-xl font-bold ${viewingDrug.stock === 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {viewingDrug.stock}
                        </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Price</label>
                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                            ${viewingDrug.price.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Category</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{viewingDrug.category}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Expiry</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{new Date(viewingDrug.expiryDate).toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">Shelf A-2</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        {viewingDrug.description || 'No description available.'}
                    </p>
                </div>
            </div>
            
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
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