```
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useContextMenu } from '../components/ContextMenu';
import { Drug, Supplier, Purchase } from '../types';
import { createSearchRegex, parseSearchTerm } from '../utils/searchUtils';

interface PurchasesProps {
  inventory: Drug[];
  suppliers: Supplier[];
  purchases: Purchase[];
  onPurchaseComplete: (purchase: Purchase) => void;
  color: string;
  t: any;
}

export const Purchases: React.FC<PurchasesProps> = ({ inventory, suppliers, purchases, onPurchaseComplete, color, t }) => {
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  
  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default lg:w-96 is 24rem = 384px
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
        if (newWidth > 300 && newWidth < 800) {
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

  const handleAddItem = (drug: Drug) => {
    setCart(prev => {
      const existing = prev.find(i => i.drugId === drug.id);
      if (existing) {
        return prev.map(i => i.drugId === drug.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { drugId: drug.id, name: drug.name, quantity: 1, costPrice: drug.costPrice || 0, dosageForm: drug.dosageForm }];
    });
  };

  const updateItem = (drugId: string, field: keyof PurchaseItem, value: number) => {
    setCart(prev => prev.map(i => i.drugId === drugId ? { ...i, [field]: value } : i));
  };

  const removeItem = (drugId: string) => {
    setCart(prev => prev.filter(i => i.drugId !== drugId));
  };

  const handleConfirm = () => {
    if (!selectedSupplierId || cart.length === 0) return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Unknown',
      items: cart,
      totalCost: cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0),
      status: 'completed'
    };
    
    onPurchaseComplete(purchase);
    setCart([]);
    setSelectedSupplierId('');
  };

  const { mode, regex } = parseSearchTerm(search);

  const filteredDrugs = inventory.filter(d => {
    if (mode === 'ingredient') {
        return d.activeIngredients && d.activeIngredients.some(ing => regex.test(ing));
    }
    
    const searchableText = `${d.name} ${d.dosageForm || ''} ${d.genericName}`;
    return regex.test(searchableText);
  });

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
       {/* Header with toggle */}
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-medium tracking-tight">{mode === 'create' ? t.title : t.historyTitle}</h2>
            <p className="text-sm text-slate-500">{t.subtitle}</p>
         </div>
         <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex text-xs font-bold">
            <button 
                onClick={() => setMode('create')}
                className={`px-4 py-2 rounded-full transition-all ${mode === 'create' ? `bg-${color}-600 text-white shadow-md` : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t.newPurchase}
            </button>
            <button 
                onClick={() => setMode('history')}
                className={`px-4 py-2 rounded-full transition-all ${mode === 'history' ? `bg-${color}-600 text-white shadow-md` : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t.viewHistory}
            </button>
         </div>
       </div>

       {mode === 'create' ? (
           <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
               {/* LEFT: Selection Area */}
               <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                   {/* Supplier Select */}
                   <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t.selectSupplier}</label>
                        <select 
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2"
                            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                            value={selectedSupplierId}
                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                        >
                            <option value="">-- Select Supplier --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                   </div>

                   {/* Drug Search & Grid */}
                   <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                        <input 
                            type="text" 
                            placeholder={t.searchDrug}
                            className="w-full p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2"
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
                        <div className="flex-1 overflow-y-auto">
                            {search.trim() === '' ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-8">
                                <span className="material-symbols-rounded text-6xl opacity-20">search</span>
                                <p className="text-sm font-medium">{t.searchDrug}</p>
                                <p className="text-xs text-center max-w-xs opacity-70">
                                  {t.startSearching || 'Start searching for products to add to purchase order'}
                                </p>
                              </div>
                            ) : filteredDrugs.length === 0 ? (
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
                                                { label: 'Copy Name', icon: 'content_copy', action: () => navigator.clipboard.writeText(drug.name) }
                                            ]);
                                         }}
                                         className={`p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-${color}-50 dark:hover:bg-${color}-900/20 cursor-pointer transition-colors group`}
                                    >    <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 drug-name">
                                                    {drug.name} {drug.dosageForm ? <span className="font-normal text-slate-500">({drug.dosageForm})</span> : ''}
                                                </p>
                                                <p className="text-xs text-slate-500">{drug.genericName}</p>
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
                 <div className="w-1 h-16 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div>
               </div>

               {/* RIGHT: Order Cart */}
               <div 
                 ref={sidebarRef}
                 style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
                 className="w-full lg:w-[var(--sidebar-width)] bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-xl"
               >
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                       <span className="material-symbols-rounded">shopping_cart</span>
                       {t.cartTitle}
                   </h3>
                   
                   <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                       {cart.length === 0 ? (
                           <div className="text-center text-slate-400 py-10">{t.emptyCart}</div>
                       ) : (
                           cart.map(item => (
                               <div 
                                   key={item.drugId} 
                                   className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl relative"
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
                                   <button onClick={() => removeItem(item.drugId)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                                       <span className="material-symbols-rounded text-sm">close</span>
                                   </button>
                                   <p className="font-bold text-sm mb-2 pe-6 drug-name">
                                       {item.name} {item.dosageForm ? <span className="font-normal text-slate-500">({item.dosageForm})</span> : ''}
                                   </p>
                                   <div className="flex gap-2">
                                       <div className="flex-1">
                                           <label className="text-[10px] text-slate-400 uppercase font-bold">{t.headers.cost}</label>
                                           <input 
                                             type="number" 
                                             className="w-full p-1.5 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" 
                                             value={item.costPrice}
                                             onChange={e => updateItem(item.drugId, 'costPrice', parseFloat(e.target.value) || 0)}
                                           />
                                       </div>
                                       <div className="flex-1">
                                           <label className="text-[10px] text-slate-400 uppercase font-bold">{t.headers.qty}</label>
                                           <input 
                                             type="number" 
                                             className="w-full p-1.5 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" 
                                             value={item.quantity}
                                             onChange={e => updateItem(item.drugId, 'quantity', parseFloat(e.target.value) || 0)}
                                           />
                                       </div>
                                   </div>
                               </div>
                           ))
                       )}
                   </div>

                   <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                       <div className="flex justify-between text-sm">
                           <span className="text-slate-500">{t.summary.totalItems}</span>
                           <span className="font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                       </div>
                       <div className="flex justify-between text-lg font-bold">
                           <span>{t.summary.totalCost}</span>
                           <span className={`text-${color}-600`}>${cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0).toFixed(2)}</span>
                       </div>
                       <button 
                           onClick={handleConfirm}
                           disabled={cart.length === 0 || !selectedSupplierId}
                           className={`w-full py-3 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold transition-all shadow-lg shadow-${color}-200 dark:shadow-none active:scale-95`}
                       >
                           {t.summary.confirm}
                       </button>
                   </div>
               </div>
           </div>
       ) : (
           /* HISTORY VIEW */
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-start">
                    <thead className={`bg-${color}-50 dark:bg-${color}-900/20`}>
                        <tr>
                            <th className="p-4 text-start text-xs font-bold uppercase text-slate-500">ID</th>
                            <th className="p-4 text-start text-xs font-bold uppercase text-slate-500">Date</th>
                            <th className="p-4 text-start text-xs font-bold uppercase text-slate-500">Supplier</th>
                            <th className="p-4 text-start text-xs font-bold uppercase text-slate-500">Items</th>
                            <th className="p-4 text-start text-xs font-bold uppercase text-slate-500">Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.map(p => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-4 text-xs font-mono">{p.id.slice(-6)}</td>
                                <td className="p-4 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                                <td className="p-4 text-sm font-bold">{p.supplierName}</td>
                                <td className="p-4 text-sm">{p.items.length} items</td>
                                <td className="p-4 text-sm font-bold text-slate-800 dark:text-slate-200">${p.totalCost.toFixed(2)}</td>
                            </tr>
                        ))}
                         {purchases.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No purchase history</td></tr>}
                    </tbody>
                </table>
           </div>
       )}
    </div>
  );
};
