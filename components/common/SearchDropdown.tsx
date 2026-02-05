import React from 'react';

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
}

export function SearchDropdown<T extends { id: string | number }>({
  results,
  onSelect,
  columns,
  emptyMessage = 'No results found',
  isVisible = true,
  highlightedIndex = -1,
}: SearchDropdownProps<T>) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && rowRefs.current[highlightedIndex]) {
      rowRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  if (!isVisible) return null;

  if (results.length === 0) {
    return (
      <div className='absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-4 text-center text-gray-500 text-sm z-50'>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className='absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[400px] overflow-y-auto ring-1 ring-black/5 dark:ring-white/5 z-50'
    >
      {/* Header Row */}
      <div className='flex items-stretch w-full bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400'>
        {columns.map((col, index) => (
          <div
            key={index}
            className={`${col.width || 'flex-1'} p-2 border-r border-gray-100 dark:border-gray-800 last:border-0 ${col.className || ''}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Data Rows */}
      {results.map((item, index) => (
        <button
          key={item.id}
          type='button'
          ref={(el) => (rowRefs.current[index] = el)}
          onClick={() => onSelect(item)}
          className={`w-full text-start border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors group ${
            highlightedIndex === index
              ? 'bg-blue-50/50 dark:bg-blue-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <div className='flex items-stretch w-full text-sm text-gray-500 dark:text-gray-400'>
            {columns.map((col, colIndex) => (
              <div
                key={colIndex}
                className={`${col.width || 'flex-1'} p-3 border-r border-gray-100 dark:border-gray-800 last:border-0 flex items-center ${col.className || ''}`}
              >
                {col.render(item)}
              </div>
            ))}
          </div>
        </button>
      ))}
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
  }, [results, isOpen]);

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
