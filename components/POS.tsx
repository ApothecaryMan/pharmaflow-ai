import React, { useState, useMemo } from 'react';
import { Drug, CartItem } from '../types';

interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: { items: CartItem[], customerName: string, globalDiscount: number, subtotal: number, total: number }) => void;
  color: string;
  t: any;
}

export const POS: React.FC<POSProps> = ({ inventory, onCompleteSale, color, t }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  // Selected category state key: 'All', 'Medicine', 'Cosmetics', 'Non-Medicine'
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customerName, setCustomerName] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const addToCart = (drug: Drug) => {
    if (drug.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === drug.id);
      if (existing) {
        // If it's already in cart, check stock limits.
        if (existing.quantity >= drug.stock && !existing.isUnit) return prev; 
        return prev.map(item => item.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...drug, quantity: 1, discount: 0, isUnit: false }];
    });
  };

  const addGroupToCart = (group: Drug[]) => {
    // FEFO: Find first batch with available stock
    const validBatch = group.find(d => {
        const inCart = cart.find(c => c.id === d.id)?.quantity || 0;
        return (d.stock - inCart) > 0;
    });
    
    if (validBatch) {
        addToCart(validBatch);
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
        customerName,
        globalDiscount,
        subtotal,
        total: cartTotal
    });
    setCart([]);
    setCustomerName('');
    setGlobalDiscount(0);
    setMobileTab('products');
  };

  const filteredDrugs = useMemo(() => {
    const term = search.toLowerCase();
    return inventory.filter(d => {
        const drugBroadCat = getBroadCategory(d.category);
        const matchesCategory = selectedCategory === 'All' || drugBroadCat === selectedCategory;
        
        const matchesSearch = 
            d.name.toLowerCase().includes(term) || 
            d.genericName.toLowerCase().includes(term) ||
            d.description.toLowerCase().includes(term) ||
            d.category.toLowerCase().includes(term) ||
            (d.barcode && d.barcode.toLowerCase().includes(term)) ||
            (d.internalCode && d.internalCode.toLowerCase().includes(term));
        
        return matchesCategory && matchesSearch;
    });
  }, [inventory, search, selectedCategory]);

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

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 animate-fade-in relative">
      {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
      <div className={`flex-1 flex flex-col gap-3 h-full overflow-hidden ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
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
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                            selectedCategory === cat.id 
                            ? `bg-${color}-100 dark:bg-${color}-900 text-${color}-800 dark:text-${color}-200` 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pe-1 pb-24 lg:pb-0">
            <div className="grid grid-cols-2 gap-2">
                {groupedDrugs.slice(0, 100).map(group => {
                    const drug = group[0];
                    const totalStock = group.reduce((sum, d) => sum + d.stock, 0);
                    // Calculate total quantity of this drug (all batches) currently in cart
                    const inCartTotal = group.reduce((sum, d) => sum + (cart.find(c => c.id === d.id)?.quantity || 0), 0);
                    const isExpanded = expandedGroups[drug.name];
                    
                    return (
                    <div 
                        key={drug.id} 
                        onClick={() => addGroupToCart(group)}
                        role="button"
                        className={`relative flex flex-col text-start p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-md hover:border-${color}-300 dark:hover:border-${color}-700 group cursor-pointer active:scale-95 select-none ${totalStock === 0 ? 'opacity-50' : ''}`}
                    >
                        {/* Info Button */}
                        <div 
                           onClick={(e) => handleViewProductDetails(e, drug.id)}
                           className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 z-10 rtl:left-1 rtl:right-auto"
                           title="Info"
                           role="button"
                        >
                            <span className="material-symbols-rounded text-[14px]">info</span>
                        </div>

                        {/* Compact Header: Icon + Info Side by Side */}
                        <div className="flex items-center gap-2 mb-2 w-full">
                            <div className={`w-8 h-8 rounded-lg bg-${color}-50 dark:bg-${color}-950 text-${color}-600 dark:text-${color}-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                <span className="material-symbols-rounded text-[18px]">{getDrugIcon(drug)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate leading-tight">
                                  {drug.name} <span className="text-[9px] text-slate-500 font-normal ms-0.5">{getFormLabel(drug)}</span>
                                </h3>
                                <p className="text-[9px] text-slate-500 truncate leading-tight">{drug.genericName}</p>
                            </div>
                        </div>
                        
                        {/* Batches List (Exp Dates) */}
                        <div className="mb-1 space-y-0.5 min-h-[1.5em]">
                            {(isExpanded ? group : group.slice(0, 3)).map(batch => (
                                <div key={batch.id} className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 px-0.5">
                                    <span>Exp: {new Date(batch.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'})}</span>
                                    <span className={batch.stock < 5 ? 'text-red-500 font-bold' : ''}>Qty: {batch.stock}</span>
                                </div>
                            ))}
                            {group.length > 3 && (
                                <div 
                                    onClick={(e) => toggleBatchList(e, drug.name)}
                                    className={`text-[9px] font-bold px-0.5 cursor-pointer hover:underline mt-1 flex items-center gap-1 ${isExpanded ? `text-${color}-600` : 'text-slate-400 italic'}`}
                                >
                                    {isExpanded ? (
                                        <>
                                            <span>Show less</span>
                                            <span className="material-symbols-rounded text-[10px]">expand_less</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>+{group.length - 3} more batches...</span>
                                            <span className="material-symbols-rounded text-[10px]">expand_more</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-auto flex justify-between items-center w-full pt-1 border-t border-slate-50 dark:border-slate-800 relative">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">${drug.price.toFixed(2)}</span>
                            
                            {/* Footer: Stock Status or Cart Qty */}
                            <div className="flex items-center gap-1">
                                {totalStock === 0 ? (
                                    <span className="text-[9px] font-bold text-red-500 uppercase">Out of Stock</span>
                                ) : (
                                     inCartTotal > 0 && (
                                        <div className={`bg-${color}-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm`}>
                                            {inCartTotal}
                                        </div>
                                     )
                                )}
                            </div>
                        </div>
                    </div>
                )})}
            </div>
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

      {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
      <div className={`w-full lg:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden h-full ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
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

            {/* Customer Input */}
            <div>
              <input 
                type="text" 
                placeholder={t.customerName}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 text-xs"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
              />
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
                    <div key={item.id} className="flex flex-col p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative group">
                        {/* Row 1: Name and Price */}
                        <div className="flex justify-between items-start mb-1.5 pe-4">
                            <div className="min-w-0">
                                <h4 className="font-bold text-xs truncate text-slate-900 dark:text-slate-100 leading-tight">{item.name}</h4>
                                <div className="flex gap-1 items-center mt-0.5">
                                    <span className="text-[9px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-1 rounded">
                                        Exp: {new Date(item.expiryDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'})}
                                    </span>
                                    {item.isUnit && <span className="text-[9px] text-slate-400">/ {t.unit}</span>}
                                </div>
                            </div>
                            <div className="text-end shrink-0">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    ${calculateItemTotal(item).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Absolute delete button top-right */}
                        <button onClick={() => removeFromCart(item.id)} className="absolute top-1.5 right-1 text-slate-400 hover:text-red-500 p-0.5 opacity-60 hover:opacity-100 rtl:right-auto rtl:left-1">
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>
                        
                        {/* Row 2: Controls */}
                        <div className="flex items-center justify-between gap-1">
                            
                            {/* Qty */}
                            <div className="flex items-center bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm h-5">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                                    <span className="material-symbols-rounded text-[12px]">remove</span>
                                </button>
                                <span className="text-[10px] font-bold w-5 text-center leading-none">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                                    <span className="material-symbols-rounded text-[12px]">add</span>
                                </button>
                            </div>

                            {/* Unit Toggle (Compact) */}
                            {item.unitsPerPack && item.unitsPerPack > 1 && (
                                <button 
                                    onClick={() => toggleUnitMode(item.id)}
                                    className={`px-1.5 h-5 rounded text-[9px] font-bold border transition-colors truncate max-w-[50px] ${item.isUnit ? `bg-${color}-50 border-${color}-200 text-${color}-700` : 'bg-white border-slate-200 text-slate-600'}`}
                                    title={item.isUnit ? t.unit : t.pack}
                                >
                                    {item.isUnit ? t.unit : t.pack}
                                </button>
                            )}

                            {/* Discount */}
                            <div className="flex items-center gap-1 ms-auto">
                                <span className="text-[9px] text-slate-400">%</span>
                                <input 
                                    type="number" 
                                    value={item.discount || ''}
                                    placeholder="0"
                                    onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-7 h-5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 text-center p-0"
                                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                                />
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
                    <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={globalDiscount || ''}
                        placeholder="0"
                        onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-10 px-1 py-0.5 text-end rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 text-slate-700 dark:text-slate-300"
                        style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    />
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
    </div>
  );
};