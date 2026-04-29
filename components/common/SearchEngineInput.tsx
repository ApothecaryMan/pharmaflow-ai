import React, { forwardRef } from 'react';
import { SearchInput } from './SearchInput';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import { Tooltip } from './Tooltip';

interface SearchEngineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onSearchChange: (value: string) => void;
  onClear?: () => void;
  resultsCount?: number;
  isLoading?: boolean;
  suggestions?: string[];
  onSuggestionAccept?: (suggestion: string) => void;
  
  // Filter Integration
  activeFilters?: any;
  filterConfigs?: any;
  onUpdateFilter?: (groupId: string, newValues: any[]) => void;
  
  // Custom Features from POS/Mobile
  showScannerIcon?: boolean;
  onScannerClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  
  placeholder?: string;
  color?: string;
  wrapperClassName?: string;
}

/**
 * SearchEngineInput - The Unified Search Engine UI Shell.
 * Optimized for clean UI: Shortcut hints moved to a tooltip on the search icon.
 */
export const SearchEngineInput = forwardRef<HTMLInputElement, SearchEngineInputProps>(
  (
    {
      value,
      onSearchChange,
      onClear,
      resultsCount = 0,
      isLoading = false,
      suggestions = [],
      onSuggestionAccept,
      activeFilters,
      filterConfigs,
      onUpdateFilter,
      showScannerIcon = false,
      onScannerClick,
      onContextMenu,
      placeholder,
      color = 'primary',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const { language } = useSettings();
    const t = TRANSLATIONS[language];

    // Shortcuts Content for Tooltip - Theme Aware
    const shortcutsHint = (
      <div className="flex flex-col gap-2.5 p-1.5 min-w-[180px]">
        <div className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.1em] border-b border-gray-100 dark:border-white/10 pb-1.5 mb-1 flex items-center gap-2">
          <span className="material-symbols-rounded text-[14px]">auto_awesome</span>
          {language === 'AR' ? 'اختصارات البحث الذكي' : 'Smart Search Shortcuts'}
        </div>
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-800 dark:text-gray-200 font-medium">{language === 'AR' ? 'بحث علمي / مادة فعالة' : 'Scientific Search'}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/15 border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-600 dark:text-white shadow-xs">@</kbd>
          </div>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 italic leading-tight">
            {language === 'AR' ? 'مثال: @باراسيتامول' : 'Example: @paracetamol'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-800 dark:text-gray-200 font-medium">{language === 'AR' ? 'نطاق سعري (أقل/أعلى/)' : 'Price (min/max/)'}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/15 border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-600 dark:text-white shadow-xs">10/50/</kbd>
          </div>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 italic leading-tight">
            {language === 'AR' ? 'مثال: 10/50/بنادول' : 'Example: 10/50/panadol'}
          </p>
        </div>
      </div>
    );

    // Custom Icon with Tooltip
    const searchIconWithTooltip = (
      <Tooltip content={shortcutsHint} position="bottom" delay={150}>
        <div className="flex items-center justify-center">
          <span className="material-symbols-rounded text-gray-400" style={{ fontSize: '20px' }}>
            search
          </span>
        </div>
      </Tooltip>
    );

    return (
      <div className={`w-full flex flex-col ${wrapperClassName}`}>
        <SearchInput
          ref={ref}
          value={value}
          onSearchChange={onSearchChange}
          onClear={onClear}
          onContextMenu={onContextMenu}
          placeholder={placeholder || t.pos.searchPlaceholder}
          enableAutocomplete={true}
          suggestions={suggestions}
          onSuggestionAccept={onSuggestionAccept}
          filterConfigs={filterConfigs}
          activeFilters={activeFilters}
          onUpdateFilter={onUpdateFilter}
          color={color}
          className="selection:bg-primary-500/30 selection:text-primary-900 dark:selection:text-white"
          
          // Custom Icon (Default or Scanner)
          icon={
            showScannerIcon ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onScannerClick?.();
                }}
                className="flex items-center justify-center -ms-1 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 text-gray-400"
                title={language === 'AR' ? 'مسح باركود' : 'Scan Barcode'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>
                  qr_code_scanner
                </span>
              </button>
            ) : searchIconWithTooltip
          }

          resultsCount={resultsCount}
          isLoading={isLoading}

          {...props}
        />
      </div>
    );
  }
);

SearchEngineInput.displayName = 'SearchEngineInput';
