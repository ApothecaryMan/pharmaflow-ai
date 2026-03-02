import React, { useState, useMemo, useRef } from 'react';
import { SearchInput } from '../common/SearchInput';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import { parseSearchTerm } from '../../utils/searchUtils';
import { Drug } from '../../types';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { InlineBarcodeScanner } from './InlineBarcodeScanner';
import { MaterialTabs } from '../common/MaterialTabs';

interface MobileMedicineSearchProps {
  inventory: Drug[];
  color: string;
  onScanClick?: () => void;
}

export const MobileMedicineSearch: React.FC<MobileMedicineSearchProps> = ({
  inventory,
  color,
  onScanClick,
}) => {
  const { language, textTransform } = useSettings();
  const t = TRANSLATIONS[language];
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Viewport height detection using Visual Viewport API
  const [viewportHeight, setViewportHeight] = useState<number | string>('100%');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setExpandedDrugId(prev => prev === id ? null : id);
      // Give haptic feedback if available - Double sharp pulse for premium feel
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
      setViewportHeight(vpv.height);
      
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

  // Advanced filtering logic using searchUtils
  const filteredDrugs = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    
    const { mode, regex } = parseSearchTerm(searchTerm);
    const trimmedSearch = searchTerm.trim();

    return inventory.filter((drug) => {
      // 1. Exact match for barcode/code always works
      if (drug.barcode === trimmedSearch || drug.internalCode === trimmedSearch) {
        return true;
      }

      // 2. Mode-based advanced filtering
      if (mode === 'generic') {
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
  }, [inventory, searchTerm]);

  // Pre-compute highlight regex ONCE per search term (memoized performance optimization)
  // Uses word-boundary \b so it only highlights at the START of words, not mid-word
  const highlightRegex = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const rawTerm = searchTerm.trimStart().replace(/^[@#]/, '').trim();
    if (!rawTerm) return null;
    const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = escaped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(words.map(w => `\\b${w}`).join('|'), 'gi');
  }, [searchTerm]);

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
      className="flex flex-col bg-gray-50 dark:bg-[#0C111D] overflow-hidden relative"
      style={{ height: viewportHeight }}
      onContextMenu={(e) => e.preventDefault()}
      dir="ltr"
    >
      {/* Fixed Header with Search Bar */}
      <div 
        className={`
          w-full z-50 shrink-0
          ${isKeyboardOpen 
            ? 'bg-gray-50 dark:bg-[#0C111D] border-b border-gray-100 dark:border-gray-800 shadow-[0_10px_30px_rgba(0,0,0,0.05)] p-4' 
            : 'bg-gray-50/80 dark:bg-[#0C111D]/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 p-4'
          }
        `}
      >
        {isScannerOpen && (
          <div className="w-full max-w-2xl mx-auto mb-3 px-2">
            <InlineBarcodeScanner
              onScanSuccess={(decodedText) => {
                setSearchTerm(decodedText);
                setIsScannerOpen(false);
              }}
              onClose={() => setIsScannerOpen(false)}
              color={color}
            />
          </div>
        )}

        <div className="flex items-center w-full max-w-2xl mx-auto">
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
              className={`
                shadow-none
                ${isKeyboardOpen 
                  ? 'bg-white dark:bg-[#06080F] border-transparent rounded-2xl' 
                  : 'bg-white dark:bg-[#06080F] border-gray-200/60 dark:border-gray-800/60 shadow-sm rounded-2xl'
                }
              `}
            />
          </div>
          
          {/* Cancel Button */}
          <div 
            className={`
              flex items-center overflow-hidden transition-all duration-300
              ${isKeyboardOpen ? 'max-w-[100px] opacity-100 ms-3' : 'max-w-0 opacity-0 ms-0 pointer-events-none'}
            `}
          >
            <button 
              onClick={() => {
                searchInputRef.current?.blur();
                setSearchTerm('');
              }}
              className="text-primary-600 dark:text-primary-400 font-bold text-sm px-2 whitespace-nowrap active:opacity-50 transition-opacity"
            >
              {language === 'AR' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>

        
        {/* Search Results Summary */}
        {searchTerm && (
          <div className="pt-3 px-2 shrink-0 animate-fade-in">
            <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {language === 'AR' ? 'نتائج البحث' : 'Search Results'} ({filteredDrugs.length})
            </h2>
          </div>
        )}
      </div>

      {/* Results List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col w-full relative">
        {searchTerm && filteredDrugs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-[#0C111D] flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-rounded text-5xl text-gray-300 dark:text-gray-700">
                search_off
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t.pos.noResults || (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
              {language === 'AR' ? 'جرب البحث بكلمات مختلفة أو كود آخر' : 'Try searching with different keywords or codes'}
            </p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-1 pb-24" dir="ltr">
            {filteredDrugs.map((drug, index) => {
              const displayName = getDisplayName(drug, textTransform);
              const isLongBrand = displayName.length > 18;
              const isExpanded = expandedDrugId === drug.id;

              return (
                <MaterialTabs
                  key={drug.id}
                  index={index}
                  total={filteredDrugs.length}
                  isSelected={isExpanded}
                  onPointerDown={() => handlePointerDown(drug.id)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className={`
                    !px-0 border border-gray-100/50 dark:border-gray-800/30 transition-all duration-500 ease-in-out
                    ${isExpanded ? '!h-auto min-h-[120px] pt-4 shadow-xl !bg-white dark:!bg-[#151B28] z-10' : '!h-[80px] pt-1'}
                  `}
                  onClick={() => {
                    // Clicking an expanded card collapses it
                    if (isExpanded) setExpandedDrugId(null);
                  }}
                >
                  <div className="flex items-start justify-between w-full h-full px-4 pb-2">
                    <div className="flex-1 min-w-0 h-full flex flex-col px-1">
                      <div className={`${isExpanded ? '' : 'my-auto'} w-full flex flex-col gap-0 transition-all`}>
                        {/* Brand Name - Scrollable if too long */}
                        <div className={`${isExpanded ? 'max-h-none h-auto' : 'max-h-[32px] overflow-y-auto'} scrollbar-hide shrink-0 transition-all`}>
                           <h3 className={`font-bold text-gray-900 dark:text-gray-100 leading-[1.1] ${isExpanded ? 'text-base mb-1' : ''}`}>
                             {highlightMatch(displayName, searchTerm, !searchTerm.startsWith('@'))}
                           </h3>
                         </div>

                        {/* Generic Name - Scrollable area */}
                        <div className={`pt-0.5 mt-0.5 transition-all duration-300`}>
                           <p className={`text-gray-400 dark:text-gray-600 leading-[1.1] transition-all duration-300 ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                             {(() => {
                               const genericNameStr = Array.isArray(drug.genericName) 
                                 ? drug.genericName.join(' + ') 
                                 : (drug.genericName as unknown as string);
                               
                               // Only highlight generic if explicitly searching for generic (@) 
                               // or if the brand name DOES NOT contain a match (to explain deep search result)
                               const { regex } = parseSearchTerm(searchTerm);
                               const hasBrandMatch = regex.test(displayName);
                               const shouldHighlightGeneric = searchTerm.startsWith('@') || !hasBrandMatch;
                               
                               return highlightMatch(genericNameStr, searchTerm, shouldHighlightGeneric);
                             })()}
                           </p>
                          
                          <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] mt-2 opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                            <div className="overflow-hidden min-h-0">
                              {drug.description && (
                                <p className="text-xs text-gray-500 italic pt-2">
                                  {drug.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`ml-4 text-right shrink-0 ${isExpanded ? 'pt-1' : ''}`}>
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-lg text-primary-600 dark:text-primary-400 tabular-nums transition-all">
                            {(() => {
                              const parts = formatCurrencyParts(drug.price);
                              const isArabic = language === 'AR';
                              return (
                                <span className="flex items-baseline gap-0.5">
                                  {isArabic && (
                                    <span className="text-[10px] font-bold opacity-60">
                                      {parts.symbol}
                                    </span>
                                  )}
                                  <span>{parts.amount}</span>
                                  {!isArabic && (
                                    <span className="text-[10px] font-bold opacity-60">
                                      {parts.symbol}
                                    </span>
                                  )}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                        <div className={`text-base font-black transition-all ${drug.stock > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                          {(() => {
                            if (drug.stock <= 0) return '0';
                            
                            const unitsPerPack = drug.unitsPerPack || 1;
                            const stockInPacks = drug.stock / unitsPerPack;
                            
                            // Show as decimal (e.g., 2.5) if there are partial packs
                            return Number.isInteger(stockInPacks) 
                              ? stockInPacks.toString() 
                              : stockInPacks.toLocaleString('en-US', { 
                                  minimumFractionDigits: 1, 
                                  maximumFractionDigits: 2 
                                });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </MaterialTabs>
              );
            })}
          </div>
        )}

        {!searchTerm && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full" />
              <span className="material-symbols-rounded text-[90px] text-primary-500/20 relative">
                pill
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
              {language === 'AR' ? 'ماذا تبحث عنه اليوم؟' : 'What are you looking for?'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
              {language === 'AR' 
                ? 'ابحث بسهولة عن الأدوية بالاسم العلمي أو التجاري أو عبر الباركود' 
                : 'Easily search for medicines by brand name, generic name, or barcode'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
