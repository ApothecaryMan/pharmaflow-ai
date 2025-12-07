import React from 'react';
import { useSmartDirection } from '../hooks/useSmartDirection';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onSearchChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string; // Additional classes for the input
  wrapperClassName?: string; // Additional classes for the wrapper
  icon?: string; // Custom icon name (default: 'search')
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onSearchChange,
  onClear,
  placeholder,
  className = '',
  wrapperClassName = '',
  icon = 'search',
  ...props
}) => {
  const dir = useSmartDirection(value);

  return (
    <div className={`relative ${wrapperClassName}`} dir={dir}>
      <span className="material-symbols-rounded absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">
        {icon}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ps-10 pe-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm ${className}`}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="material-symbols-rounded absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[18px] transition-colors outline-none"
        >
          close
        </button>
      )}
    </div>
  );
};
