import React, { useState, useMemo, useRef } from 'react';
import { SearchInput } from '../common/SearchInput';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import { parseSearchTerm, parsePriceRange } from '../../utils/searchUtils';
import { Drug, CartItem } from '../../types';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { InlineBarcodeScanner } from './InlineBarcodeScanner';
import { MaterialTabs } from '../common/MaterialTabs';
import { MobileSearchCartDrawer } from './MobileSearchCartDrawer';
import { CartItemQuantityControl } from '../sales/pos/CartItemControls';
import { usePosSounds } from '../common/hooks/usePosSounds';
import * as stockOps from '../../utils/stockOperations';

interface MobileMedicineSearchProps {
  inventory: Drug[];
  color: string;
  onScanClick?: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onAddToCart: (drug: Drug, isUnit?: boolean, qty?: number) => void;
  onRemoveFromCart: (id: string, isUnit: boolean) => void;
  onUpdateQuantity: (id: string, isUnit: boolean, delta: number) => void;
}

export const MobileMedicineSearch: React.FC<MobileMedicineSearchProps> = ({
  inventory,
  color,
  onScanClick,
  cart,
  setCart,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
}) => {
  const { language, textTransform } = useSettings();
  const t = TRANSLATIONS[language];
  const { playSuccess } = usePosSounds();

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setExpandedDrugId(prev => prev === id ? null : id);
      // Give haptic feedback - Double sharp pulse
      if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  React.useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vpv = window.visualViewport!;
      // Determine if keyboard is likely open (standard heuristic)
      const isCurrentlyOpen = vpv.height < window.innerHeight * 0.85;
      setIsKeyboardOpen(isCurrentlyOpen);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Detect price range pattern: min/max/text
  const priceRange = useMemo(() => parsePriceRange(searchTerm.trim()), [searchTerm]);

  // The effective text to search (strips price prefix if present)
  const effectiveSearchText = useMemo(() => {
    if (priceRange) return priceRange.searchTerm;
    return searchTerm;
  }, [priceRange, searchTerm]);

  // Advanced filtering logic using searchUtils
  const filteredDrugs = useMemo(() => {
    // If we have a price range, allow empty text (just price filtering)
    // Otherwise require at least 2 chars
    if (!priceRange && searchTerm.trim().length < 2) return [];
    if (priceRange && !priceRange.searchTerm && priceRange.minPrice >= 0) {
      // Price range only, no text filter — show all in range
      return inventory
        .filter((drug) => drug.publicPrice >= priceRange.minPrice && drug.publicPrice <= priceRange.maxPrice)
        .slice(0, 100);
    }

    const textToSearch = priceRange ? priceRange.searchTerm : searchTerm;
    // Don't allow @ with price range
    const { mode, regex } = parseSearchTerm(
      priceRange ? textToSearch.replace(/^@/, '') : textToSearch
    );
    const trimmedSearch = textToSearch.trim();

    // Need at least 1 char of actual text when combined with price range
    if (priceRange && trimmedSearch.length < 1) return [];

    return inventory.filter((drug) => {
      // Price range gate: reject immediately if outside range
      if (priceRange && (drug.publicPrice < priceRange.minPrice || drug.publicPrice > priceRange.maxPrice)) {
        return false;
      }

      // 1. Exact match for barcode/code always works
      if (drug.barcode === trimmedSearch || drug.internalCode === trimmedSearch) {
        return true;
      }

      // 2. Mode-based advanced filtering (only without price range)
      if (!priceRange && mode === 'generic') {
        const isArray = Array.isArray(drug.genericName);
        return (isArray ? drug.genericName : [drug.genericName as unknown as string])
          .some((gn) => gn && regex.test(gn));
      }

      // 3. Normal search (Deep Search like POS)
      const searchableText = [
        drug.name,
        drug.barcode,
        drug.internalCode,
        drug.dosageForm,
        drug.category,
        drug.description,
        ...(Array.isArray(drug.genericName) ? drug.genericName : [drug.genericName as unknown as string])
      ].filter(Boolean).join(' ');

      return regex.test(searchableText);
    }).slice(0, 100); // Limit results for mobile performance
  }, [inventory, searchTerm, priceRange]);

  // Pre-compute highlight regex ONCE per search term (memoized performance optimization)
  // Uses word-boundary \b so it only highlights at the START of words, not mid-word
  const highlightRegex = useMemo(() => {
    // Use effective search text (strips price range prefix)
    const textForHighlight = effectiveSearchText;
    if (!textForHighlight.trim()) return null;
    const rawTerm = textForHighlight.trimStart().replace(/^[@#]/, '').trim();
    if (!rawTerm) return null;
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(words.map(w => `\\b${w}`).join('|'), 'gi');
  }, [effectiveSearchText]);

  const highlightMatch = (text: string, term: string, forceHighlight: boolean = true) => {
    if (!highlightRegex) return text;
    if (term.startsWith('@') && !forceHighlight) return text;
    if (!forceHighlight && !term.startsWith('@')) return text;

    try {
      // Clone regex to reset lastIndex for safe reuse across multiple calls
      const regex = new RegExp(highlightRegex.source, highlightRegex.flags);
      const segments: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) segments.push(text.slice(lastIndex, match.index));
        segments.push(
          <span key={match.index} className="text-primary-600 dark:text-primary-400 bg-primary-500/10 rounded-sm px-0.5">
            {match[0]}
          </span>
        );
        lastIndex = regex.lastIndex;
        if (match[0].length === 0) break;
      }

      if (lastIndex < text.length) segments.push(text.slice(lastIndex));
      if (segments.length === 0) return text;
      return <>{segments}</>;
    } catch (e) {
      return text;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col bg-(--bg-page-surface) overflow-hidden fixed inset-0"
      onContextMenu={(e) => e.preventDefault()}
      dir="ltr"
    >
      {/* Fixed Header with Search Bar */}
      <div 
        className={`
          w-full z-50 shrink-0
          ${isKeyboardOpen 
            ? 'bg-(--bg-page-surface) border-b border-(--border-search) p-4' 
            : 'p-4 bg-(--bg-page-surface) border-b border-(--border-search)'
          }
        `}
      >
        <div 
          className={`grid transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] ${isScannerOpen ? 'grid-rows-[1fr] opacity-100 mb-3' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
        >
          <div className="overflow-hidden">
            <div className="w-full max-w-2xl mx-auto px-2 pb-1">
              <InlineBarcodeScanner
                onScanSuccess={(decodedText) => {
                  setSearchTerm(decodedText);
                  setIsScannerOpen(false);
                }}
                onClose={() => setIsScannerOpen(false)}
                color={color}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center w-full mx-auto">
          <div className="flex-1 min-w-0">
            <SearchInput
              ref={searchInputRef}
              value={searchTerm}
              onSearchChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder={t.pos.searchPlaceholder}
              color={color}
              rounded="full"
              icon={
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center justify-center -ms-1 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 text-gray-400"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>
                    qr_code_scanner
                  </span>
                </button>
              }
              wrapperClassName={`
                bg-(--bg-navbar) shadow-none
              `}
              style={{ borderColor: 'var(--border-search)' }}
              className="!bg-transparent"
            />
          </div>
        </div>

        
        {/* Search Results Summary - Transitioned to prevent jumps */}
        <div className={`grid transition-all duration-300 ease-out ${searchTerm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="pt-3 px-2 shrink-0 flex items-center justify-between" dir={language === 'AR' ? 'rtl' : 'ltr'}>
              <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                {language === 'AR' ? 'نتائج البحث' : 'Search Results'} <span className="dark:text-gray-100 text-gray-500">({filteredDrugs.length})</span>
                {priceRange && (
                  <span className="normal-case tracking-normal text-primary-500 dark:text-primary-400 font-semibold">
                    ({priceRange.minPrice}–{priceRange.maxPrice})
                  </span>
                )}
              </h2>
              <span className="text-[9px] text-gray-400 font-medium opacity-80">
                {language === 'AR' ? '@ علمي · سعر/سعر/اسم' : '@ generic · price/price/name'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col w-full relative">
        {searchTerm && filteredDrugs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-start pt-6 p-6 text-center animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t.pos.noResults || (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
              {language === 'AR' ? 'جرب البحث بكلمات مختلفة أو كود آخر' : 'Try searching with different keywords or codes'}
            </p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-1 pb-24" dir="ltr">
            {filteredDrugs.map((drug, index) => (
              <MedicineSearchItem
                key={drug.id}
                drug={drug}
                index={index}
                searchTerm={searchTerm}
                totalResults={filteredDrugs.length}
                isExpanded={expandedDrugId === drug.id}
                onToggleExpand={() => setExpandedDrugId(expandedDrugId === drug.id ? null : drug.id)}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                highlightMatch={highlightMatch}
                language={language}
                textTransform={textTransform}
                cart={cart}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                inventory={inventory}
              />
            ))}
          </div>
        )}

        {!searchTerm && (
          <div className="flex-1 flex flex-col items-center justify-start pt-12 p-8 text-center animate-fade-in">
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
              {language === 'AR' ? 'ماذا تبحث عنه اليوم؟' : 'What are you looking for?'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
              {language === 'AR' 
                  ? 'ابدأ البحث بالاسم أو الباركود أو المادة الفعالة' 
                  : 'Search by name, barcode, or generic name'}
              </p>
            </div>
          )}
        <style>{`
          @keyframes stagger-fade-in {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .animate-stagger-fade-in {
            animation: stagger-fade-in 0.3s ease-out both;
            animation-delay: calc(var(--index) * 0.03s);
          }

          @keyframes scan-line {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          
          /* Smooth scroll for the entire list */
          .overflow-y-auto {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
        `}</style>
      </div>

    </div>
  );
};
// --- HELPER COMPONENTS ---

const DrugActionPill: React.FC<{
  drug: Drug;
  cart: CartItem[];
  isExpanded: boolean;
  language: string;
  onAddToCart: (drug: Drug) => void;
}> = ({ drug, cart, isExpanded, language, onAddToCart }) => {
  const currentQtyInCart = cart
    .filter(c => c.id === drug.id)
    .reduce((sum, c) => sum + (c.isUnit ? stockOps.convertToPacks(c.quantity, drug.unitsPerPack) : c.quantity), 0);
  const isOutOfStock = currentQtyInCart >= drug.stock;
  
  const parts = formatCurrencyParts(drug.publicPrice);
  const isArabic = language === 'AR';

  return (
    <div className="shrink-0 relative">
      <div className={`absolute -top-2.5 right-1 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-lg border-2 border-white dark:border-(--bg-secondary) animate-in zoom-in duration-300 ${
        currentQtyInCart > 0 
          ? 'bg-amber-500 text-white' 
          : (drug.stock > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
      }`}>
        {currentQtyInCart > 0 
          ? currentQtyInCart.toLocaleString('en-US', { maximumFractionDigits: 1 })
          : (drug.stock <= 0 ? '0' : (stockOps.convertToPacks(drug.stock, drug.unitsPerPack)).toLocaleString('en-US', { maximumFractionDigits: 1 }))
        }
      </div>

      <div className={`flex items-center h-8 rounded-full border bg-transparent transition-all duration-300 ${isExpanded ? 'border-primary-500/50 ring-1 ring-primary-500/10' : 'border-gray-200 dark:border-white/20'}`}>
        <div className="ps-2.5 pe-1.5 py-0.5 flex items-center">
          <span className="font-black text-[13px] text-primary-600 dark:text-primary-400 tabular-nums">
            <span className="flex items-baseline gap-0.5">
              {isArabic && <span className="text-[8px] font-black opacity-60">{parts.symbol}</span>}
              <span>{parts.amount}</span>
              {!isArabic && <span className="text-[8px] font-black opacity-60">{parts.symbol}</span>}
            </span>
          </span>
        </div>
        <div className="w-px h-1/2 bg-gray-200 dark:bg-white/20" />
        <button
          onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(drug); }}
          disabled={isOutOfStock}
          className={`h-full px-2.5 flex items-center justify-center active:scale-90 transition-all rounded-e-full ${isOutOfStock ? 'text-gray-300 dark:text-gray-600 opacity-50' : 'text-primary-600 dark:text-primary-400 hover:bg-primary-500/10'}`}
        >
          <span className="material-symbols-rounded font-fill text-[18px]">
            {isOutOfStock ? 'block' : (isExpanded ? 'shopping_cart_checkout' : 'add')}
          </span>
        </button>
      </div>
    </div>
  );
};

const MedicineSearchItem: React.FC<{
  drug: Drug;
  index: number;
  searchTerm: string;
  totalResults: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPointerDown: (id: string) => void;
  onPointerUp: () => void;
  highlightMatch: (text: string, term: string, force?: boolean) => React.ReactNode;
  language: string;
  textTransform: any;
  cart: CartItem[];
  onAddToCart: (drug: Drug) => void;
  onUpdateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  inventory: Drug[];
}> = ({ drug, index, searchTerm, totalResults, isExpanded, onToggleExpand, onPointerDown, onPointerUp, highlightMatch, language, textTransform, cart, onAddToCart, onUpdateQuantity, inventory }) => {
  const displayName = getDisplayName(drug, textTransform);
  const genericNameStr = Array.isArray(drug.genericName) ? drug.genericName.join(' + ') : String(drug.genericName || '');
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS];
  
  return (
    <div className={index < 20 ? "animate-stagger-fade-in" : ""} style={{ '--index': index } as any}>
      <MaterialTabs
        index={index}
        total={totalResults}
        isSelected={isExpanded}
        onPointerDown={() => onPointerDown(drug.id)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className={`!px-0 !h-auto !min-h-[72px] border border-gray-100/30 dark:border-gray-800/20 transition-all bg-white dark:!bg-(--bg-secondary) ${isExpanded ? 'pt-1 border-(--border-divider) z-10 shadow-sm' : ''}`}
      >
        <div className="flex flex-col w-full px-4 text-left">
          <div className="h-[60px] flex items-center justify-between w-full gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-gray-900 dark:text-gray-100 leading-tight ${isExpanded ? 'text-base' : 'line-clamp-2'}`}>
                {highlightMatch(displayName, searchTerm, !searchTerm.startsWith('@'))}
              </h3>
              <p className={`text-gray-400 dark:text-gray-600 text-xs mt-0.5 ${isExpanded ? '' : 'truncate'}`}>
                {highlightMatch(genericNameStr, searchTerm, searchTerm.startsWith('@') || !new RegExp(parseSearchTerm(searchTerm).regex.source, 'i').test(displayName))}
              </p>
            </div>
            <DrugActionPill drug={drug} cart={cart} isExpanded={isExpanded} language={language} onAddToCart={onAddToCart} />
          </div>

          <div className={`grid transition-all duration-300 ${isExpanded ? 'grid-rows-[1fr] pb-3' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
            <div className="overflow-hidden">
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/50 mt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{language === 'AR' ? 'تحكم في الكمية' : 'Quantity'}</span>
                  <span className="text-[9px] text-gray-500 opacity-60">{language === 'AR' ? 'أضف للعربة' : 'Add to cart'}</span>
                </div>
                <CartItemQuantityControl
                  item={cart.find(c => c.id === drug.id) || { ...drug, quantity: 0, isUnit: false } as CartItem}
                  packItem={cart.find(c => c.id === drug.id && !c.isUnit)}
                  unitItem={cart.find(c => c.id === drug.id && c.isUnit)}
                  hasDualMode={!!drug.unitsPerPack && drug.unitsPerPack > 1}
                  updateQuantity={onUpdateQuantity}
                  addToCart={onAddToCart}
                  allBatches={inventory.filter(b => b.name === drug.name && b.dosageForm === drug.dosageForm)}
                  isMobile={true}
                  t={t}
                  currentLang={language}
                />
              </div>
              {drug.description && <p className="pt-2 mt-2 text-[10px] text-gray-400 italic leading-relaxed">{drug.description}</p>}
            </div>
          </div>
        </div>
      </MaterialTabs>
    </div>
  );
};
