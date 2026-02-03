import type React from 'react';

export interface SearchDropdownColumn<T> {
  header: string;
  width?: string;
  className?: string; // For additional styling like text-center
  render: (item: T) => React.ReactNode;
}

interface SearchDropdownProps<T> {
  results: T[];
  onSelect: (item: T) => void;
  columns: SearchDropdownColumn<T>[];
  emptyMessage?: string;
  isVisible?: boolean; // Controlled visibility
}

export const SearchDropdown = <T extends { id: string | number }>({
  results,
  onSelect,
  columns,
  emptyMessage = 'No results found',
  isVisible = true,
}: SearchDropdownProps<T>) => {
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
      className='absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[400px] overflow-y-auto ring-1 ring-black/5 dark:ring-white/5 z-50 overflow-hidden'
      dir='ltr'
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
      {results.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className='w-full text-start hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors group'
        >
          <div className='flex items-stretch w-full text-sm text-gray-500 dark:text-gray-400'>
            {columns.map((col, index) => (
              <div
                key={index}
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
};
