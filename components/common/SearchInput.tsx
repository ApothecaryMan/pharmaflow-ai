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
  rounded?: 'xl' | 'full'; // Border radius variant
  color?: string; // Theme color (default: 'blue')
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
  rounded = 'xl',
  color = 'blue',
  ...props
}, ref) => {
  const dir = useSmartDirection(value, placeholder);
  const showClear = value && onClear;
  const isRtl = dir === 'rtl';

  return (
    <div className={`relative ${wrapperClassName}`} dir={dir}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        spellCheck="false"
        className={`
          w-full ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'} 
          ${showClear ? (isRtl ? 'pl-16' : 'pr-16') : ''} 
          py-2.5 ${rounded === 'full' ? 'rounded-full' : 'rounded-xl'} 
          
          /* Border & Background */
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-800
          
          /* Hover State - Subtle border adjustment */
          hover:border-gray-300 dark:hover:border-gray-700
          
          /* Focus State - Sharp theme border, no glow */
          focus:border-${color}-500 dark:focus:border-${color}-400
          focus:hover:border-${color}-500 dark:focus:hover:border-${color}-400
          focus:ring-0 outline-none
          
          text-sm 
          text-gray-900 dark:text-gray-100 
          placeholder-gray-400 shadow-sm ${className}
        `}
        {...props}
      />

      {/* Leading Icon */}
      <div className={`absolute inset-y-0 flex items-center pointer-events-none text-gray-400 ${isRtl ? 'right-3' : 'left-3'} z-10`}>
        <span className="material-symbols-rounded text-[18px]">
          {icon}
        </span>
      </div>
      
      {/* Badge & Clear Button Group */}
      <div className={`absolute inset-y-0 flex items-center gap-2 ${isRtl ? 'left-3' : 'right-3'}`}>
        {badge && (
           <div className="pointer-events-none flex items-center h-full">
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
