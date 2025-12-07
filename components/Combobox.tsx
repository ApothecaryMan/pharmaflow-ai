import React, { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string; // Optional label if you want it inside the component, but usually handled outside
  className?: string;
  allowCustom?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  allowCustom = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  // If allowCustom is true, we don't strictly limit to the list, but we still show matches
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync search term with value when value changes externally or on selection
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If closed and not allowing custom, revert to value if search term is invalid?
        // For now, let's just leave it. If allowCustom is false, we might want to enforce selection.
        if (!allowCustom && !options.includes(searchTerm) && searchTerm !== '') {
             // Optional: Revert to previous valid value or clear if invalid
             // For this specific use case (Category/Dosage), we might want to allow new categories?
             // The prompt implied "custom input (optional)".
             // If allowCustom is false, we should probably revert to 'value' prop if the current text isn't a match.
             if (value) setSearchTerm(value);
             else setSearchTerm('');
        } else if (allowCustom && searchTerm !== value) {
            onChange(searchTerm);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustom, options, searchTerm, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        selectOption(filteredOptions[highlightedIndex]);
      } else if (allowCustom) {
          onChange(searchTerm);
          setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const selectOption = (option: string) => {
    onChange(option);
    setSearchTerm(option);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm pr-8"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
            if (allowCustom) {
                onChange(e.target.value);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <span className="material-symbols-rounded text-[20px]">unfold_more</span>
        </div>
      </div>

      {isOpen && (filteredOptions.length > 0 || allowCustom) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  index === highlightedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option}
              </div>
            ))
          ) : allowCustom ? (
             <div className="px-3 py-2 text-sm text-gray-500 italic">
                Press Enter to add "{searchTerm}"
             </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};
