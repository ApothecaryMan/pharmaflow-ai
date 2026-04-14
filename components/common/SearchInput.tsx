import React, { forwardRef, useState, useEffect, useMemo, useRef } from 'react';
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
    const { showMenu, hideMenu, isMouseOverMenu } = useContextMenu();
    const filterButtonRef = useRef<HTMLButtonElement>(null);
    const filterLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      if (config.options.length > 0 && typeof onUpdateFilter === 'function') {
        onUpdateFilter(config.id, [config.options[0].value]);
      }
      hideMenu();
    };

    const handleClearAllFilters = () => {
      activeGroups.forEach((gid) => onUpdateFilter && onUpdateFilter(gid, []));
      hideMenu();
    };

    const handleOpenFilterMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      
      if (filterLeaveTimeoutRef.current) clearTimeout(filterLeaveTimeoutRef.current);

      const menuContent = (
        <div 
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

    return (
      <div
        className={`
            relative flex items-center flex-wrap gap-2
            bg-(--bg-input)
            border-2 dark:border border-(--border-search)
            transition-colors duration-0
            ${isFocused ? 'border-gray-400 dark:border-gray-500 shadow-sm' : ''}
            ${rounded === 'full' ? 'rounded-full ps-4 pe-2' : 'rounded-3xl ps-4 pe-2'} 
            h-12
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
      >
        <div className={`
          flex items-center h-full select-none transition-all duration-200
          ${isFocused ? 'text-black dark:text-white' : 'text-gray-400'}
        `}>
          {/* leading icon removed ps-3 since wrapper has ps-3 */}
          {typeof icon === 'string' ? (
            <span 
              className='material-symbols-rounded' 
              style={{ 
                fontSize: '22px',
                fontVariationSettings: isFocused ? "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
              }}
            >
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>

        <div className={`
             relative flex-1 h-full flex items-center
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
                w-full h-full bg-transparent
                text-sm text-gray-900 dark:text-gray-100 
                placeholder-gray-400 outline-hidden
                ${className}
              `}
            />
            {ghostText && (
                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} flex items-center pointer-events-none overflow-hidden select-none`}>
                    <span className="invisible whitespace-pre text-sm">{value}</span>
                    <span className={`
                        inline-flex items-center px-1.5 py-0.5 ms-1
                        rounded-lg 
                        bg-gray-100 dark:bg-(--bg-surface-neutral) 
                        text-[12px] font-black tracking-tight
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

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 h-full">
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
                  onUpdate={(newVals) => onUpdateFilter && onUpdateFilter(groupId, newVals)}
                  onRemove={() => onUpdateFilter && onUpdateFilter(groupId, [])}
                  rounded={rounded}
                />
              );
            })}
          </div>
        )}

        <div className='flex items-center gap-1.5 ms-auto h-full'>
          {showClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className='material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors outline-hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700'
              style={{ fontSize: '20px' }}
            >
              close
            </button>
          )}

          {filterConfigs.length > 0 && (
            <div className={`
              flex items-center h-8 px-1 ${rounded === 'full' ? 'rounded-full' : 'rounded-2xl'}
              border transition-all duration-300
              ${
                hasActiveFilters
                  ? 'border-gray-200 dark:border-(--border-divider) bg-white dark:bg-(--bg-surface-neutral) shadow-xs'
                  : 'border-transparent bg-transparent hover:border-gray-200 dark:hover:border-(--border-divider) hover:bg-gray-50 dark:hover:bg-(--bg-surface-neutral)'
              }
            `}>
              {hasActiveFilters && (
                <Tooltip content={t.global.table.clearAllFilters}>
                  <button
                    type='button'
                    onClick={handleClearAllFilters}
                    className='text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center w-7 h-7 transition-colors rounded-full'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>filter_list_off</span>
                  </button>
                </Tooltip>
              )}

              <Tooltip content={t.global.table.addFilter}>
                <button
                  ref={filterButtonRef}
                  type='button'
                  onMouseEnter={handleOpenFilterMenu}
                  onMouseLeave={handleFilterMouseLeave}
                  className={`
                    flex items-center justify-center w-7 h-7 transition-all duration-300 rounded-full
                    ${hasActiveFilters 
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
                  `}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>tune</span>
                </button>
              </Tooltip>
            </div>
          )}

          {badge && <div className='pointer-events-none flex items-center px-1'>{badge}</div>}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
