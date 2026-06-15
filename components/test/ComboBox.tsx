import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useFilterDropdown } from '../../hooks/layout/useFilterDropdown';

export interface ComboBoxProps<T> {
  items: T[];
  selectedItem: T | undefined;
  isOpen?: boolean;
  onToggle?: () => void;
  onSelect: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  renderSelected: (item: T | undefined) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onEnter?: () => void;
  className?: string;
  color?: string;
  variant?: 'minimal' | 'input';
  minHeight?: string | number;
  style?: React.CSSProperties;
  disabled?: boolean;
  centered?: boolean;
  rounded?: 'xl' | 'full';
  hideArrow?: boolean;
  autoHideArrow?: boolean;
  onBackground?: boolean;
  dense?: boolean;
}

/**
 * ComboBox - A premium alternative combobox design with absolute positioning
 * and glassmorphic overlays. Fully compatible with FilterDropdown props.
 */
export function ComboBox<T>({
  items,
  selectedItem,
  isOpen,
  onToggle,
  onSelect,
  renderItem,
  renderSelected,
  keyExtractor,
  onEnter,
  className = '',
  color = 'primary',
  variant = 'input',
  minHeight,
  style,
  disabled = false,
  centered = false,
  rounded = 'xl',
  hideArrow = false,
  autoHideArrow = false,
  onBackground = false,
  dense = false,
}: ComboBoxProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isClickingRef = useRef(false);

  const handleMouseDown = () => {
    isClickingRef.current = true;
    setTimeout(() => {
      isClickingRef.current = false;
    }, 200);
  };

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = isOpen !== undefined && onToggle !== undefined;
  const effectiveIsOpen = isControlled ? isOpen : internalIsOpen;
  const handleToggle = isControlled ? onToggle : () => setInternalIsOpen((prev) => !prev);

  useEffect(() => {
    if (effectiveIsOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 250);
      return () => clearTimeout(timer);
    }
  }, [effectiveIsOpen]);

  useEffect(() => {
    if (!effectiveIsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isControlled) {
          onToggle();
        } else {
          setInternalIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [effectiveIsOpen, isControlled, onToggle]);

  const { handleKeyDown, handleBlur, handleClick, handleOptionClick } = useFilterDropdown({
    items,
    selectedItem,
    isOpen: effectiveIsOpen,
    onToggle: handleToggle,
    onSelect: onSelect,
    keyExtractor,
    onEnter,
  });

  const isSingle = items.length <= 1;
  const itemPaddingClasses = dense ? 'px-4 py-2.5' : 'px-6 py-4';
  const isMinimal = variant === 'minimal';

  // Clean Solid Styles
  const containerBorderRadius = rounded === 'full' ? '9999px' : '16px';
  const menuBorderRadius = '18px';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
      style={minHeight ? { ...style, height: minHeight, minHeight } : style}
    >
      {/* Trigger Button with a Clean Search/Input Aesthetic */}
      <button
        type='button'
        disabled={disabled}
        onClick={disabled ? undefined : handleClick}
        onKeyDown={disabled ? undefined : handleKeyDown}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
        className={`w-full flex items-center justify-between text-left outline-hidden transition-all duration-300 border
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${
            isMinimal
              ? 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
          }
        `}
        style={{
          borderRadius: containerBorderRadius,
          padding: dense ? '6px 12px' : '10px 16px',
          minHeight: minHeight || (dense ? '32px' : '42px'),
        }}
      >
        <div className='flex items-center gap-2.5 min-w-0 flex-1'>
          {/* Decorative Search/Filter left-side icon for input variant */}
          {!isMinimal && (
            <span className='material-symbols-rounded text-gray-400 dark:text-gray-500 text-[18px] shrink-0'>
              search
            </span>
          )}
          <div className='flex-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200'>
            {renderSelected(selectedItem)}
          </div>
        </div>

        {/* Action arrow indicator */}
        {!hideArrow && (
          <span
            className={`material-symbols-rounded text-gray-400 dark:text-gray-500 text-[20px] transition-transform duration-300 ml-2 shrink-0
              ${effectiveIsOpen ? 'rotate-180 text-gray-700 dark:text-gray-300' : ''}
            `}
          >
            unfold_more
          </span>
        )}
      </button>

      {/* Floating Dropdown List Overlay */}
      {(effectiveIsOpen || isAnimating) && (
        <div
          className={`absolute left-0 right-0 mt-2 z-50 overflow-hidden border border-gray-200 dark:border-gray-800
            bg-white dark:bg-gray-950
            transition-all duration-300 origin-top
            ${effectiveIsOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
          `}
          style={{
            borderRadius: menuBorderRadius,
            top: minHeight || (dense ? '32px' : '42px'),
          }}
        >
          {/* Scrollable list */}
          <div className='max-h-60 overflow-y-auto filter-dropdown-scroll p-3 space-y-2'>
            {isSingle ? (
              <div className='text-xs text-gray-400 dark:text-gray-500 text-center py-4'>
                No other items available
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem
                  ? keyExtractor(item) === keyExtractor(selectedItem)
                  : false;
                return (
                  <div
                    key={keyExtractor(item)}
                    onClick={(e) => handleOptionClick(e, item)}
                    className={`w-full text-left rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between
                      ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    style={{ padding: itemPaddingClasses }}
                  >
                    <div className='flex-1 min-w-0'>{renderItem(item, isSelected)}</div>
                    {isSelected && (
                      <span className='material-symbols-rounded text-gray-500 dark:text-gray-400 text-[18px] ml-2 shrink-0'>
                        check
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
