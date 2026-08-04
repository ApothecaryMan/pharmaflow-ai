import React from 'react';
import { useTypography } from '../../context/TypographyContext';

export interface SearchDropdownColumn<T> {
  header: string;
  width?: string;
  className?: string; // For additional styling like text-center
  render: (item: T) => React.ReactNode;
}

interface SearchDropdownProps<T extends { id: string | number }> {
  results: T[];
  onSelect: (item: T) => void;
  columns: SearchDropdownColumn<T>[];
  emptyMessage?: React.ReactNode;
  isVisible?: boolean; // Controlled visibility
  highlightedIndex?: number; // Index of the currently highlighted result
  className?: string; // Custom class for the dropdown container
}

export function SearchDropdown<T extends { id: string | number }>({
  results,
  onSelect,
  columns,
  emptyMessage = 'No results found',
  isVisible = true,
  highlightedIndex = -1,
  className = 'left-0 right-0',
}: SearchDropdownProps<T>) {
  const { language } = useTypography();
  const isAR = language === 'AR';
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [edgeFades, setEdgeFades] = React.useState({ top: false, bottom: false });

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && rowRefs.current[highlightedIndex]) {
      rowRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  const updateEdgeFades = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdgeFades({
      top: scrollTop > 2,
      bottom: scrollHeight - scrollTop - clientHeight > 2,
    });
  }, []);

  React.useEffect(() => {
    if (results.length > 0) updateEdgeFades(scrollContainerRef.current);
  }, [results.length, updateEdgeFades]);

  if (!isVisible) return null;

  if (results.length === 0) {
    return (
      <div
        className={`absolute top-full mt-1.5 bg-white dark:bg-(--bg-card) rounded-xl shadow-xl border border-gray-100 dark:border-(--border-divider) py-5 px-6 text-center text-sm z-50 flex flex-col items-center gap-1.5 ${className}`}
      >
        <span className='inline-block h-1 w-8 rounded-full bg-gray-200 dark:bg-(--border-divider)' />
        <p className='text-gray-500 dark:text-gray-400'>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`absolute top-full mt-1.5 bg-white dark:bg-(--bg-card) rounded-xl shadow-xl border border-gray-100 dark:border-(--border-divider) overflow-hidden isolate z-40 ${className}`}
    >
      {/* Fixed Header Row */}
      <div className='flex items-stretch w-full bg-gray-50/95 dark:bg-(--bg-card) backdrop-blur-xs border-b border-gray-100 dark:border-(--border-divider) text-[10px] font-bold uppercase tracking-wider text-gray-400 rounded-t-xl'>
        {columns.map((col, index) => {
          const headerLower = String(col.header || '').toLowerCase();
          const isNameCol = ['name', 'الاسم', 'المنتج', 'product'].some((k) =>
            headerLower.includes(k)
          );
          const headerAlignClass = isNameCol
            ? isAR
              ? 'justify-end text-end'
              : 'justify-start text-start'
            : '';

          return (
            <div
              key={col.header || `col-${index}`}
              className={`${col.width || 'flex-1'} p-2 border-e border-gray-100 dark:border-(--border-divider) last:border-e-0 flex items-center ${headerAlignClass} ${col.className || ''}`}
            >
              {col.header}
            </div>
          );
        })}
      </div>

      {/* Scrollable Data Rows Area */}
      <div className="relative w-full">
        {/* Top edge fade */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-3 z-20 bg-gradient-to-b from-white/95 to-white/0 dark:from-(--bg-card)/95 dark:to-(--bg-card)/0 transition-opacity duration-150 ${
            edgeFades.top ? 'opacity-100' : 'opacity-0'
          }`}
        />
        
        <div
          ref={scrollContainerRef}
          onScroll={(e) => updateEdgeFades(e.currentTarget)}
          className='max-h-[340px] overflow-y-auto overflow-x-hidden scrollbar-hide'
        >
          {results.map((item, index) => (
            <button
              key={item.id}
              type='button'
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              onClick={() => onSelect(item)}
              className={`relative w-full text-start border-b border-gray-50 dark:border-(--border-divider) last:border-0 transition-colors group ${
                highlightedIndex === index
                  ? 'bg-primary-50/60 dark:bg-primary-900/25'
                  : 'hover:bg-gray-50 dark:hover:bg-(--bg-hover)'
              }`}
            >
              {/* Highlight accent bar */}
              <span
                className={`pointer-events-none absolute inset-y-0 start-0 w-0.5 transition-colors ${
                  highlightedIndex === index ? 'bg-primary-500 dark:bg-primary-400' : 'bg-transparent'
                }`}
              />
              <div className='flex items-stretch w-full text-sm text-gray-600 dark:text-white'>
                {columns.map((col, colIndex) => {
                  const headerLower = String(col.header || '').toLowerCase();
                  const isNameCol = ['name', 'الاسم', 'المنتج', 'product'].some((k) =>
                    headerLower.includes(k)
                  );
                  const cellAlignClass = isNameCol
                    ? 'justify-start text-start'
                    : col.className?.includes('center')
                      ? 'justify-center text-center'
                      : '';

                  return (
                    <div
                      key={col.header || `cell-${colIndex}`}
                      className={`${col.width || 'flex-1'} min-w-0 py-1.5 px-3 border-e border-gray-100/80 dark:border-(--border-divider) last:border-e-0 flex items-center overflow-hidden ${cellAlignClass} ${col.className || ''}`}
                    >
                      <div
                        dir={isNameCol ? 'ltr' : undefined}
                        className='w-full min-w-0 flex items-center justify-start truncate'
                      >
                        {col.render(item)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
          ))}
        </div>

        {/* Bottom edge fade */}
        <div
          className={`pointer-events-none absolute bottom-0 inset-x-0 h-3 z-20 bg-gradient-to-t from-white to-white/0 dark:from-(--bg-card) dark:to-(--bg-card)/0 transition-opacity duration-150 ${
            edgeFades.bottom ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Footer Hint Bar */}
      <div className='flex items-center justify-between px-3 py-1.5 bg-gray-50/80 dark:bg-(--bg-card) border-t border-gray-100 dark:border-(--border-divider) text-[10px] text-gray-400 rounded-b-xl'>
        <span className='font-medium'>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </span>
        <span className='flex items-center gap-2'>
          <span className='flex items-center gap-1'>
            <kbd className='px-1 rounded bg-gray-200 dark:bg-(--border-divider)'>↑</kbd>
            <kbd className='px-1 rounded bg-gray-200 dark:bg-(--border-divider)'>↓</kbd> nav
          </span>
          <span className='flex items-center gap-1'>
            <kbd className='px-1 rounded bg-gray-200 dark:bg-(--border-divider)'>Enter</kbd> select
          </span>
          <span className='flex items-center gap-1'>
            <kbd className='px-1 rounded bg-gray-200 dark:bg-(--border-divider)'>Esc</kbd> close
          </span>
        </span>
      </div>
    </div>
  );
}

export function useSearchKeyboardNavigation<T>({
  results,
  onSelect,
  onClose,
  isOpen = true,
  onEnterNoHighlight,
}: {
  results: T[];
  onSelect: (item: T) => void;
  onClose?: () => void;
  isOpen?: boolean;
  onEnterNoHighlight?: () => void;
}) {
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  // Reset highlighted index when results or visibility changes
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, []);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onSelect(results[highlightedIndex]);
        } else if (onEnterNoHighlight) {
          onEnterNoHighlight();
        }
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    },
    [isOpen, results, highlightedIndex, onSelect, onEnterNoHighlight, onClose]
  );

  return React.useMemo(
    () => ({ highlightedIndex, onKeyDown, setHighlightedIndex }),
    [highlightedIndex, onKeyDown]
  );
}
