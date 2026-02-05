import type React from 'react';
import { forwardRef, useState } from 'react';
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
  icon?: string;
  badge?: React.ReactNode;
  rounded?: 'xl' | 'full';
  color?: string;

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
      color = 'blue',

      filterConfigs = [],
      activeFilters = {},
      onUpdateFilter,
      ...props
    },
    ref
  ) => {
    const { language } = useSettings();
    const t = TRANSLATIONS[language];
    const dir = useSmartDirection(value, placeholder);
    const showClear = value && onClear;
    const { showMenu, hideMenu } = useContextMenu();

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
      if (config.options.length > 0 && onUpdateFilter) {
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

    return (
      <div
        className={`
            relative flex items-center flex-wrap gap-2
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-800
            transition-colors
            focus-within:border-${color}-500 dark:focus-within:border-${color}-400
            ${rounded === 'full' ? 'rounded-[2rem] px-3' : 'rounded-xl px-3'} 
            ${wrapperClassName}
         `}
        dir={dir}
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
        <div className='flex items-center text-gray-400 select-none'>
          <span className='material-symbols-rounded text-[18px]'>{icon}</span>
        </div>

        {/* The Actual Input */}
        <input
          ref={ref}
          type='text'
          value={value}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={hasActiveFilters ? placeholder?.split(',')[0] + '...' : placeholder}
          spellCheck='false'
          className={`
            flex-1 min-w-[80px] bg-transparent
            text-sm text-gray-900 dark:text-gray-100 
            placeholder-gray-400 outline-none
            py-2.5
            ${hasActiveFilters ? 'ms-1' : 'ms-2'}
            ${className}
          `}
          {...props}
        />

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
              />
            );
          })}

        {/* Actions Group */}
        <div className='flex items-center gap-1.5 ms-auto'>
          {/* Clear Text Button - Only show if NO active filters and has value */}
          {showClear && !hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className='material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[18px] transition-colors outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700'
            >
              close
            </button>
          )}

          {/* Add Filter Button */}
          {filterConfigs.length > 0 && (
            <div className='border-s border-gray-200 dark:border-gray-700 ps-2 ms-2 flex items-center'>
              <Tooltip content={t.global.table.addFilter}>
                <button
                  type='button'
                  onClick={handleFilterClick}
                  className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors leading-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                >
                  <span className='material-symbols-rounded text-[20px]'>tune</span>
                </button>
              </Tooltip>
            </div>
          )}

          {badge && <div className='pointer-events-none flex items-center ps-1'>{badge}</div>}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
