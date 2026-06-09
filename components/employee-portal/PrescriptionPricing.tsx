import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import { Drug } from '../../types';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { InlineBarcodeScanner } from '../mobile/InlineBarcodeScanner';
import { MaterialTabs } from '../common/MaterialTabs';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { usePrescriptionPricing, PrescriptionItem } from './hooks/usePrescriptionPricing';

const PrescriptionPricing: React.FC = () => {
  const { language, textTransform } = useSettings();
  const t = TRANSLATIONS[language];
  const { playSuccess } = usePosSounds();

  const {
    inventory,
    isLoading,
    prescriptionItems,
    addItem,
    updateQuantity,
    clearAll,
    grandTotal,
  } = usePrescriptionPricing();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleScannerClick = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(language === 'AR' ? 'الكاميرا غير متوفرة في هذا السياق. حاول استخدام HTTPS.' : 'Camera not available in this context. Try using HTTPS.');
      return;
    }
    setIsScannerOpen(true);
  }, [language]);

  const handleResultsChange = useCallback((results: any[]) => {
    setSearchResults(results);
  }, []);

  const handleAddItem = useCallback((catalogItem: any) => {
    const fullDrug = inventory.find(d => d.id === catalogItem.id);
    addItem(fullDrug || (catalogItem as Drug));
  }, [inventory, addItem]);

  const highlightRegex = useMemo(() => {
    const rawTerm = searchTerm.trimStart().replace(/^[@#]/, '').trim();
    if (!rawTerm) return null;
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(words.map(w => `\\b${w}`).join('|'), 'gi');
  }, [searchTerm]);

  const highlightMatch = (text: string) => {
    if (!highlightRegex || !text) return text;
    try {
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
    } catch {
      return text;
    }
  };

  const handlePointerDown = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setExpandedDrugId(prev => prev === id ? null : id);
      if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="w-full" dir="ltr">
      {/* Search Header */}
      <div className="w-full sticky top-4 lg:top-6 z-10 pb-1">
        <div
          className={`grid transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)] ${isScannerOpen ? 'grid-rows-[1fr] opacity-100 mb-3' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
        >
          <div className="overflow-hidden">
            <div className="w-full max-w-2xl mx-auto px-2 pb-1">
              <InlineBarcodeScanner
                onScanSuccess={(decodedText) => {
                  playSuccess();
                  setSearchTerm(decodedText);
                  setIsScannerOpen(false);
                }}
                onClose={() => setIsScannerOpen(false)}
              />
            </div>
          </div>
        </div>

        <SearchEngineInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
          onResultsChange={handleResultsChange}
          showScannerIcon={true}
          onScannerClick={handleScannerClick}
          placeholder={t.pos.searchPlaceholder}
          wrapperClassName="max-w-3xl mx-auto"
          className="h-12 text-base"
        />
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mt-4 max-w-6xl mx-auto">
          {/* Prescription Cart - mobile dock (top), desktop sidebar (right) */}
          {prescriptionItems.length > 0 && (
            <div className="order-1 lg:order-2 lg:w-[360px] lg:shrink-0 sticky top-16  z-10">
              <PrescriptionSummary
                items={prescriptionItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={(id) => updateQuantity(id, -999)}
                onClearAll={clearAll}
                grandTotal={grandTotal}
                language={language}
                expanded={isCartOpen}
                onToggle={() => setIsCartOpen((v) => !v)}
              />
            </div>
          )}

          {/* Search Results */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {searchTerm && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-start pt-6 p-6 text-center animate-fade-in">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t.pos.noResults || (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
                  {language === 'AR' ? 'جرب البحث بكلمات مختلفة أو كود آخر' : 'Try searching with different keywords or codes'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {searchResults.slice(0, 100).map((drug, index) => (
                  <SearchResultItem
                    key={drug.id}
                    drug={drug}
                    index={index}
                    totalResults={searchResults.length}
                    isExpanded={expandedDrugId === drug.id}
                    onToggleExpand={() => setExpandedDrugId(expandedDrugId === drug.id ? null : drug.id)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    highlightMatch={highlightMatch}
                    language={language}
                    textTransform={textTransform}
                    onAdd={handleAddItem}
                  />
                ))}
              </div>
            )}

            {!searchTerm && (
              <div className="flex flex-col items-center justify-start pt-12 p-8 text-center animate-fade-in">
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
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Search Result Item ───────────────────────────────────────────────────────

const SearchResultItem: React.FC<{
  drug: Drug;
  index: number;
  totalResults: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPointerDown: (id: string) => void;
  onPointerUp: () => void;
  highlightMatch: (text: string) => React.ReactNode;
  language: string;
  textTransform: 'normal' | 'uppercase';
  onAdd: (drug: Drug) => void;
}> = ({ drug, index, totalResults, isExpanded, onToggleExpand, onPointerDown, onPointerUp, highlightMatch, language, textTransform, onAdd }) => {
  const displayName = getDisplayName(drug, textTransform);
  const genericNameStr = Array.isArray(drug.genericName) ? drug.genericName.join(' + ') : String(drug.genericName || '');
  const parts = formatCurrencyParts(drug.publicPrice);
  const isArabic = language === 'AR';
  const isOutOfStock = drug.stock <= 0;

  return (
    <div className={index < 20 ? "animate-stagger-fade-in" : ""} style={{ '--index': index } as React.CSSProperties}>
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
                {highlightMatch(displayName)}
              </h3>
              <p className={`text-gray-400 dark:text-gray-600 text-xs mt-0.5 ${isExpanded ? '' : 'truncate'}`}>
                {highlightMatch(genericNameStr)}
              </p>
            </div>
            <PrescriptionAddButton drug={drug} parts={parts} isArabic={isArabic} isOutOfStock={isOutOfStock} onAdd={onAdd} />
          </div>
        </div>
      </MaterialTabs>
    </div>
  );
};

// ─── Prescription Add Button ──────────────────────────────────────────────────

const PrescriptionAddButton: React.FC<{
  drug: Drug;
  parts: { amount: string; symbol: string };
  isArabic: boolean;
  isOutOfStock: boolean;
  onAdd: (drug: Drug) => void;
}> = ({ drug, parts, isArabic, isOutOfStock, onAdd }) => {
  return (
    <div className="shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAdd(drug); }}
        disabled={isOutOfStock}
        className={`flex items-center h-8 rounded-full border transition-all duration-300 active:scale-95 px-3 ${
          isOutOfStock
            ? 'border-gray-200 dark:border-white/20 opacity-50 cursor-not-allowed'
            : 'border-primary-500/50 hover:border-primary-500 hover:bg-primary-500/10'
        }`}
      >
        <span className="font-black text-[13px] text-primary-600 dark:text-primary-400 tabular-nums">
          <span className="flex items-baseline gap-0.5">
            {isArabic ? (
              <><span className="text-[8px] font-black opacity-60">{parts.symbol}</span><span>{parts.amount}</span></>
            ) : (
              <><span>{parts.amount}</span><span className="text-[8px] font-black opacity-60">{parts.symbol}</span></>
            )}
          </span>
        </span>
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
    <div className="bg-white/80 dark:bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-800/50 overflow-hidden shadow-sm lg:sticky lg:top-22" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-rounded text-[18px] text-gray-500 dark:text-gray-400 shrink-0">description</span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
            {isArabic ? 'الوصفة الطبية' : 'Prescription'}
          </span>
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 shrink-0">({count})</span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
            {grandTotalParts.amount} {grandTotalParts.symbol}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClearAll}
            className="text-[11px] font-semibold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-500/10"
          >
            {isArabic ? 'مسح' : 'Clear'}
          </button>
          <button
            onClick={onToggle}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className={`material-symbols-rounded text-[18px] text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`border-t border-gray-100 dark:border-gray-800/50 ${expanded ? 'block' : 'hidden lg:block'}`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-800/30 max-h-[40vh] lg:max-h-[78vh] overflow-y-auto [direction:ltr]">
            {items.map((item) => {
              const lineNet = item.drug.publicPrice * item.quantity;
              return (
                <div key={item.drug.id} className="px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2">
                  <div className="flex-[2] sm:flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                      {getDisplayName(item.drug)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 tabular-nums mt-0.5">
                      {formatCurrency(lineNet)}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-0.5 shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.drug.id, -1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700/50 transition-colors active:scale-90"
                    >
                      <span className="material-symbols-rounded text-[12px] sm:text-[14px]">remove</span>
                    </button>
                    <span className="w-5 sm:w-6 text-center text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.drug.id, 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700/50 transition-colors active:scale-90"
                    >
                      <span className="material-symbols-rounded text-[12px] sm:text-[14px]">add</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.drug.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 p-0.5"
                  >
                    <span className="material-symbols-rounded text-[12px] sm:text-[14px]">close</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPricing;
