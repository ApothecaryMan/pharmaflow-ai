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
  const { showMenu, hideMenu, isMouseOverMenu } = useContextMenu();
  const pillRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- SMART GROUPING LOGIC ---
  // Helper to get labels for selected values
  const getSelectedLabels = () => {
    return selectedValues
      .map((val) => config.options.find((opt) => opt.value === val)?.label)
      .filter(Boolean)
      .join(', ');
  };

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear any pending close timeout
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);

    const menuContent = (
      <div 
        className='font-sans'
        onMouseEnter={() => {
          if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        }}
        onMouseLeave={() => {
          leaveTimeoutRef.current = setTimeout(() => {
            hideMenu();
          }, 150);
        }}
      >
        <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-(--border-divider) mb-1'>
          {config.label}
        </div>

        {config.options.map((option) => {
          const isSelected = selectedValues.includes(option.value);

          let isDefault = config.defaultValue !== undefined && config.defaultValue === option.value;
          
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

                if (config.mode === 'single') {
                  if (checked) {
                    newValues = [option.value];
                  } else {
                    newValues = [];
                  }
                }
                else {
                  if (checked) {
                    newValues.push(option.value);
                  } else {
                    newValues = newValues.filter((v) => v !== option.value);
                  }
                }

                onUpdate(newValues);
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

  const handleMouseLeave = () => {
    // Set a small delay to allow moving to the menu
    leaveTimeoutRef.current = setTimeout(() => {
      // If we are not over the menu, close it
      // Using a ref or checking state would be better, but we only have access to isMouseOverMenu via context
      // which is reactive. The timeout should be enough to capture the latest state.
      if (!isMouseOverMenu) {
        hideMenu();
      }
    }, 150);
  };

  // Content for Tooltip (Full Details) - Keeping for potential reuse, but it's not in the render now
  const tooltipContent = (
    <div className='flex flex-col gap-0.5'>
      <span className='font-bold text-gray-300'>{config.label}</span>
      <span className='opacity-90'>{getSelectedLabels() || 'None'}</span>
    </div>
  );

  // Render
  return (
    <div
      ref={pillRef}
      onMouseEnter={handleOpenMenu}
      onMouseLeave={handleMouseLeave}
      onClick={handleOpenMenu}
      className={`
        flex items-center gap-1.5 
        leading-none select-none cursor-pointer
        border border-(--border-divider)
        bg-(--bg-surface-neutral) hover:bg-(--bg-menu-hover)
        text-gray-700 dark:text-white 
        rounded-full
        ${collapsed ? 'ps-1.5 pe-1 py-1' : 'ps-2 pe-1 py-1'}
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
          <span className='opacity-50 me-1'>{config.label}:</span><span
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
          ${collapsed ? 'w-4 h-4 ml-0.5' : 'w-4 h-4 ml-0.5'}
        `}
      >
        <span className='material-symbols-rounded font-bold' style={{ fontSize: 'var(--icon-sm)' }}>
          close
        </span>
      </div>
    </div>
  );
};
