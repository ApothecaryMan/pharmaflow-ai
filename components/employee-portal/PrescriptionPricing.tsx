import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import type { Drug } from '../../types';
import { encodeCode128 } from '../../utils/barcodeEncoders';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { useAutoSystemBarColor } from '../../utils/systemBars';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { getBarcodeFontsCSS } from '../inventory/barcodeFonts';
import { InlineBarcodeScanner } from '../mobile/InlineBarcodeScanner';
import { type PrescriptionItem, usePrescriptionPricing } from './hooks/usePrescriptionPricing';

const PrescriptionPricing: React.FC = () => {
  const { language, textTransform, theme, darkMode } = useSettings();
  const t = TRANSLATIONS[language];
  const { playSuccess } = usePosSounds();

  useAutoSystemBarColor(`prescription-pricing:${theme.hex}:${darkMode}`, '--bg-page-surface');

  const { inventory, isLoading, prescriptionItems, addItem, updateQuantity, removeItem, clearAll, grandTotal } =
    usePrescriptionPricing();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannedDrugs, setScannedDrugs] = useState<Drug[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Measure cart height dynamically for mobile spacer
  useEffect(() => {
    if (!cartRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        document.documentElement.style.setProperty(
          '--mobile-cart-height',
          `${entry.contentRect.height}px`
        );
      }
    });
    observer.observe(cartRef.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--mobile-cart-height');
    };
  }, [prescriptionItems.length > 0]);

  useEffect(() => {
    // Clean up if needed
  }, []);

  const handleScannerClick = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        language === 'AR'
          ? 'الكاميرا غير متوفرة في هذا السياق. حاول استخدام HTTPS.'
          : 'Camera not available in this context. Try using HTTPS.'
      );
      return;
    }
    setIsScannerOpen(true);
  }, [language]);

  const handleResultsChange = useCallback((results: any[]) => {
    setSearchResults(results);
  }, []);

  const combinedSearchResults = useMemo(() => {
    const combined = [...scannedDrugs];
    for (const res of searchResults) {
      if (!combined.some((d) => d.id === res.id)) {
        combined.push(res);
      }
    }
    return combined;
  }, [scannedDrugs, searchResults]);

  const handleAddItem = useCallback(
    (catalogItem: any) => {
      const fullDrug = inventory.find((d) => d.id === catalogItem.id);
      addItem(fullDrug || (catalogItem as Drug));
    },
    [inventory, addItem]
  );

  const highlightRegex = useMemo(() => {
    const rawTerm = searchTerm.trimStart().replace(/^[@#]/, '').trim();
    if (!rawTerm) return null;
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(words.map((w) => `\\b${w}`).join('|'), 'gi');
  }, [searchTerm]);

  const isGenericSearch = useMemo(() => searchTerm.trimStart().startsWith('@'), [searchTerm]);

  const highlightMatch = (text: string, type: 'brand' | 'generic') => {
    if (isGenericSearch && type !== 'generic') return text;
    if (!isGenericSearch && type !== 'brand') return text;
    if (!highlightRegex || !text) return text;
    try {
      const regex = new RegExp(highlightRegex.source, highlightRegex.flags);
      const segments: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) segments.push(text.slice(lastIndex, match.index));
        segments.push(
          <span
            key={match.index}
            className='text-primary-600 dark:text-primary-400'
          >
            {match[0]}
          </span>
        );
        lastIndex = regex.lastIndex;
        if (match[0].length === 0) break;
      }
      if (lastIndex < text.length) segments.push(text.slice(lastIndex));
      if (segments.length === 0) return text;
      return <>{segments}</>;
    } catch {
      return text;
    }
  };


  return (
    <div className='w-full' dir='ltr'>
      {/* Search Header */}
      <div className='w-full sticky top-4 lg:top-6 z-10 pb-1'>
        <div
          className={`grid transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] ${isScannerOpen ? 'grid-rows-[1fr] opacity-100 mb-3' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
        >
          <div className='overflow-hidden'>
            <div className='w-full max-w-2xl mx-auto px-2 pb-1'>
              <InlineBarcodeScanner
                onScanSuccess={(decodedText) => {
                  const foundDrug = inventory.find(
                    (d) =>
                      d.id === decodedText ||
                      d.barcode === decodedText ||
                      d.barcodes?.includes(decodedText)
                  );
                  if (foundDrug) {
                    playSuccess();
                    setScannedDrugs((prev) => {
                      if (prev.some((d) => d.id === foundDrug.id)) return prev;
                      return [foundDrug, ...prev];
                    });
                  } else {
                    playSuccess();
                    setSearchTerm(decodedText);
                  }
                  // Scanner remains open for continuous scanning
                }}
                onClose={() => setIsScannerOpen(false)}
                isActive={isScannerOpen}
              />
            </div>
          </div>
        </div>

        <SearchEngineInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          onClear={() => {
            setSearchTerm('');
            setScannedDrugs([]);
          }}
          onResultsChange={handleResultsChange}
          showScannerIcon={true}
          onScannerClick={handleScannerClick}
          placeholder={t.pos.searchPlaceholder}
          wrapperClassName='max-w-3xl mx-auto'
          className='h-12 text-base'
        />
      </div>

      {/* Main Content */}
      <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 mt-4 max-w-6xl mx-auto'>
          {/* Prescription Cart - mobile dock (bottom), desktop sidebar (right) */}
          {prescriptionItems.length > 0 && (
            <div 
              ref={cartRef}
              className='order-1 lg:order-2 lg:w-[360px] lg:shrink-0 lg:sticky lg:top-16 lg:z-10 max-lg:fixed max-lg:bottom-[68px] max-lg:left-0 max-lg:right-0 max-lg:z-40 max-lg:px-4 max-lg:flex max-lg:justify-center max-lg:pointer-events-none'
            >
              <div className='w-full max-lg:w-[90%] max-w-[360px] max-lg:pointer-events-auto'>
                <PrescriptionSummary
                  items={prescriptionItems}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  onClearAll={clearAll}
                  grandTotal={grandTotal}
                  language={language}
                  expanded={isCartOpen}
                  onToggle={() => setIsCartOpen((v) => !v)}
                />
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className='flex-1 min-w-0 order-2 lg:order-1'>
            {searchTerm && combinedSearchResults.length === 0 ? (
              <div className='flex flex-col items-center justify-start pt-6 p-6 text-center animate-fade-in'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 mb-2'>
                  {t.pos.noResults || (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 max-w-[200px]'>
                  {language === 'AR'
                    ? 'جرب البحث بكلمات مختلفة أو كود آخر'
                    : 'Try searching with different keywords or codes'}
                </p>
              </div>
            ) : (
              <div className='flex flex-col gap-[2px]'>
                {combinedSearchResults.slice(0, 100).map((drug, index) => (
                  <SearchResultItem
                    key={drug.id}
                    drug={drug}
                    index={index}
                    totalResults={combinedSearchResults.length}
                    highlightMatch={highlightMatch}
                    language={language}
                    textTransform={textTransform}
                    onAdd={handleAddItem}
                    onLongPress={setViewingDrug}
                  />
                ))}
              </div>
            )}

            {!searchTerm && scannedDrugs.length === 0 && (
              <div className='flex flex-col items-center justify-start pt-12 p-8 text-center animate-fade-in'>
                <h3 className='text-xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight'>
                  {language === 'AR' ? 'ماذا تبحث عنه اليوم؟' : 'What are you looking for?'}
                </h3>
                <p className='text-gray-500 dark:text-gray-400 leading-relaxed text-sm'>
                  {language === 'AR'
                    ? 'ابدأ البحث بالاسم أو الباركود أو المادة الفعالة'
                    : 'Search by name, barcode, or generic name'}
                </p>
              </div>
            )}

            {/* Dynamic spacer prevents cart from overlapping the last items on mobile. 
                Parent container already has pb-28 (112px), so we subtract it from the required space (cartHeight + 68px bottom offset + 16px gap = cartHeight + 84px).
                Required spacer = (cartHeight + 84px) - 112px = cartHeight - 28px. */}
            {prescriptionItems.length > 0 && (
              <div
                className='lg:hidden w-full transition-[height] duration-400 ease-[cubic-bezier(0.2,0,0,1)]'
                style={{ height: 'calc(var(--mobile-cart-height, 0px) - 28px)' }}
              />
            )}
          </div>
        </div>

      {viewingDrug && (
        <Modal
          isOpen={!!viewingDrug}
          onClose={() => setViewingDrug(null)}
          title={language === 'AR' ? 'تفاصيل الدواء' : 'Drug Details'}
          icon='info'
          size='md'
          bodyClassName='p-0'
        >
          <div className='flex flex-col'>
            <div className='px-6 pb-4 pt-6 space-y-6'>
              <div dir='ltr' className='text-left px-1'>
                <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                  {getDisplayName(viewingDrug, textTransform)}
                </h3>
                <p className='text-gray-500 dark:text-gray-400 mt-1'>
                  {Array.isArray(viewingDrug.genericName)
                    ? viewingDrug.genericName.join(' + ')
                    : viewingDrug.genericName}
                </p>
              </div>
              
              <div className='flex flex-col gap-[2px] mt-2'>
                <MaterialTabs index={0} total={3} interactive={false} className='justify-between !py-3.5 !min-h-[52px]' variant='compact'>
                  <span className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                    {language === 'AR' ? 'السعر' : 'Price'}
                  </span>
                  <span className='text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums'>
                    {formatCurrency(viewingDrug.publicPrice)}
                  </span>
                </MaterialTabs>

                <MaterialTabs index={1} total={3} interactive={false} className='justify-between !py-3.5 !min-h-[52px]' variant='compact'>
                  <span className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                    {language === 'AR' ? 'الباركود' : 'Barcode'}
                  </span>
                  <span className='text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums'>
                    {viewingDrug.barcode || '-'}
                  </span>
                </MaterialTabs>

                <MaterialTabs index={2} total={3} interactive={false} className='justify-between !py-3.5 !min-h-[52px]' variant='compact'>
                  <span className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                    {language === 'AR' ? 'الوحدات' : 'Units'}
                  </span>
                  <span className='text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums'>
                    {viewingDrug.unitsPerPack || 1}
                  </span>
                </MaterialTabs>
              </div>
            </div>

            {viewingDrug.barcode && viewingDrug.barcode !== '-' && (
              <div className='flex flex-col items-center justify-center pt-8 pb-3 bg-white dark:bg-white/90 border-t border-gray-100 dark:border-white/10 mt-2 overflow-hidden w-full rounded-b-2xl'>
                <style dangerouslySetInnerHTML={{ __html: getBarcodeFontsCSS() }} />
                <div 
                  style={{ fontFamily: "'Libre Barcode 128', monospace", fontSize: '4.5rem', lineHeight: 0.8 }} 
                  className='text-black select-all'
                >
                  {encodeCode128(viewingDrug.barcode)}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Search Result Item ───────────────────────────────────────────────────────

const SearchResultItem: React.FC<{
  drug: Drug;
  index: number;
  totalResults: number;
  highlightMatch: (text: string, type: 'brand' | 'generic') => React.ReactNode;
  language: string;
  textTransform: 'normal' | 'uppercase';
  onAdd: (drug: Drug) => void;
  onLongPress: (drug: Drug) => void;
}> = ({
  drug,
  index,
  totalResults,
  highlightMatch,
  language,
  textTransform,
  onAdd,
  onLongPress,
}) => {
  const displayName = getDisplayName(drug, textTransform);
  const genericNameStr = Array.isArray(drug.genericName)
    ? drug.genericName.join(' + ')
    : String(drug.genericName || '');
  const parts = formatCurrencyParts(drug.publicPrice);
  const isArabic = language === 'AR';
  const isOutOfStock = drug.stock <= 0;

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLongPressed = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    hasLongPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      onLongPress(drug);
      longPressTimer.current = null;
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      className={`${index < 20 ? 'animate-stagger-fade-in' : ''} select-none touch-pan-y`}
      style={{ '--index': index } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        // Prevent context menu on touch to allow long-press
        if (e.nativeEvent.pointerType === 'touch') {
          e.preventDefault();
        }
      }}
    >
      <MaterialTabs
        index={index}
        total={totalResults}
        className='!px-0 !h-auto !min-h-[72px] border border-(--border-divider) transition-all bg-white dark:!bg-gray-800/40 dark:hover:!bg-gray-800/60'
      >
        <div className='flex flex-col w-full px-4 text-left'>
          <div className='h-[60px] flex items-center justify-between w-full gap-2'>
            <div className='flex-1 min-w-0'>
              <h3
                className='font-bold text-gray-900 dark:text-gray-100 leading-tight text-left line-clamp-2'
                dir='ltr'
              >
                {highlightMatch(displayName, 'brand')}
              </h3>
              <p
                className='flex items-center gap-1.5 text-xs mt-0.5 text-left truncate'
                dir='ltr'
              >
                <span className='font-bold text-gray-800 dark:text-gray-200 tabular-nums shrink-0'>
                  {parts.amount}
                </span>
                <span className='text-gray-400 dark:text-gray-500 truncate'>
                  {highlightMatch(genericNameStr, 'generic')}
                </span>
              </p>
            </div>
            <PrescriptionAddButton
              drug={drug}
              isArabic={isArabic}
              isOutOfStock={isOutOfStock}
              onAdd={onAdd}
            />
          </div>
        </div>
      </MaterialTabs>
    </div>
  );
};

// ─── Prescription Add Button ──────────────────────────────────────────────────

const PrescriptionAddButton: React.FC<{
  drug: Drug;
  isArabic: boolean;
  isOutOfStock: boolean;
  onAdd: (drug: Drug) => void;
}> = ({ drug, isArabic, isOutOfStock, onAdd }) => {
  const hasUnits = drug.unitsPerPack && drug.unitsPerPack > 1;

  return (
    <div className='shrink-0 flex items-center gap-3'>
      <div className='flex flex-col items-end justify-center'>
        {/* Units / Stock status */}
        {hasUnits ? (
          <span className='text-[9px] text-gray-500 dark:text-gray-400 font-medium mt-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-sm whitespace-nowrap'>
            {drug.unitsPerPack} {isArabic ? 'وحدة' : 'Units'}
          </span>
        ) : (
          <span className='text-[9px] text-gray-400 dark:text-gray-500 mt-1 whitespace-nowrap'>
            {isArabic ? 'علبة' : 'Pack'}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isOutOfStock) onAdd(drug);
        }}
        disabled={isOutOfStock}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
          isOutOfStock
            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 shadow-sm'
        }`}
      >
        <span className='material-symbols-rounded text-[20px]'>add</span>
      </button>
    </div>
  );
};

// ─── Prescription Summary Panel ──────────────────────────────────────────────

const PrescriptionSummary: React.FC<{
  items: PrescriptionItem[];
  onUpdateQuantity: (drugId: string, delta: number) => void;
  onRemoveItem: (drugId: string) => void;
  onClearAll: () => void;
  grandTotal: number;
  language: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  grandTotal,
  language,
  expanded,
  onToggle,
}) => {
  const isArabic = language === 'AR';
  const grandTotalParts = formatCurrencyParts(grandTotal);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className='bg-white dark:bg-(--bg-secondary) rounded-2xl max-lg:rounded-b-[2rem] max-lg:pb-[14px] border border-gray-200 dark:border-gray-800/50 max-lg:border-b-0 overflow-hidden shadow-sm lg:sticky lg:top-22'
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Header Bar */}
      <div className='px-4 py-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-4 min-w-0'>
          <div className='relative shrink-0 flex items-center justify-center'>
            <span className='material-symbols-rounded text-[28px] text-gray-900 dark:text-gray-100'>
              shopping_cart
            </span>
            <span className='absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 tabular-nums leading-none px-1 shadow-sm'>
              {count}
            </span>
          </div>
          <span className='text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums shrink-0 tracking-tight'>
            {grandTotalParts.amount} <span className='text-sm font-bold opacity-60'>{grandTotalParts.symbol}</span>
          </span>
        </div>
        <div className='flex items-center gap-1.5'>
          <button
            onClick={onClearAll}
            className='p-1.5 rounded-xl text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors'
            title={isArabic ? 'مسح السلة' : 'Clear Cart'}
          >
            <span className='material-symbols-rounded text-[22px]'>
              delete
            </span>
          </button>
          <button
            onClick={onToggle}
            className='lg:hidden p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors'
          >
            <span
              className={`material-symbols-rounded text-[22px] text-gray-500 dark:text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            >
              expand_less
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className={`grid transition-all duration-400 ease-[cubic-bezier(0.2,0,0,1)] border-gray-100 dark:border-gray-800/50 ${expanded ? 'grid-rows-[1fr] border-t opacity-100' : 'max-lg:grid-rows-[0fr] max-lg:border-t-0 max-lg:opacity-0 lg:grid-rows-[1fr] lg:border-t lg:opacity-100'}`}
      >
        <div className='overflow-hidden w-full'>
          <div className='divide-y divide-gray-100 dark:divide-gray-800/30 max-h-[40vh] lg:max-h-[78vh] overflow-y-auto [direction:ltr]'>
          {items.map((item) => {
            const lineNet = item.drug.publicPrice * item.quantity;
            return (
              <div
                key={item.drug.id}
                className='px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2'
              >
                <div className='flex-[2] sm:flex-1 min-w-0'>
                  <p className='text-[11px] sm:text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight text-left' dir='ltr'>
                    {getDisplayName(item.drug)}
                  </p>
                  <div className='flex items-center justify-start gap-1 mt-0.5'>
                    {isArabic ? (
                      <>
                        <span className='text-[10px] sm:text-[11px] font-bold text-primary-600 dark:text-primary-400 tabular-nums'>
                          {formatCurrency(lineNet)}
                        </span>
                        <span className='text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500'>
                          =
                        </span>
                        <span className='text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums'>
                          {item.quantity}
                        </span>
                        <span className='text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500'>
                          ×
                        </span>
                        <span className='text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums'>
                          {formatCurrency(item.drug.publicPrice)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className='text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums'>
                          {formatCurrency(item.drug.publicPrice)}
                        </span>
                        <span className='text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500'>
                          ×
                        </span>
                        <span className='text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums'>
                          {item.quantity}
                        </span>
                        <span className='text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500'>
                          =
                        </span>
                        <span className='text-[10px] sm:text-[11px] font-bold text-primary-600 dark:text-primary-400 tabular-nums'>
                          {formatCurrency(lineNet)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-0.5 shrink-0'>
                  <button
                    onClick={() => onUpdateQuantity(item.drug.id, -1)}
                    disabled={item.quantity <= 1}
                    className='w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700/50 transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100'
                  >
                    <span className='material-symbols-rounded text-[12px] sm:text-[14px]'>
                      remove
                    </span>
                  </button>
                  <span className='w-5 sm:w-6 text-center text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums'>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.drug.id, 1)}
                    className='w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700/50 transition-colors active:scale-90'
                  >
                    <span className='material-symbols-rounded text-[12px] sm:text-[14px]'>add</span>
                  </button>
                </div>

                <button
                  onClick={() => onRemoveItem(item.drug.id)}
                  className='text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 p-0.5'
                >
                  <span className='material-symbols-rounded text-[12px] sm:text-[14px]'>close</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PrescriptionPricing;
