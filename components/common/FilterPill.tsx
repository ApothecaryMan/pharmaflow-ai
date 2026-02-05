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
}

interface FilterPillProps {
  config: FilterConfig;
  selectedValues: any[];
  onUpdate: (values: any[]) => void;
  onRemove: () => void;
  collapsed?: boolean;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  config,
  selectedValues,
  onUpdate,
  onRemove,
  collapsed = false,
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
        <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-gray-100 dark:border-gray-800 mb-1'>
          {config.label}
        </div>

        {config.options.map((option) => {
          const isSelected = selectedValues.includes(option.value);

          return (
            <ContextMenuCheckboxItem
              key={`${config.id}-${option.value}`}
              label={option.label}
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
          border border-gray-200 dark:border-gray-700
          bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-200 
          rounded-lg
          ${collapsed ? 'px-1.5 py-1.5' : 'ps-2 pe-1 py-1'}
          active:scale-95
        `}
      >
        {/* Icon */}
        <span
          className={`material-symbols-rounded ${collapsed ? 'text-[18px]' : 'text-[16px] opacity-70'}`}
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

        {/* Remove Button */}
        <div
          role='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            flex items-center justify-center rounded-md 
            bg-gray-100 dark:bg-gray-700
            hover:bg-gray-200 dark:hover:bg-gray-600 
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
            transition-colors
            ${collapsed ? 'w-3 h-3 -mt-3 -mr-1' : 'w-4 h-4 ml-0.5'}
          `}
        >
          <span className='material-symbols-rounded text-[14px] font-bold'>close</span>
        </div>
      </div>
    </Tooltip>
  );
};
