import type React from 'react';
import { useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';
import {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  useContextMenu,
} from './ContextMenu';
import { Tooltip } from './Tooltip';

export interface FilterOption {
  value: any;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multiple';
  options: FilterOption[];
  defaultValue?: any;
}

interface FilterPillProps {
  config: FilterConfig;
  selectedValues: any[];
  onUpdate: (values: any[]) => void;
  onRemove: () => void;
  collapsed?: boolean;
  rounded?: 'xl' | 'full';
}

export const FilterPill: React.FC<FilterPillProps> = ({
  config,
  selectedValues,
  onUpdate,
  onRemove,
  collapsed = false,
  rounded = 'full',
}) => {
  const { language } = useSettings();
  const t = TRANSLATIONS[language];
  const { showMenu, hideMenu } = useContextMenu();
  const pillRef = useRef<HTMLDivElement>(null);

  // Helper to get labels for selected values
  const getSelectedLabels = () => {
    return selectedValues
      .map((val) => config.options.find((opt) => opt.value === val)?.label)
      .filter(Boolean)
      .join(', ');
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // SMART GROUPING LOGIC
    // 1. One Pill per Group
    // 2. Single/Multi Mode Enforcement
    // 3. Smart 'All' Handling (implied by logic below)

    const menuContent = (
      <div className='font-sans'>
        <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-(--border-divider) mb-1'>
          {config.label}
        </div>

        {config.options.map((option) => {
          const isSelected = selectedValues.includes(option.value);

          let isDefault = config.defaultValue !== undefined && config.defaultValue === option.value;
          
          // Allow label to be just text or text + badge
          const labelContent = (
              <div className="flex items-center gap-2">
                  <span>{option.label}</span>
                  {isDefault && (
                       <span className="inline-flex items-center px-1 py-0 rounded-sm border border-(--border-divider) text-gray-500 dark:text-gray-400 text-[9px] font-semibold uppercase tracking-wider bg-(--bg-surface-neutral) leading-none h-4">
                          DEF
                       </span>
                  )}
              </div>
          );

          return (
            <ContextMenuCheckboxItem
              key={`${config.id}-${option.value}`}
              label={labelContent}
              checked={isSelected}
              onCheckedChange={(checked) => {
                let newValues = [...selectedValues];

                // Single Select Mode Logic
                if (config.mode === 'single') {
                  // If turning on, it replaces everything. If off, it's empty (or default handled by parent)
                  if (checked) {
                    newValues = [option.value];
                  } else {
                    newValues = []; // Allow deselecting in single mode? usually yes.
                  }
                }
                // Multi Select Mode Logic
                else {
                  if (checked) {
                    newValues.push(option.value);
                  } else {
                    newValues = newValues.filter((v) => v !== option.value);
                  }
                }

                // Parent handles "Smart All" logic if needed (e.g. if empty -> default to All, or specific All value)
                onUpdate(newValues);

                // Close menu after selection as per user request
                hideMenu();
              }}
            />
          );
        })}

        <ContextMenuSeparator />

        <ContextMenuItem
          label={t.global.table.clearFilter}
          icon='close'
          danger
          onClick={() => {
            onRemove();
            hideMenu();
          }}
        />
      </div>
    );

    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      showMenu(rect.left, rect.bottom + 5, menuContent);
    }
  };

  // Content for Tooltip (Full Details)
  const tooltipContent = (
    <div className='flex flex-col gap-0.5'>
      <span className='font-bold text-gray-300'>{config.label}</span>
      <span className='opacity-90'>{getSelectedLabels() || 'None'}</span>
    </div>
  );

  // Render
  return (
    <Tooltip content={tooltipContent} delay={500} triggerClassName='block'>
      <div
        ref={pillRef}
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 
          leading-none select-none cursor-pointer transition-all duration-200
          border border-(--border-divider)
          bg-(--bg-surface-neutral) hover:bg-(--bg-menu-hover)
          text-gray-700 dark:text-white 
          rounded-full
          ${collapsed ? 'ps-1.5 pe-1 py-1' : 'ps-2 pe-1 py-1'}
          active:scale-95
        `}
      >
        {/* Icon */}
        <span
          className={`material-symbols-rounded ${collapsed ? '' : 'opacity-70'}`}
          style={{ fontSize: collapsed ? 'var(--icon-navbar-dropdown)' : 'var(--icon-base)' }}
        >
          {config.icon}
        </span>

        {/* Text Content (Hidden if collapsed) */}
        {!collapsed && (
          <span className='text-xs font-medium whitespace-nowrap max-w-[150px] truncate'>
            <span className='opacity-50 mr-1'>{config.label}:</span>
            <span
              className={config.mode === 'single' ? 'text-emerald-600 dark:text-emerald-400' : ''}
            >
              {selectedValues.length > 2
                ? `${selectedValues.length} ${t.global.table.selectedCount}`
                : getSelectedLabels()}
            </span>
          </span>
        )}

        <div
          role='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            flex items-center justify-center
            text-gray-400 hover:text-red-500 dark:hover:text-red-400
            transition-all duration-200
            ${collapsed ? 'w-4 h-4 ml-0.5' : 'w-4 h-4 ml-0.5'}
            active:scale-75
          `}
        >
          <span className='material-symbols-rounded font-bold' style={{ fontSize: 'var(--icon-sm)' }}>
            close
          </span>
        </div>
      </div>
    </Tooltip>
  );
};
