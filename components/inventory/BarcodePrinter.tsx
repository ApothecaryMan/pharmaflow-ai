import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Drug } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { printLabels, PrintLabelItem } from './LabelPrinter';
import { useSmartDirection } from '../common/SmartInputs';
import { useContextMenu } from '../common/ContextMenu';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { useStatusBar } from '../layout/StatusBar';

interface BarcodePrinterProps {
  inventory: Drug[];
  color: string;
  t: any;
  language: string;
  textTransform: 'normal' | 'uppercase';
}

interface QueueItem extends PrintLabelItem {
  id: string; // Unique ID for the queue item (e.g. timestamp)
}

export const BarcodePrinter: React.FC<BarcodePrinterProps> = ({ inventory, color, t, language, textTransform }) => {
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();
  const { playBeep } = usePosSounds();
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [printConfig, setPrintConfig] = useState({
      store: true,
      name: true,
      price: true,
      expiry: true,
      barcode: true,
      hotline: false
  });
  
  // Smart direction for search
  const dir = useSmartDirection(search, t.barcodePrinter?.searchPlaceholder || 'Search product to print...');

  // Search logic
  const searchResults = useMemo(() => {
    const trimmed = search.trim();
    // Reset selection when search changes
    setSelectedSuggestionIndex(-1);
    
    if (!trimmed) return [];
    
    const { mode, regex } = parseSearchTerm(search);

    return inventory.filter(d => {
        // Exact code match (no regex needed)
        if (d.barcode === trimmed || d.internalCode === trimmed) return true;

        if (mode === 'ingredient') {
            return d.activeIngredients?.some(ing => regex.test(ing));
        }

        const searchableText = [
            d.name,
            d.genericName,
            d.dosageForm,
            d.category,
            d.description,
            ...(Array.isArray(d.activeIngredients) ? d.activeIngredients : []),
        ].filter(Boolean).join(" ");

        return regex.test(searchableText);
    }).slice(0, 10);
  }, [search, inventory]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Keydown (Simple Alphanumeric for Search Focus + Shortcuts)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if already in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        // Handle Escape to blur
        if (e.key === 'Escape') {
            (document.activeElement as HTMLElement).blur();
            setShowSuggestions(false);
        }
        return;
      }

      // 2. Capture Alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearch((prev) => prev + e.key);
        setShowSuggestions(true);
        return;
      }

      // 3. Shortcuts
      // Alt+P: Print
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) {
          e.preventDefault();
          if (queue.length > 0) handlePrint();
          return;
      }
      // Alt+C: Clear
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ؤ')) {
          e.preventDefault();
          if (queue.length > 0) clearQueue();
          return;
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [queue.length]); // Re-bind when queue length changes for shortcuts

  // Auto-fill on exact barcode match
  useEffect(() => {
     let trimmed = search.trim();
     let scanQty = 1;

     // Support qty*barcode format (e.g. 10*123456)
     if (trimmed.includes('*')) {
         const parts = trimmed.split('*');
         if (parts.length === 2 && !isNaN(parseInt(parts[0]))) {
             scanQty = Math.max(1, parseInt(parts[0]));
             trimmed = parts[1].trim();
         }
     }

     if (trimmed.length < 4) return; // Min length for auto-detect

     const match = inventory.find(d => 
        (d.barcode === trimmed) || 
        (d.internalCode === trimmed)
     );

     if (match) {
         addToQueue(match, scanQty);
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

  const addToQueue = (drug: Drug, initialQty: number = 1) => {
    // Play sound callback
    playBeep();
    
    // Format expiry date to MM/YY
    let formattedExpiry = '';
    if (drug.expiryDate) {
      const date = new Date(drug.expiryDate);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        formattedExpiry = `${month}/${year}`;
      } else {
        formattedExpiry = drug.expiryDate;
      }
    }
    
    setQueue(prev => {
      // Check if item already exists with same drug ID and expiry
      const existingIndex = prev.findIndex(item => 
          item.drug.id === drug.id && 
          item.expiryDateOverride === formattedExpiry
      );

      if (existingIndex >= 0) {
          // Update quantity of existing item
          const updated = [...prev];
          const existingId = updated[existingIndex].id;
          updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1
          };
          setLastAddedId(existingId);
          return updated;
      }

      // Add new item
      const newId = getVerifiedDate().getTime().toString();
      const newItem: QueueItem = {
          id: newId,
          drug,
          quantity: initialQty,
          expiryDateOverride: formattedExpiry
      };
      setLastAddedId(newId);
      return [...prev, newItem];
    });

    setSearch('');
    setShowSuggestions(false);
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  const updateExpiryAndBatch = (id: string, newBatch: Drug) => {
    let formattedExpiry = '';
    if (newBatch.expiryDate) {
      const date = new Date(newBatch.expiryDate);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        formattedExpiry = `${month}/${year}`;
      }
    }

    setQueue(prev => prev.map(item => 
        item.id === id 
            ? { ...item, drug: newBatch, expiryDateOverride: formattedExpiry } 
            : item
    ));
  };

  const handlePrint = () => {
    if (queue.length === 0) return;
    setIsPrinting(true);
    
    // Convert QueueItem to PrintLabelItem (strip internal ID if needed, though extra props are usually fine)
    const itemsToPrint: PrintLabelItem[] = queue.map(({ drug, quantity, expiryDateOverride }) => ({
        drug,
        quantity,
        expiryDateOverride
    }));

    // Try to load current design from localStorage
    let currentDesign: any = null;
    try {
        const saved = localStorage.getItem('pharma_label_design');
        if (saved) currentDesign = JSON.parse(saved);
    } catch (e) {
        console.error('Failed to load current design', e);
    }

    printLabels(itemsToPrint, { 
        design: currentDesign,
        elementVisibility: printConfig
    });
    
    // Optional: Clear queue after print? Or keep for re-print?
    // Let's keep it for now, user can clear manually if they want.
    setIsPrinting(false);
  };

  const clearQueue = () => {
      if (window.confirm(t.barcodePrinter?.alerts?.confirmClear || 'Clear print queue?')) {
          setQueue([]);
      }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className={`p-2 rounded-xl bg-${color}-100 text-${color}-600 dark:bg-${color}-900/30 dark:text-${color}-400`}>
                <span className="material-symbols-rounded">print</span>
              </span>
              {t.barcodePrinter?.title || 'Barcode Printer'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t.barcodePrinter?.subtitle || 'Queue and print product labels'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={clearQueue}
                disabled={queue.length === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {t.barcodePrinter?.clearQueue || 'Clear Queue'}
             </button>
             <button 
                onClick={handlePrint}
                disabled={queue.length === 0}
                className={`px-6 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl shadow-lg shadow-${color}-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
             >
               <span className="material-symbols-rounded">print</span>
               {t.barcodePrinter?.printLabels || 'Print Labels'}
             </button>
          </div>
        </div>

        {/* Search Bar with Total Badge */}
        <div className="flex items-center gap-3">
          <div className="relative z-20 flex-1" ref={searchRef}>
            <SearchInput
              ref={searchInputRef}
              value={search}
              onSearchChange={(val) => {
                  setSearch(val);
                  setShowSuggestions(true);
                  setSelectedSuggestionIndex(-1);
              }}
              onKeyDown={(e) => {
                  if (searchResults.length > 0) {
                      if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => (prev + 1) % searchResults.length);
                      } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
                      } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (selectedSuggestionIndex >= 0) {
                              addToQueue(searchResults[selectedSuggestionIndex]);
                          } else if (searchResults.length === 1) {
                              addToQueue(searchResults[0]);
                          }
                      }
                  }
              }}
              onClear={() => setSearch('')}
              placeholder={t.barcodePrinter?.searchPlaceholder || 'Search product to print...'}
              className="w-full"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
            />
          
            {/* Suggestions Dropdown */}
            {showSuggestions && search.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden z-[100]">
                <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  {searchResults.length > 0 ? (
                    searchResults.map((drug, index) => (
                      <button
                        key={drug.id}
                        onClick={() => addToQueue(drug)}
                        className={`w-full text-left p-3 flex items-center gap-3 transition-all rounded-lg ${
                            index === selectedSuggestionIndex 
                            ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        dir="ltr"
                      >
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 shrink-0">
                          {drug.internalCode || drug.barcode || drug.id}
                        </span>
                        <span className={`font-medium text-gray-900 dark:text-white flex-1 truncate ${textTransform === 'uppercase' ? 'uppercase' : ''}`}>
                          {drug.name} <span className="opacity-75 font-normal">{drug.dosageForm}</span>
                        </span>
                        {drug.expiryDate && (
                          <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                            {drug.expiryDate}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 font-medium">
                      {t.pos?.noResults || 'No results found'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Total Labels Badge */}
          {queue.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t.barcodePrinter?.totalLabels || 'Labels'}:</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {queue.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    const menuItems = [
                        { 
                            label: t.barcodePrinter?.settings?.store || 'Pharmacy Name', 
                            icon: printConfig.store ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, store: !p.store })) 
                        },
                        { 
                            label: t.barcodePrinter?.settings?.name || 'Drug Name', 
                            icon: printConfig.name ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, name: !p.name })) 
                        },
                        { 
                            label: t.barcodePrinter?.settings?.price || 'Price', 
                            icon: printConfig.price ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, price: !p.price })) 
                        },
                        { 
                            label: t.barcodePrinter?.settings?.expiry || 'Expiry Date', 
                            icon: printConfig.expiry ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, expiry: !p.expiry })) 
                        },
                        { 
                            label: t.barcodePrinter?.settings?.barcode || 'Barcode', 
                            icon: printConfig.barcode ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, barcode: !p.barcode })) 
                        },
                        { 
                            label: t.barcodePrinter?.settings?.hotline || 'Hotline', 
                            icon: printConfig.hotline ? 'check' : undefined, 
                            action: () => setPrintConfig(p => ({ ...p, hotline: !p.hotline })) 
                        }
                    ];
                    showMenu(e.clientX, e.clientY, menuItems);
                }}
                className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
              >
                  <span className="material-symbols-rounded text-sm">settings</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-900/40 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* Queue Items - 2 Column Grid Layout */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {queue.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {queue.map((item) => (
                <div 
                  key={item.id} 
                  className={`border transition-all group gap-3 flex items-center p-3 rounded-xl ${
                      lastAddedId === item.id 
                      ? `bg-${color}-500/10 dark:bg-${color}-400/10 border-${color}-200 dark:border-${color}-700/50` 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  dir="ltr"
                >
                  {/* Name Section */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm text-gray-900 dark:text-white leading-tight truncate ${textTransform === 'uppercase' ? 'uppercase' : ''}`}>
                      {item.drug.name} {item.drug.dosageForm}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.drug.internalCode || item.drug.barcode}
                    </p>
                  </div>

                  {/* Expiry Badge with Context Menu */}
                  <div className="flex items-center gap-1">
                      <span
                          className={`text-[10px] font-bold text-white px-3 h-7 flex items-center justify-center rounded-lg shadow-sm cursor-pointer hover:ring-2 hover:ring-white/50 transition-all ${(() => {
                              if (!item.drug.expiryDate) return 'bg-gray-400';
                              const today = new Date();
                              const expiry = new Date(item.drug.expiryDate);
                              const monthDiff = (expiry.getFullYear() - today.getFullYear()) * 12 + (expiry.getMonth() - today.getMonth());
                              if (monthDiff <= 0) return "bg-red-500";
                              if (monthDiff <= 3) return "bg-orange-500";
                              return "bg-gray-500 dark:bg-gray-600";
                          })()}`}
                          onClick={(e) => {
                              e.stopPropagation();
                              const normalize = (s: string | undefined) => (s || '').toLowerCase().trim();
                              
                              const sameNameBatches = inventory.filter(d => {
                                // 1. Strong Match: Same Barcode
                                if (d.barcode && item.drug.barcode && d.barcode === item.drug.barcode) return true;
                                
                                // 2. Fallback: Same Name & Dosage Form (normalized)
                                return normalize(d.name) === normalize(item.drug.name) && 
                                       normalize(d.dosageForm) === normalize(item.drug.dosageForm);
                              }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

                              const batchMenuItems = sameNameBatches.map((batch) => ({
                                  label: `${new Date(batch.expiryDate).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })} • ${batch.stock} ${t.menu?.pack || 'Pack'}`,
                                  icon: batch.id === item.drug.id ? 'check_circle' : undefined,
                                  disabled: batch.stock <= 0,
                                  action: () => {
                                      updateExpiryAndBatch(item.id, batch);
                                  },
                              }));
                              showMenu(e.clientX, e.clientY, batchMenuItems);
                          }}
                          title={t.clickToSelectBatch || 'Click to select batch'}
                      >
                          {item.expiryDateOverride || 'N/A'}
                      </span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-7 overflow-hidden">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                      <span className="material-symbols-rounded text-[14px]">remove</span>
                    </button>
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-8 h-full text-center bg-transparent text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="1"
                    />
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                      <span className="material-symbols-rounded text-[14px]">add</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button 
                    onClick={() => removeFromQueue(item.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-60 group-hover:opacity-100"
                  >
                    <span className="material-symbols-rounded text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12">
              <span className="material-symbols-rounded text-6xl mb-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-full">print_disabled</span>
              <p className="text-lg font-medium">{t.barcodePrinter?.alerts?.queueEmpty || 'Print queue is empty'}</p>
              <p className="text-sm mt-1">{t.barcodePrinter?.subtitle || 'Add items to start printing labels'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
