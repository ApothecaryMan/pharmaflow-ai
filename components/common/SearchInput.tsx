import React, { forwardRef, useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import { ContextMenuItem, ContextMenuSeparator, useContextMenu } from './ContextMenu';
import { type FilterConfig, FilterPill } from './FilterPill';
import { useSmartDirection } from './SmartInputs';
import { Tooltip } from './Tooltip';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onSearchChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  rounded?: 'xl' | 'full';
  color?: string;

  // Autocomplete Props
  enableAutocomplete?: boolean;
  suggestions?: string[];
  onSuggestionAccept?: (suggestion: string) => void;

  // New Filter Props
  filterConfigs?: FilterConfig[];
  activeFilters?: Record<string, any[]>; // groupID -> values[]
  onUpdateFilter?: (groupId: string, newValues: any[]) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onSearchChange,
      onClear,
      placeholder,
      className = '',
      wrapperClassName = '',
      icon = 'search',
      badge,
      rounded = 'xl',
      color = 'primary',

      filterConfigs = [],
      activeFilters = {},
      onUpdateFilter,
      
      enableAutocomplete = false,
      suggestions = [],
      onSuggestionAccept,
      ...props
    },
    ref
  ) => {
    const { language, textTransform } = useSettings();
    const t = TRANSLATIONS[language];
    const dir = useSmartDirection(value, placeholder);
    const showClear = value && onClear;
    const { showMenu, hideMenu } = useContextMenu();
    const [isCapsLock, setIsCapsLock] = useState(false);


    // --- Autocomplete Logic ---
    const [currentSuggestion, setCurrentSuggestion] = useState<string>('');

    // Calculate suggestion
    const ghostText = useMemo(() => {
        if (!enableAutocomplete || !value || !suggestions.length) return '';
        const match = suggestions.find(s => 
            s.toLowerCase().startsWith(value.toLowerCase()) && 
            s.toLowerCase() !== value.toLowerCase()
        );
        if (!match) return '';
        setCurrentSuggestion(match);
        // Normalize to lowercase so it can follow dynamic casing logic
        return match.slice(value.length).toLowerCase();
    }, [value, suggestions, enableAutocomplete]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setIsCapsLock(e.getModifierState('CapsLock'));
        if (ghostText && (e.key === 'ArrowRight' || e.key === 'Tab')) {
            e.preventDefault();
            const fullTerm = value + ghostText;
            onSearchChange(fullTerm);
            onSuggestionAccept?.(fullTerm);
        }
        props.onKeyDown?.(e);
    };

    const activeGroups = Object.keys(activeFilters).filter(
      (k) => activeFilters[k] && activeFilters[k].length > 0
    );
    const hasActiveFilters = activeGroups.length > 0;

    // Auto-collapse if more than 1 filter is active
    const shouldCollapse = activeGroups.length > 1;

    const handleAddFilter = (config: FilterConfig) => {
      // Initialize with empty or default?
      // Usually opening the menu requires no initial value, but we can't "add" a filter without a value.
      // So maybe we open the filter's specific menu immediately?
      // Or simple Add -> Open Context Menu for that filter.
      // For now, let's just "activate" it with empty if needed, acts as "adding pill"
      // But better UX: Show all options for this filter immediately?
      // Let's stick to: Click -> Pill appears (maybe with default?) -> Or open nested menu?
      // Let's simplified: Allow adding empty pill? No.
      // Let's TRIGGER the pill's logic.
      // Actually, better: Click Add -> Show list of Filters -> Click Filter -> Show Options.
      // But ContextMenu doesn't support nested easily yet.
      // Workaround: Click Filter -> Add "Empty" Pill -> Auto Open its menu?
      // Or: Click Filter -> Set a default value (e.g. first option)
      if (config.options.length > 0 && typeof onUpdateFilter === 'function') {
        // select first one as default
        if (config.mode === 'single') {
          onUpdateFilter(config.id, [config.options[0].value]);
        } else {
          // For multi, also select first one to make it visible
          onUpdateFilter(config.id, [config.options[0].value]);
        }
      }
      hideMenu();
    };

    const handleClearAllFilters = () => {
      activeGroups.forEach((gid) => onUpdateFilter && onUpdateFilter(gid, []));
      hideMenu();
    };

    const handleFilterClick = (e: React.MouseEvent) => {
      e.preventDefault();

      const menuContent = (
        <div className='font-sans'>
          <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-gray-100 dark:border-gray-800 mb-1'>
            {t.global.table.filters}
          </div>
          {filterConfigs.map((config) => {
            const isActive = activeFilters[config.id] && activeFilters[config.id].length > 0;
            if (isActive) return null; // Already active

            return (
              <ContextMenuItem
                key={config.id}
                label={config.label}
                icon={config.icon}
                onClick={() => handleAddFilter(config)}
              />
            );
          })}
          {Object.keys(activeFilters).length > 0 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                label={t.global.table.clearAllFilters}
                icon='filter_list_off'
                danger
                onClick={handleClearAllFilters}
                disabled={!hasActiveFilters}
              />
            </>
          )}
        </div>
      );

      showMenu(e.clientX, e.clientY, menuContent);
    };

    const [isFocused, setIsFocused] = useState(false);

    return (
      <div
        className={`
            relative flex items-center flex-wrap gap-2
            bg-(--bg-input)
            border-2 dark:border border-(--border-search)
            transition-colors duration-0
            ${isFocused ? 'border-gray-400 dark:border-gray-500 shadow-sm' : ''}
            ${rounded === 'full' ? 'rounded-4xl px-1' : 'rounded-xl px-1'} 
            ${wrapperClassName}
         `}
        dir={dir}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // Mimic input focus styles on wrapper
        onClick={() => {
          if (ref && typeof ref !== 'function' && 'current' in ref) {
            ref.current?.focus();
          }
        }}
      >
        {/* Leading Icon (or Filter Button if filters exist?) */}
        {/* If has active filters, we show them first? OR after icon? */}
        {/* Design: [Icon] [Pill] [Pill] [Input] [Clear] [Add Filter] */}
        <div className={`
          flex items-center select-none ps-2 transition-all duration-200
          ${isFocused ? 'text-black dark:text-white' : 'text-gray-400'}
        `}>
          {typeof icon === 'string' ? (
            <span 
              className='material-symbols-rounded' 
              style={{ 
                fontSize: 'var(--icon-navbar-main)',
                fontVariationSettings: isFocused ? "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
              }}
            >
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>

        {/* The Actual Input Container */}
        <div className={`
             relative flex-1 min-w-[80px]
             ${hasActiveFilters ? 'ms-1' : 'ms-2'}
        `}>
            <input
              ref={ref}
              {...props}
              type='search'
              value={value}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={(e) => setIsCapsLock(e.getModifierState('CapsLock'))}
              placeholder={hasActiveFilters ? placeholder?.split(',')[0] + '...' : placeholder}
              spellCheck='false'
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              inputMode="search"
              className={`
                w-full bg-transparent
                text-sm text-gray-900 dark:text-gray-100 
                placeholder-gray-400 outline-hidden
                py-2.5
                ${className}
              `}
            />
            {/* Standardized Autocomplete Badge */}
            {ghostText && (
                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} flex items-center pointer-events-none overflow-hidden select-none`}>
                    <span className="invisible whitespace-pre text-sm py-2.5">{value}</span>
                    <span className={`
                        inline-flex items-center px-1 py-1 ms-0.5
                        rounded-[10px] 
                        bg-gray-100 dark:bg-(--bg-surface-neutral) 
                        text-[13px] font-black tracking-tight
                        text-gray-600 dark:text-gray-400 
                        shadow-sm transition-all animate-in fade-in duration-100
                        ${isCapsLock ? 'uppercase' : ''}
                    `}>
                        {isCapsLock ? ghostText.toUpperCase() : ghostText}
                        <span className="material-symbols-rounded ms-1 opacity-60" style={{ fontSize: 'var(--icon-sm)' }}>keyboard_tab</span>
                    </span>
                </div>
            )}
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters &&
          activeGroups.map((groupId) => {
            const config = filterConfigs.find((c) => c.id === groupId);
            const values = activeFilters[groupId];

            if (!config || !values) return null;

            return (
              <FilterPill
                key={groupId}
                config={config}
                selectedValues={values}
                collapsed={shouldCollapse}
                onUpdate={(newVals) => onUpdateFilter && onUpdateFilter(groupId, newVals)}
                onRemove={() => onUpdateFilter && onUpdateFilter(groupId, [])}
                rounded={rounded}
              />
            );
          })}

        {/* Actions Group */}
        <div className='flex items-center gap-1.5 ms-auto'>
          {/* Clear Text Button - Only show if has value and onClear provided */}
          {showClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className='material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors outline-hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
              style={{ fontSize: 'var(--icon-md)' }}
            >
              close
            </button>
          )}

          {/* Filter Actions Group (Restored Container) */}
          {filterConfigs.length > 0 && (
            <div className={`
              flex items-center p-0.5 ${rounded === 'full' ? 'rounded-full ml-[-2px]' : 'rounded-xl'}
              border transition-all duration-200 ms-0.5
              ${
                hasActiveFilters
                  ? 'border-gray-200/60 dark:border-(--border-divider) bg-(--bg-surface-neutral)'
                  : 'border-transparent bg-transparent hover:border-gray-200/60 dark:hover:border-(--border-divider) hover:bg-(--bg-surface-neutral)'
              }
            `}>
              {/* Clear All Filters Button - Only if active filters exist */}
              {hasActiveFilters && (
                <Tooltip content={t.global.table.clearAllFilters}>
                  <button
                    type='button'
                    onClick={handleClearAllFilters}
                    className='text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center w-6 h-6 transition-colors'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>filter_list_off</span>
                  </button>
                </Tooltip>
              )}

              {/* Add/Tune Filter Button */}
              <Tooltip content={t.global.table.addFilter}>
                <button
                  type='button'
                  onClick={handleFilterClick}
                  className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center w-7 h-7 transition-colors'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '22px' }}>tune</span>
                </button>
              </Tooltip>
            </div>
          )}

          {badge && <div className='pointer-events-none flex items-center ps-1 pe-2'>{badge}</div>}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
