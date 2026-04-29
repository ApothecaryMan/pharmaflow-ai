import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Drug, StockBatch } from '../../types';
import { StorageKeys } from '../../config/storageKeys';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { formatExpiryDate, checkExpiryStatus, getExpiryStatusConfig, parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { useContextMenu } from '../common/ContextMenu';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { SearchDropdown, useSearchKeyboardNavigation } from '../common/SearchDropdown';
import { SearchInput } from '../common/SearchInput';
import { useSmartDirection } from '../common/SmartInputs';
import { useStatusBar } from '../layout/StatusBar';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { 
  type PrintLabelItem, 
  printLabels,
  DEFAULT_LABEL_DESIGN,
  generateLabelHTML,
  generatePageHTML,
  generateTemplateCSS,
  getReceiptSettings,
  LABEL_PRESETS
} from './LabelPrinter';
import { Switch } from '../common/Switch';
import { CARD_BASE } from '../../utils/themeStyles';
import type { LabelDesign, LabelElement } from './studio/types';

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

export const BarcodePrinter: React.FC<BarcodePrinterProps> = ({
  inventory,
  color,
  t,
  language,
  textTransform,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();
  const { playBeep, playError } = usePosSounds();
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const [printConfig, setPrintConfig] = useState({
    store: true,
    name: true,
    publicPrice: true,
    expiry: true,
    barcode: true,
    hotline: false,
  });

  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(inventory[0] || null);
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Auto-select first drug if none selected and inventory becomes available
  useEffect(() => {
    if (!selectedDrug && inventory.length > 0) {
      setSelectedDrug(inventory[0]);
    }
  }, [inventory, selectedDrug]);

  // Smart direction for search
  const dir = useSmartDirection(
    search,
    t.barcodePrinter?.searchPlaceholder || 'Search product to print...'
  );

  // Search logic
  const searchResults = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return [];

    const { mode, regex } = parseSearchTerm(search);

    return inventory
      .filter((d) => {
        // Exact code match (no regex needed)
        if (d.barcode === trimmed || d.internalCode === trimmed) return true;

        if (mode === 'ingredient' || mode === 'generic') {
          return Array.isArray(d.genericName) 
            ? d.genericName.some((gn) => regex.test(gn))
            : (d.genericName as any) && regex.test(d.genericName as any);
        }

        const searchableText = [
          d.name,
          ...(Array.isArray(d.genericName) ? d.genericName : [d.genericName]),
          d.dosageForm,
          d.category,
          d.description,
        ]
          .filter(Boolean)
          .join(' ');

        return regex.test(searchableText);
      })
      .slice(0, 10);
  }, [search, inventory]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Keydown (Simple Alphanumeric for Search Focus + Shortcuts)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Shortcuts (Highest Priority)
      // Alt+P or Ctrl+P: Print
      if (
        (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح'))
      ) {
        e.preventDefault();
        if (printButtonRef.current?.disabled) {
          playError();
        } else {
          printButtonRef.current?.click();
        }
        return;
      }

      // 2. Ignore other alphanumeric logic if already in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        // Handle Escape to blur
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setShowSuggestions(false);
        }
        return;
      }

      // 3. Capture Alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearch((prev) => prev + e.key);
        setShowSuggestions(true);
        return;
      }

      // Alt+C: Clear
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ؤ')) {
        e.preventDefault();
        if (queue.length > 0) clearQueue();
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
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

    const match = inventory.find((d) => d.barcode === trimmed || d.internalCode === trimmed);

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
      const formattedExpiry = drug.expiryDate ? formatExpiryDate(drug.expiryDate) : '';

    setQueue((prev) => {
      // Check if item already exists with same drug ID and expiry
      const existingIndex = prev.findIndex(
        (item) => item.drug.id === drug.id && item.expiryDateOverride === formattedExpiry
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prev];
        const existingId = updated[existingIndex].id;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        setLastAddedId(existingId);
        return updated;
      }

      // Add new item
      const newId = idGenerator.generateSync('barcodes');
      const newItem: QueueItem = {
        id: newId,
        drug,
        quantity: initialQty,
        expiryDateOverride: formattedExpiry,
      };
      setLastAddedId(newId);
      setSelectedDrug(drug);
      return [...prev, newItem];
    });

    setSearch('');
    setShowSuggestions(false);
  };

  const {
    highlightedIndex: selectedSuggestionIndex,
    onKeyDown,
    setHighlightedIndex: setSelectedSuggestionIndex,
  } = useSearchKeyboardNavigation<Drug>({
    results: searchResults,
    onSelect: (drug) => {
      addToQueue(drug);
      setSearch('');
    },
    isOpen: showSuggestions && !!search.trim(),
    onClose: () => setShowSuggestions(false),
  });

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const updateExpiryAndBatch = (id: string, newBatch: Drug) => {
    const formattedExpiry = newBatch.expiryDate ? formatExpiryDate(newBatch.expiryDate) : '';

    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, drug: newBatch, expiryDateOverride: formattedExpiry } : item
      )
    );
  };

  const handlePrint = () => {
    if (queue.length === 0) return;
    setIsPrinting(true);

    // Convert QueueItem to PrintLabelItem (strip internal ID if needed, though extra props are usually fine)
    const itemsToPrint: PrintLabelItem[] = queue.map(({ drug, quantity, expiryDateOverride }) => ({
      drug,
      quantity,
      expiryDateOverride,
    }));

    // Load current design from storage (matches BarcodeStudio's autosave key)
    const currentDesign = storage.get<any>(StorageKeys.LABEL_DESIGN, null);

    printLabels(itemsToPrint, {
      design: currentDesign,
      elementVisibility: printConfig,
    });

    // Optional: Clear queue after print? Or keep for re-print?
    // Let's keep it for now, user can clear manually if they want.
    setIsPrinting(false);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  // Generate preview content
  const previewHtml = useMemo(() => {
    if (!selectedDrug) return '';

    try {
      // Load current design from storage (matches BarcodeStudio's autosave key)
      const storedDesign = storage.get<any>(StorageKeys.LABEL_DESIGN, null);
      
      // Deep clone to prevent mutation when applying overrides
      const design: LabelDesign = JSON.parse(
        JSON.stringify(storedDesign || DEFAULT_LABEL_DESIGN)
      );

      // Apply dynamic visibility overrides from printConfig state
      if (printConfig) {
        design.elements.forEach((el: LabelElement) => {
          // Special case: map 'price' element ID to 'publicPrice' config key
          const configKey = el.id === 'price' ? 'publicPrice' : el.id;
          if (printConfig[configKey as keyof typeof printConfig] !== undefined) {
            el.isVisible = printConfig[configKey as keyof typeof printConfig] as boolean;
          }
        });
      }

      const dims = design.selectedPreset === 'custom'
        ? design.customDims || { w: 38, h: 25 }
        : LABEL_PRESETS[design.selectedPreset] || { w: 38, h: 25 };

      const isDouble = design.selectedPreset === '38x25';
      const labelHeight = isDouble ? 12 : dims.h;
      const renderDims = { w: dims.w, h: labelHeight };

      const { css: templateCSS, classNameMap } = generateTemplateCSS(design);
      const receiptSettings = getReceiptSettings();

      const labelHTML = generateLabelHTML(
        selectedDrug,
        design,
        renderDims,
        receiptSettings,
        undefined, // expiryOverride
        undefined, // qrDataUrl
        undefined, // logoDataUrl
        classNameMap
      );

      return generatePageHTML(labelHTML, templateCSS, renderDims, labelHeight);
    } catch (e) {
      console.error('Failed to generate preview:', e);
      return '';
    }
  }, [selectedDrug, printConfig]);

  // Calculate box dimensions (1mm = 3.78px)
  const previewDims = useMemo(() => {
    const storedDesign = storage.get<any>(StorageKeys.LABEL_DESIGN, null);
    const design = storedDesign || DEFAULT_LABEL_DESIGN;
    const dims = design.selectedPreset === 'custom'
      ? design.customDims || { w: 38, h: 25 }
      : LABEL_PRESETS[design.selectedPreset] || { w: 38, h: 25 };
    
    const isDouble = design.selectedPreset === '38x25';
    const h = isDouble ? 12 : dims.h;

    return {
      w: dims.w * 3.78,
      h: h * 3.78,
      labelW: dims.w,
      labelH: h
    };
  }, []);

  // Update scale when container size or label dimensions change
  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        const labelWidthPx = previewDims.labelW * 3.78;
        if (labelWidthPx > 0) {
          setPreviewScale(containerWidth / labelWidthPx);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [previewDims]);

  return (
    <div className='h-full flex flex-col gap-6 overflow-hidden animate-fade-in'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-text-primary page-title'>
            {t.barcodePrinter?.title || 'Barcode Printer'}
          </h1>
          <p className='text-sm text-text-secondary mt-1'>
            {t.barcodePrinter?.subtitle || 'Queue and print product labels'}
          </p>
        </div>

        <div className='flex items-center gap-2'>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className='px-4 py-2 text-sm font-medium text-text-secondary hover:text-red-500 transition-colors'
            >
              {t.barcodePrinter?.clearQueue || 'Clear Queue'}
            </button>
          )}
          <button
            ref={printButtonRef}
            onClick={handlePrint}
            disabled={queue.length === 0}
            className='w-12 h-12 flex items-center justify-center bg-primary-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale font-semibold'
            title={t.barcodePrinter?.printLabels || 'Print Labels'}
          >
            <span className='material-symbols-rounded text-2xl'>print</span>
          </button>
        </div>
      </div>

      <div className='flex-1 flex flex-col lg:flex-row gap-6 min-h-0'>
        {/* Main Section: Search & Queue (2/3 width on large screens) */}
        <div className='flex-[1.5] flex flex-col gap-4 min-h-0'>
          {/* Search Container - Flat with border */}
          <div className='relative z-20' ref={searchRef}>
            <SearchInput
              ref={searchInputRef}
              value={search}
              onSearchChange={(val) => {
                setSearch(val);
                setShowSuggestions(true);
              }}
              onKeyDown={onKeyDown}
              onClear={() => setSearch('')}
              placeholder={t.barcodePrinter?.searchPlaceholder || 'Search product to print...'}
              color={color}
              autoComplete='off'
              onFocus={() => setShowSuggestions(true)}
              wrapperClassName={`${CARD_BASE} rounded-xl shadow-none border-border/80`}
              className="bg-transparent"
            />

            <SearchDropdown
              results={searchResults}
              onSelect={(drug) => {
                addToQueue(drug);
                setSelectedDrug(drug);
                setSearch('');
              }}
              columns={[
                {
                  header: t.inventory?.headers?.codes || 'Codes',
                  width: 'w-32 shrink-0',
                  className: 'text-text-secondary text-xs font-mono',
                  render: (drug: Drug) => drug.internalCode || drug.barcode || drug.id,
                },
                {
                  header: t.stockAdjustment?.table?.product || 'Name',
                  width: 'flex-1',
                  className: 'text-text-primary font-bold',
                  render: (drug: Drug) => (
                    <span className={`${textTransform === 'uppercase' ? 'uppercase' : ''}`}>
                      {drug.name}{' '}
                      <span className='opacity-60 font-normal text-xs'>{drug.dosageForm}</span>
                    </span>
                  ),
                },
                {
                  header: t.inventory?.headers?.expiry || 'Expiry',
                  width: 'w-24 shrink-0',
                  className: 'text-center justify-center text-text-secondary text-xs',
                  render: (drug: Drug) => {
                    if (!drug.expiryDate) return null;
                    const date = new Date(drug.expiryDate);
                    if (isNaN(date.getTime())) return drug.expiryDate;
                    return (
                      <span className='whitespace-nowrap'>
                        {`${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`}
                      </span>
                    );
                  },
                },
              ]}
              isVisible={showSuggestions && !!search.trim()}
              highlightedIndex={selectedSuggestionIndex}
              emptyMessage={t.pos?.noResults}
            />
          </div>

          {/* Queue Container - Standardized with CARD_BASE */}
          <div className={`flex-1 min-h-0 ${CARD_BASE} rounded-2xl flex flex-col overflow-hidden`}>
            <div className='p-4 bg-bg-secondary/80 flex justify-between items-center'>
              <h3 className='font-bold text-sm text-text-primary flex items-center gap-2'>
                <span className='material-symbols-rounded text-lg'>list_alt</span>
                {t.barcodePrinter?.queue || 'Print Queue'}
              </h3>
            </div>

            <div className='flex-1 overflow-y-auto p-2 lg:p-3 custom-scrollbar lg:bg-bg-secondary/10'>
              {queue.length > 0 ? (
                <div className='flex flex-col gap-2'>
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-2.5 p-2 px-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                        selectedDrug?.id === item.drug.id || lastAddedId === item.id
                          ? 'bg-primary-500/10 border-primary-500/40'
                          : 'bg-bg-card border-border/40 hover:border-border/80'
                      }`}
                      dir='ltr'
                      onClick={() => setSelectedDrug(item.drug)}
                    >
                      {/* Drag Handle or Indicator */}
                      <div className='w-1 h-6 rounded-full bg-border/40 transition-colors group-hover:bg-primary-500/50' />

                      {/* Info Section */}
                      <div className='flex-1 min-w-0'>
                        <h4
                          className={`font-bold text-sm text-text-primary leading-tight truncate ${textTransform === 'uppercase' ? 'uppercase' : ''}`}
                        >
                          {item.drug.name} <span className='text-xs font-normal opacity-60 ml-1'>{item.drug.dosageForm}</span>
                        </h4>
                        <p className='text-[11px] font-mono text-text-tertiary tracking-wider mt-0.5 uppercase'>
                          {item.drug.internalCode || item.drug.barcode}
                        </p>
                      </div>

                      {/* Expiry Badge - Matched to Quantity Control height & style */}
                      <div className='shrink-0'>
                        <button
                          className={(() => {
                            const status = checkExpiryStatus(item.drug.expiryDate || '');
                            const config = getExpiryStatusConfig(status);
                            return `flex items-center justify-center min-w-[60px] h-7 px-2 rounded-lg text-[10px] font-black border transition-all active:scale-95 border-border/60 bg-bg-card text-${config.color}-600 dark:text-${config.color}-400 hover:border-border/80`;
                          })()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const normalize = (s: string | undefined) => (s || '').toLowerCase().trim();

                            const batchMenuItems = inventory
                              .filter((d) => {
                                if (d.barcode && item.drug.barcode && d.barcode === item.drug.barcode) return true;
                                return (
                                  normalize(d.name) === normalize(item.drug.name) &&
                                  normalize(d.dosageForm) === normalize(item.drug.dosageForm)
                                );
                              })
                              .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime())
                              .map((d) => ({
                                label: `${formatExpiryDate(d.expiryDate)} • ${d.stock} ${t.menu?.pack || 'Pack'}`,
                                icon: d.id === item.drug.id ? 'check_circle' : undefined,
                                disabled: d.stock <= 0,
                                action: () => updateExpiryAndBatch(item.id, d),
                              }));
                            showMenu(e.clientX, e.clientY, batchMenuItems);
                          }}
                        >
                          {item.expiryDateOverride || 'N/A'}
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className='flex items-center bg-bg-card rounded-xl border border-border/60 h-8 p-0.5'>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className='w-8 h-full flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors'
                        >
                          <span className='material-symbols-rounded text-base'>remove</span>
                        </button>
                        <input
                          type='number'
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className='w-10 h-full text-center bg-transparent text-sm font-bold text-text-primary focus:outline-hidden'
                          min='1'
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className='w-8 h-full flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors'
                        >
                          <span className='material-symbols-rounded text-base'>add</span>
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className='w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-red-500 hover:bg-bg-secondary transition-all opacity-60 group-hover:opacity-100'
                      >
                        <span className='material-symbols-rounded text-lg'>delete_outline</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='h-full flex flex-col items-center justify-center text-text-tertiary py-12'>
                  <div className='relative mb-6'>
                    <span className='material-symbols-rounded text-7xl relative opacity-20'>
                      barcode_scanner
                    </span>
                  </div>
                  <h4 className='text-lg font-bold text-text-secondary'>
                    {t.barcodePrinter?.alerts?.queueEmpty || 'Ready to Scan or Search'}
                  </h4>
                  <p className='text-sm mt-2 text-center max-w-xs opacity-70'>
                    {t.barcodePrinter?.subtitle || 'Add items from products to build your print queue.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Settings & Summary - Standardized with CARD_BASE */}
        <div className='lg:w-80 flex flex-col gap-6'>
          {/* Label Preview Card */}
          <div className={`${CARD_BASE} rounded-2xl overflow-hidden flex flex-col items-center justify-center bg-bg-secondary/20 relative`}>
            <div 
              ref={previewContainerRef}
              className="w-full flex items-center justify-center overflow-hidden transition-[height] duration-300"
              style={{
                height: `${previewDims.labelH * 3.78 * previewScale}px`,
                minHeight: '80px' // Minimum height for the placeholder
              }}
            >
              {queue.length > 0 && selectedDrug ? (
                <div 
                  className="bg-white overflow-hidden origin-center shrink-0"
                  style={{ 
                    width: `${previewDims.labelW}mm`, 
                    height: `${previewDims.labelH}mm`,
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    scrolling="no"
                    className="w-full h-full border-none pointer-events-none"
                    title="Label Preview"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-text-tertiary">
                  <span className="text-sm font-bold uppercase tracking-widest opacity-40">
                    {t.barcodePrinter?.preview || 'Label Preview'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className={`${CARD_BASE} rounded-2xl overflow-hidden flex flex-col`}>
            <div className='bg-bg-secondary/80 p-4 flex items-center gap-3 text-text-primary'>
              <span className='material-symbols-rounded text-lg'>info</span>
              <span className='text-xs font-bold uppercase tracking-wider'>
                {t.barcodePrinter?.summary || 'Print Summary'}
              </span>
            </div>
            
            <div className='flex flex-col gap-2 p-5'>
              <div className='flex justify-between items-center py-2'>
                <span className='text-sm text-text-secondary'>{t.barcodePrinter?.totalItems || 'Total Items'}</span>
                <span className='font-bold text-text-primary'>{queue.length}</span>
              </div>
              <div className='flex justify-between items-center py-2'>
                <span className='text-sm text-text-secondary'>{t.barcodePrinter?.totalLabels || 'Total Labels'}</span>
                <span className='font-bold text-text-primary tabular-nums'>
                  {queue.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className={`${CARD_BASE} rounded-2xl overflow-hidden`}>
            <div className='bg-bg-secondary/80 p-4 flex items-center gap-3 text-text-primary'>
              <span className='material-symbols-rounded text-lg'>settings</span>
              <span className='text-xs font-bold uppercase tracking-wider'>
                {t.barcodePrinter?.settings?.title || 'Label Visibility'}
              </span>
            </div>

            <div className='flex flex-col p-2'>
              {/* Settings Rows as Clean List Items (Flat Design, No Internal Boxes) */}
              {[
                { key: 'store', label: t.barcodePrinter?.settings?.store || 'Pharmacy Name', icon: 'storefront' },
                { key: 'name', label: t.barcodePrinter?.settings?.name || 'Drug Name', icon: 'label' },
                { key: 'publicPrice', label: t.barcodePrinter?.settings?.publicPrice || 'Price', icon: 'payments' },
                { key: 'expiry', label: t.barcodePrinter?.settings?.expiry || 'Expiry Date', icon: 'event' },
                { key: 'barcode', label: t.barcodePrinter?.settings?.barcode || 'Barcode', icon: 'barcode' },
                { key: 'hotline', label: t.barcodePrinter?.settings?.hotline || 'Hotline', icon: 'phone' },
              ].map((setting) => (
                <div
                  key={setting.key}
                  onClick={() => setPrintConfig(p => ({ ...p, [setting.key]: !p[setting.key as keyof typeof p] }))}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 select-none group/row ${
                    printConfig[setting.key as keyof typeof printConfig]
                      ? 'text-text-primary'
                      : 'text-text-tertiary opacity-60 hover:opacity-100'
                  } hover:bg-bg-card/50`}
                >
                  <div className='flex items-center gap-3 pointer-events-none'>
                    <span className={`material-symbols-rounded text-lg transition-colors ${
                      printConfig[setting.key as keyof typeof printConfig] ? 'text-primary-600 dark:text-white' : 'opacity-40'
                    }`}>{setting.icon}</span>
                    <span className='text-sm font-medium'>{setting.label}</span>
                  </div>
                  {/* Wrap Switch in a div that prevents double-toggling if the parent also has an onClick */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={printConfig[setting.key as keyof typeof printConfig]}
                      onChange={() => setPrintConfig(p => ({ ...p, [setting.key]: !p[setting.key as keyof typeof p] }))}
                      theme="primary"
                      activeColor="var(--primary-600)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
