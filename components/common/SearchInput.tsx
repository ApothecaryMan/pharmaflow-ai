import React, { forwardRef } from 'react';
import { useSmartDirection } from './SmartInputs';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onSearchChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string; // Additional classes for the input
  wrapperClassName?: string; // Additional classes for the wrapper
  icon?: string; // Custom icon name (default: 'search')
  badge?: React.ReactNode; // Optional badge/content to display on the right
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onSearchChange,
  onClear,
  placeholder,
  className = '',
  wrapperClassName = '',
  icon = 'search',
  badge,
  ...props
}, ref) => {
  const dir = useSmartDirection(value, placeholder);
  const showClear = value && onClear;
  const isRtl = dir === 'rtl';

  return (
    <div className={`relative ${wrapperClassName}`} dir={dir}>
      <span className={`material-symbols-rounded absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px] ${isRtl ? 'right-3' : 'left-3'}`}>
        {icon}
      </span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${showClear ? (isRtl ? 'pl-16' : 'pr-16') : ''} py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm ${className}`}
        {...props}
      />
      
      {/* Badge & Clear Button Group */}
      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 ${isRtl ? 'left-3' : 'right-3'}`}>
        {badge && (
           <div className="pointer-events-none">
             {badge}
           </div>
        )}
        
        {showClear && (
          <button
            onClick={onClear}
            className="material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[18px] transition-colors outline-none flex items-center justify-center p-0.5"
          >
            close
          </button>
        )}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
