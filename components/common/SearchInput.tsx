import type React from 'react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useTypography } from '../../context/TypographyContext';
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

  // Compact Search Props
  compact?: boolean;
  expandable?: boolean;

  // Internal Badge Logic Props
  resultsCount?: number;
  isLoading?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value = '',
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

      compact = false,
      expandable = false,
      resultsCount,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    const { language, textTransform: _textTransform } = useTypography();
    const t = TRANSLATIONS[language];
    const dir = useSmartDirection(value, placeholder);
    const showClear = value && onClear;
    const { showMenu, hideMenu, isMouseOverMenu } = useContextMenu();
    const filterButtonRef = useRef<HTMLButtonElement>(null);
    const filterLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isCapsLock, setIsCapsLock] = useState(false);

    // --- Autocomplete Logic ---
    const [currentSuggestion, setCurrentSuggestion] = useState<string>('');

    // Update currentSuggestion via side-effect to prevent anti-patterns
    useEffect(() => {
      if (!enableAutocomplete || !value || !suggestions.length) {
        setCurrentSuggestion('');
        return;
      }
      const match = suggestions.find(
        (s) =>
          s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
      );
      setCurrentSuggestion(match || '');
    }, [value, suggestions, enableAutocomplete]);

    // Calculate suggestion ghost text purely
    const ghostText = useMemo(() => {
      if (!enableAutocomplete || !value || !currentSuggestion) return '';

      // Ensure the suggestion still matches the current input
      if (!currentSuggestion.toLowerCase().startsWith(value.toLowerCase())) return '';

      // Normalize to lowercase so it can follow dynamic casing logic
      return currentSuggestion.slice(value.length).toLowerCase();
    }, [value, currentSuggestion, enableAutocomplete]);

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
      if (config.options.length > 0 && typeof onUpdateFilter === 'function') {
        onUpdateFilter(config.id, [config.options[0].value]);
      }
      hideMenu();
    };

    const handleClearAllFilters = () => {
      activeGroups.forEach((gid) => onUpdateFilter?.(gid, []));
      hideMenu();
    };

    const handleOpenFilterMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (filterLeaveTimeoutRef.current) clearTimeout(filterLeaveTimeoutRef.current);

      const menuContent = (
      <div
        role="button"
        tabIndex={0}
        className='font-sans'
        onMouseEnter={() => {
          if (filterLeaveTimeoutRef.current) clearTimeout(filterLeaveTimeoutRef.current);
        }}
        onMouseLeave={() => {
          filterLeaveTimeoutRef.current = setTimeout(() => {
            hideMenu();
          }, 150);
        }}
      >
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

      if (filterButtonRef.current) {
        const rect = filterButtonRef.current.getBoundingClientRect();
        showMenu(rect.left, rect.bottom + 5, menuContent);
      }
    };

    const handleFilterMouseLeave = () => {
      filterLeaveTimeoutRef.current = setTimeout(() => {
        if (!isMouseOverMenu) {
          hideMenu();
        }
      }, 150);
    };

    const [isFocused, setIsFocused] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const expandRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!expanded) return;
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (expandRef.current && !expandRef.current.contains(e.target as Node)) {
          setExpanded(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [expanded]);

    if (compact) {
      if (expandable) {
        return (
          <>
            <div ref={expandRef} className='sm:hidden'>
              {expanded ? (
                <div className='fixed inset-x-0 top-0 z-[99999] bg-(--bg-page-surface) border-b border-(--border-divider) p-3'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='flex-1 flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 custom-card-css-target no-padding bg-(--bg-input) focus-within:ring-2 focus-within:ring-primary-500'
                      dir={dir}
                    >
                      <span
                        className='material-symbols-rounded text-gray-400 shrink-0'
                        style={{ fontSize: '20px' }}
                      >
                        {typeof icon === 'string' ? icon : 'search'}
                      </span>
                      <input
                        ref={ref}
                        type='text'
                        value={value}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setExpanded(false);
                          props.onKeyDown?.(e);
                        }}
                        className='flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden'
                        spellCheck='false'
                        autoComplete='off'
                        autoCorrect='off'
                        autoCapitalize='none'
                      />
                    </div>
                    <button
                      type='button'
                      onClick={() => setExpanded(false)}
                      className='text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0 px-2'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => setExpanded(true)}
                  className='flex items-center justify-center gap-2 px-3 h-pageheader rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 custom-card-css-target no-padding hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <title>Search</title>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                  {t.common?.search || 'Search'}
                </button>
              )}
            </div>
            <div className='hidden sm:block'>
              <div
                className={`
                  flex items-center gap-1 px-2 h-pageheader text-sm rounded-lg border
                  border-gray-300 dark:border-gray-600 custom-card-css-target no-padding
                  bg-(--bg-input)
                  focus-within:ring-2 focus-within:ring-primary-500
                  ${wrapperClassName}
                `}
                dir={dir}
              >
                <span
                  className='material-symbols-rounded text-gray-400 shrink-0'
                  style={{ fontSize: '20px' }}
                >
                  {typeof icon === 'string' ? icon : 'search'}
                </span>
                <input
                  ref={ref}
                  type='text'
                  value={value}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => props.onKeyDown?.(e)}
                  placeholder={placeholder}
                  className={`
                    flex-1 bg-transparent text-sm
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 outline-hidden
                    [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden
                    ${className}
                  `}
                  spellCheck='false'
                  autoComplete='off'
                  autoCorrect='off'
                  autoCapitalize='none'
                  {...props}
                />
              </div>
            </div>
          </>
        );
      }
      return (
        <div
          className={`
            flex items-center gap-1 px-2 h-pageheader text-sm rounded-lg border
            border-gray-300 dark:border-gray-600 custom-card-css-target no-padding
            bg-(--bg-input)
            focus-within:ring-2 focus-within:ring-primary-500
            ${wrapperClassName}
          `}
          dir={dir}
        >
          <span
            className='material-symbols-rounded text-gray-400 shrink-0'
            style={{ fontSize: '20px' }}
          >
            {typeof icon === 'string' ? icon : 'search'}
          </span>
          <input
            ref={ref}
            type='text'
            value={value}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => props.onKeyDown?.(e)}
            placeholder={placeholder}
            className={`
              flex-1 bg-transparent text-sm
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 outline-hidden
              [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden
              ${className}
            `}
            spellCheck='false'
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='none'
            {...props}
          />
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        className={`
            relative flex items-center flex-wrap gap-2
            bg-(--bg-input)
            border border-gray-300 dark:border-gray-600 custom-card-css-target no-padding
            ${isFocused ? 'border-gray-400 dark:border-gray-500 shadow-sm' : ''}
            ${rounded === 'full' ? 'rounded-full ps-4 pe-1.5' : 'rounded-3xl ps-4 pe-1.5'} 
            min-h-11
            ${wrapperClassName}
         `}
        dir={dir}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onClick={() => {
          if (ref && typeof ref !== 'function' && 'current' in ref) {
            ref.current?.focus();
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (ref && typeof ref !== 'function' && 'current' in ref) ref.current?.focus(); } }}
      >
        <div
          className={`
          flex items-center self-stretch select-none
          ${isFocused ? 'text-black dark:text-white' : 'text-gray-400'}
        `}
        >
          {/* leading icon removed ps-3 since wrapper has ps-3 */}
          {typeof icon === 'string' ? (
            <span
              className='material-symbols-rounded'
              style={{
                fontSize: '22px',
                fontVariationSettings: isFocused
                  ? "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>

        <div
          className={`
             relative flex-1 self-stretch flex items-center
             ${hasActiveFilters ? 'ms-1' : 'ms-2'}
        `}
        >
          <input
            ref={ref}
            {...props}
            type='search'
            value={value}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => setIsCapsLock(e.getModifierState('CapsLock'))}
            placeholder={hasActiveFilters ? `${placeholder?.split(',')[0]}...` : placeholder}
            spellCheck='false'
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='none'
            inputMode='search'
            className={`
                w-full self-stretch bg-transparent
                text-base font-medium text-gray-900 dark:text-gray-100 
                placeholder-gray-400 outline-hidden
                [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden
                ${className}
              `}
          />
          {ghostText && (
            <div
              className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} flex items-center pointer-events-none overflow-hidden select-none`}
            >
              <span className='invisible whitespace-pre text-base font-medium'>{value}</span>
              <span
                className={`whitespace-pre text-base font-medium text-gray-300 dark:text-gray-600 ${isCapsLock ? 'uppercase' : ''}`}
              >
                {isCapsLock ? ghostText.toUpperCase() : ghostText}
              </span>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className='flex items-center gap-1.5 self-stretch ms-auto'>
            {activeGroups.map((groupId) => {
              const config = filterConfigs.find((c) => c.id === groupId);
              const values = activeFilters[groupId];

              if (!config || !values) return null;

              return (
                <FilterPill
                  key={groupId}
                  config={config}
                  selectedValues={values}
                  collapsed={shouldCollapse}
                  onUpdate={(newVals) => onUpdateFilter?.(groupId, newVals)}
                  onRemove={() => onUpdateFilter?.(groupId, [])}
                  rounded={rounded}
                />
              );
            })}
          </div>
        )}

        <div className='flex items-center gap-1.5 ms-auto self-stretch'>
          {filterConfigs.length > 0 && (
            <div
              className={`
              flex items-center h-8 px-1 ${rounded === 'full' ? 'rounded-full' : 'rounded-2xl'}
              border
              ${
                hasActiveFilters
                  ? 'border-gray-200 dark:border-(--border-divider) bg-white dark:bg-(--bg-surface-neutral) shadow-xs'
                  : 'border-transparent bg-transparent hover:border-gray-200 dark:hover:border-(--border-divider) hover:bg-gray-50 dark:hover:bg-(--bg-surface-neutral)'
              }
            `}
            >
              {hasActiveFilters && (
                <Tooltip content={t.global.table.clearAllFilters}>
                  <button
                    type='button'
                    onClick={handleClearAllFilters}
                    className='text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center w-7 h-7 rounded-full'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                      filter_list_off
                    </span>
                  </button>
                </Tooltip>
              )}

              <Tooltip content={t.global.table.addFilter}>
                <button
                  ref={filterButtonRef}
                  type='button'
                  onMouseEnter={handleOpenFilterMenu}
                  onMouseLeave={handleFilterMouseLeave}
                  onClick={handleOpenFilterMenu}
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-full
                    ${
                      hasActiveFilters
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                    tune
                  </span>
                </button>
              </Tooltip>
            </div>
          )}

          {(badge ||
            isLoading ||
            (resultsCount !== undefined && (value?.trim().length ?? 0) > 0)) && (
            <div className='pointer-events-none flex items-center ps-1 pe-0.5'>
              {badge || (
                <div className='flex items-center gap-2'>
                  {isLoading && (
                    <span className='w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin' />
                  )}
                  {!isLoading && resultsCount !== undefined && (
                    <span className='inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-(--bg-surface-neutral) text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-wider animate-in zoom-in duration-200'>
                      {resultsCount} {t.pos.resultsLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {showClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className='material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 outline-hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ms-1'
              style={{ fontSize: '20px' }}
              type='button'
            >
              close
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
