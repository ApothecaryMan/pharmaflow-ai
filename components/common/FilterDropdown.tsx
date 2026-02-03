import React, { useEffect, useRef, useState } from 'react';
// FilterDropdown Component
import { useFilterDropdown } from '../../hooks/useFilterDropdown';

export interface FilterDropdownProps<T> {
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
  transparentIfSingle?: boolean;
  color?: string;
  variant?: 'minimal' | 'input';
  minHeight?: string | number;
  style?: React.CSSProperties;
  disabled?: boolean;
  centered?: boolean;
  rounded?: 'xl' | 'full';
  zIndexHigh?: string;
  /**
   * When true, wraps the dropdown in a fixed-height container with absolute positioning.
   * This makes it float over content instead of pushing sibling elements down.
   * Useful for toolbars and filter bars.
   */
  floating?: boolean;
  /** If true, the arrow icon will be hidden. */
  hideArrow?: boolean;
  /** If true, hides the arrow automatically if the rendered text is long (string length > 4). */
  autoHideArrow?: boolean;
  /**
   * NEW: If true, the dropdown is placed directly on the page background (e.g. gray toolbar).
   * It swaps the colors: use "open" color for closed state and vice versa.
   */
  onBackground?: boolean;
}

/**
 * FilterDropdown - A generic dropdown/combobox component.
 */
export function FilterDropdown<T>({
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
  transparentIfSingle = false,
  color = 'blue',
  variant = 'minimal',
  minHeight,
  style,
  disabled = false,
  centered = false,
  rounded = 'xl',
  zIndexHigh = 'z-40',
  floating = false,
  hideArrow = false,
  autoHideArrow = false,
  onBackground = false,
}: FilterDropdownProps<T>) {
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
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [effectiveIsOpen]);

  const handleFocus = (e: React.FocusEvent) => {
    if (!isClickingRef.current && !effectiveIsOpen && !disabled) {
      handleToggle();
    }
  };

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
    onSelect: (item) => {
      onSelect(item);
      if (!isControlled) setInternalIsOpen(false);
    },
    keyExtractor,
    onEnter,
  });

  const isSingle = items.length <= 1;
  const isTransparent = transparentIfSingle && isSingle;
  const isInput = variant === 'input';
  const itemPaddingClasses = 'px-3 py-1';

  // Design Tokens & Variable Inversion
  const bgClosed = onBackground
    ? 'var(--bg-closed)'
    : isInput
      ? 'var(--bg-input)'
      : isTransparent
        ? 'transparent'
        : 'var(--bg-active)';
  const bgOpen = 'var(--bg-active)';
  const currentBg = effectiveIsOpen ? bgOpen : bgClosed;
  const currentBorder =
    onBackground || effectiveIsOpen || isInput || !isTransparent
      ? 'var(--border-gray)'
      : 'transparent';

  const outerClasses = `relative inline-block ${className}`;
  const outerStyle = floating && minHeight ? { ...style, height: minHeight, minHeight } : style;

  const innerClasses = `relative w-full flex flex-col overflow-hidden border transition-all duration-300 outline-none
                    ${rounded === 'full' ? 'rounded-[20px]' : 'rounded-xl'}
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                    ${effectiveIsOpen || isAnimating ? zIndexHigh : 'z-0'}
                    ${onBackground ? 'shadow-sm' : ''}
                    motion-safe:transition-all motion-reduce:transition-none
                    ${floating ? 'absolute top-0 left-0' : ''}
                `;

  return (
    <div ref={containerRef} className={outerClasses} style={outerStyle}>
      <style>{`
                :root {
                    --bg-active: white;
                    --bg-closed: white;
                    --bg-input: #f9fafb;
                    --border-gray: #e5e7eb; /* gray-200 */
                }
                .dark {
                    --bg-active: #1f2937; /* gray-800 */
                    --bg-closed: #111827; /* gray-900 */
                    --bg-input: #1f2937;
                    --border-gray: #1f2937; /* gray-800 - match table/input */
                }
                .filter-dropdown-scroll::-webkit-scrollbar { width: 2px; background: transparent; }
                .filter-dropdown-scroll::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.6); border-radius: 9999px; }
            `}</style>
      <div
        tabIndex={disabled ? -1 : 0}
        onKeyDown={disabled ? undefined : handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onMouseDown={handleMouseDown}
        className={innerClasses}
        style={{
          backgroundColor: currentBg,
          borderColor: effectiveIsOpen ? `var(--color-${color}-500)` : currentBorder,
          willChange: isAnimating ? 'grid-template-rows, background-color, border-color' : 'auto',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={disabled ? undefined : handleClick}
      >
        {/* Trigger Area */}
        <div
          className={`w-full flex items-center ${
            isInput
              ? `justify-between ${onBackground ? 'px-3 py-[9px]' : itemPaddingClasses}`
              : `justify-center items-center ${itemPaddingClasses}`
          }`}
          style={isInput ? { minHeight: minHeight || (onBackground ? '42px' : '40px') } : {}}
        >
          {isInput ? (
            <>
              <div className='flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200'>
                {renderSelected(selectedItem)}
              </div>
              {!(
                hideArrow ||
                (autoHideArrow &&
                  (() => {
                    const findText = (node: any): string => {
                      if (typeof node === 'string' || typeof node === 'number') return String(node);
                      if (!node) return '';
                      if (React.isValidElement(node)) {
                        const children = (node.props as any).children;
                        return Array.isArray(children)
                          ? children.map(findText).join('')
                          : findText(children);
                      }
                      return Array.isArray(node) ? node.map(findText).join('') : '';
                    };
                    return findText(renderSelected(selectedItem)).length > 3;
                  })())
              ) && (
                <span className='material-symbols-rounded text-gray-400 text-[20px] ml-1 shrink-0'>
                  expand_more
                </span>
              )}
            </>
          ) : (
            renderSelected(selectedItem)
          )}
        </div>

        {/* Dropdown Menu Container */}
        <div
          className='w-full overflow-hidden transition-all duration-300'
          style={{
            display: 'grid',
            gridTemplateRows: effectiveIsOpen ? '1fr' : '0fr',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className='min-h-0 overflow-hidden'>
            <div
              className={`filter-dropdown-scroll border-t border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto ${effectiveIsOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            >
              {items
                .filter(
                  (item) => keyExtractor(item) !== (selectedItem ? keyExtractor(selectedItem) : '')
                )
                .map((item) => (
                  <div
                    key={keyExtractor(item)}
                    className='w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1 transition-colors'
                    onClick={(e) => handleOptionClick(e, item)}
                  >
                    {renderItem(item, false)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
