import React, { InputHTMLAttributes, useState, useEffect, useRef, useMemo } from 'react';

/**
 * @module SmartInputs
 * @description
 * This module provides a centralized collection of "Smart" input components and utilities
 * designed effectively primarily to handle:
 * 1. Automatic LTR/RTL text direction switching (Critical for Arabic support).
 * 2. Standardized validation and input masking for Phones and Emails.
 * 3. Consistent styling and behavior across the application.
 * 4. Smart autocomplete with ghost text suggestions.
 *
 * @guidelines
 * - **ALWAYS** use `SmartInput` for generic text fields (Name, Address, Notes).
 * - **ALWAYS** use `SmartPhoneInput` for telephone numbers.
 * - **ALWAYS** use `SmartEmailInput` for email addresses.
 * - **ALWAYS** use `SmartAutocomplete` for search fields with suggestions.
 * - **ALWAYS** use helper functions (`isValidEmail`, `cleanPhone`) instead of writing custom Regex.
 * - **NEVER** use standard HTML `<input>` directly for form fields unless absolutely necessary.
 */

// --- Hooks ---

/**
 * A hook that automatically detects the text direction ('ltr' or 'rtl') based on the content.
 * 
 * @usage
 * Use this hook when building custom components that need to adapt to user input language.
 * 
 * @example
 * ```tsx
 * const dir = useSmartDirection(value, placeholder);
 * <input dir={dir} ... />
 * ```
 * 
 * @param text - The primary text to analyze (usually the input value).
 * @param placeholder - Fallback text to analyze if the primary text is empty.
 * @returns 'rtl' if Arabic characters are detected, otherwise 'ltr'.
 */
export const useSmartDirection = (text: string | undefined | null, placeholder?: string | undefined | null): 'rtl' | 'ltr' => {
  return useMemo(() => {
    if (text) return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
    if (placeholder) return /[\u0600-\u06FF]/.test(placeholder) ? 'rtl' : 'ltr';
    return 'ltr';
  }, [text, placeholder]);
};

// --- Utils ---

/**
 * Validates an email address against the RFC 5322 official standard.
 * 
 * @usage Use this for all email validation logic in the app.
 * @param email - The email string to validate.
 * @returns `true` if valid, `false` otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  // RFC 5322 official standard regex for email validation
  // Allows alphanumeric, dots, underscores, hyphens, and standard domains
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

/**
 * Validates a phone number format.
 * Allows digits, spaces, and the characters: +, -, (, ).
 * Enforces a length between 5 and 20 characters.
 * 
 * @usage Use this for all phone number validation logic.
 * @param phone - The phone string to validate.
 * @returns `true` if valid, `false` otherwise.
 */
export const isValidPhone = (phone: string): boolean => {
  // Allows numbers, spaces, +, -, (, )
  // Must contain at least 5 digits
  const phoneRegex = /^[\d\s+\-()]{5,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Strips all non-numeric characters from a phone string, preserving only the leading '+'.
 * 
 * @usage Use this before sending phone numbers to the API.
 * @param phone - The raw phone input string.
 * @returns A clean string containing only digits and optional leading '+'.
 */
export const cleanPhone = (phone: string): string => {
  // Removes all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

// --- Components ---

interface SmartInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value?: string | number | readonly string[] | undefined;
}

/**
 * **SmartInput Component**
 * 
 * A wrapper around the native input element that automatically sets the `dir` attribute (LTR/RTL)
 * based on the input value.
 * 
 * @usage
 * Use this component for **ALL** generic free-text fields where the user might type in English or Arabic.
 * Examples: Customer Name, Address, Product Description, Notes, Comments.
 * 
 * @example
 * <SmartInput 
 *   value={name} 
 *   onChange={(e) => setName(e.target.value)} 
 *   placeholder={t.enterName} 
 * />
 * 
 * @restricted
 * Do NOT use this for:
 * - Emails (Use `SmartEmailInput`)
 * - Phone Numbers (Use `SmartPhoneInput`)
 * - Numeric Codes/Barcodes (Use standard `<input dir="ltr" />`)
 * - Search with autocomplete (Use `SmartAutocomplete`)
 */
export const SmartInput: React.FC<SmartInputProps> = ({ value, className, placeholder, ...props }) => {
  // We cast value to string to keep useSmartDirection happy, 
  // though it handles non-string types gracefully if they are falsy.
  // If value is undefined, it defaults to LTR.
  // Now also passes placeholder so empty inputs with Arabic placeholders show RTL
  const dir = useSmartDirection(typeof value === 'string' ? value : String(value || ''), placeholder);

  return (
    <input
      {...props}
      value={value}
      placeholder={placeholder}
      dir={dir} // Calculated direction takes precedence, but props.dir would be overridden here.
      className={className}
    />
  );
};

interface SmartDateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * **SmartDateInput Component**
 * 
 * A masked input component for handling dates in `MM/YY` format, which converts to `YYYY-MM-DD`.
 * Ideal for Expiry Dates (Credit Cards, Drug Expiration) where day is assumed to be end-of-month.
 * 
 * @usage
 * Use for credit card expiry or simple month/year inputs.
 * 
 * @param value - ISO Date String (YYYY-MM-DD)
 * @param onChange - Returns the full ISO Date String (YYYY-MM-DD)
 */
export const SmartDateInput: React.FC<SmartDateInputProps> = ({
  value,
  onChange,
  className,
  required,
  placeholder,
  style
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to format YYYY-MM-DD to MM/YY
  const formatToDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const [year, month] = dateStr.split('-');
      if (!year || !month) return '';
      return `${month}/${year.slice(2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to format YYYY-MM-DD to MMYY (for editing)
  const formatToEdit = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const [year, month] = dateStr.split('-');
      if (!year || !month) return '';
      return `${month}${year.slice(2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Initialize display value based on current prop value
  useEffect(() => {
    if (isFocused) {
      setDisplayValue(formatToEdit(value));
    } else {
      setDisplayValue(formatToDisplay(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(formatToEdit(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Parse the input value (MMYY)
    const cleanValue = displayValue.replace(/\D/g, ''); // Remove non-digits
    
    if (cleanValue.length === 4) {
      const monthStr = cleanValue.slice(0, 2);
      const yearStr = cleanValue.slice(2);
      
      const month = parseInt(monthStr, 10);
      const year = 2000 + parseInt(yearStr, 10); // Assume 20xx
      
      if (month >= 1 && month <= 12) {
        // Get last day of the month
        const lastDay = new Date(year, month, 0).getDate();
        const formattedDate = `${year}-${monthStr.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        onChange(formattedDate);
        setDisplayValue(formatToDisplay(formattedDate));
        return;
      }
    }
    
    // If invalid or empty, revert/clear
    if (!cleanValue) {
      onChange('');
    } else {
      // If invalid format but not empty, maybe keep it or reset? 
      // For now, let's reset to previous valid value if parsing fails
      setDisplayValue(formatToDisplay(value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and limit to 4 chars
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setDisplayValue(val);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className={className}
      style={style}
      required={required}
      placeholder={isFocused ? "MMYY" : (placeholder || "MM/YY")}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      maxLength={4}
    />
  );
};

interface SmartSpecializedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * **SmartPhoneInput Component**
 * 
 * An input designed specifically for phone numbers.
 * - Enforces **LTR** direction always.
 * - Automatically finds invalid characters and strips them out.
 * - Allows only: digits, spaces, `+`, `-`, `(`, `)`.
 * 
 * @usage
 * **ALWAYS** use this component for phone number fields.
 */
export const SmartPhoneInput: React.FC<SmartSpecializedInputProps> = ({ value, onChange, className, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Regex: Optional + at start, then digits, spaces, or dashes, parens
    // This regex checks the *entire* string logic we want to ALLOW during typing.
    // However, for strict input masking, it's better to replace invalid chars.
    
    // Strategy: Remove any character that is NOT in the allowed set.
    // Allowed: 0-9, space, +, -, (, )
    const validVal = val.replace(/[^0-9\s+\-()]/g, '');
    
    // Call parent with cleansed value
    onChange(validVal);
  };

  return (
    <input
      {...props}
      type="tel" // optimized mobile keyboard
      dir="ltr"
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
};

/**
 * **SmartEmailInput Component**
 * 
 * An input designed specifically for email addresses.
 * - Enforces **LTR** direction always.
 * - Automatically finds invalid characters and strips them out.
 * - Allows only: English letters, numbers, `@`, `.`, `_`, `-`, `+`.
 * 
 * @usage
 * **ALWAYS** use this component for email fields.
 */
export const SmartEmailInput: React.FC<SmartSpecializedInputProps> = ({ value, onChange, className, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Strategy: Remove any character that is NOT in the allowed set.
    // Allowed: a-z, A-Z, 0-9, @, ., _, -, +
    const validVal = val.replace(/[^a-zA-Z0-9@._\-+]/g, '');
    
    onChange(validVal);
  };

  return (
    <input
      {...props}
      type="email"
      dir="ltr"
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
};

// --- Smart Autocomplete ---

export interface SmartAutocompleteProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ghostTextClassName?: string;
  debounceMs?: number;
  caseSensitive?: boolean;
  onSuggestionAccept?: (suggestion: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  color?: string; // Theme color (default: 'blue')
}

/**
 * **SmartAutocomplete Component**
 * 
 * An intelligent autocomplete input with ghost text suggestions.
 * - Shows inline suggestion as semi-transparent text overlay
 * - Automatically detects RTL/LTR direction
 * - Keyboard shortcuts: Tab/→ to accept, Escape to reject
 * - Debounced suggestion calculation
 * 
 * @usage
 * Use for search fields where you want to provide inline suggestions.
 * 
 * @example
 * <SmartAutocomplete
 *   value={search}
 *   onChange={setSearch}
 *   suggestions={drugNames}
 *   placeholder="Search..."
 * />
 */
export const SmartAutocomplete: React.FC<SmartAutocompleteProps> = ({
  value,
  onChange,
  suggestions,
  placeholder = '',
  disabled = false,
  className = '',
  ghostTextClassName = '',
  debounceMs = 100,
  caseSensitive = false,
  onSuggestionAccept,
  inputRef: externalRef,
  color = 'blue',
  ...restProps
}) => {
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [debouncedValue, setDebouncedValue] = useState(value);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-detect text direction
  const dir = useSmartDirection(value, placeholder);

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Calculate suggestion based on current input
  const suggestion = useMemo(() => {
    if (!debouncedValue || disabled) return '';

    const searchValue = caseSensitive ? debouncedValue : debouncedValue.toLowerCase();
    
    const match = suggestions.find(s => {
      const suggestionValue = caseSensitive ? s : s.toLowerCase();
      return suggestionValue.startsWith(searchValue) && suggestionValue !== searchValue;
    });

    return match || '';
  }, [debouncedValue, suggestions, caseSensitive, disabled]);

  // Update current suggestion
  useEffect(() => {
    setCurrentSuggestion(suggestion);
  }, [suggestion]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (currentSuggestion) {
      // Accept suggestion with Tab or Right Arrow
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(currentSuggestion);
        setCurrentSuggestion('');
        onSuggestionAccept?.(currentSuggestion);
      }
      // Reject suggestion with Escape
      else if (e.key === 'Escape') {
        e.preventDefault();
        setCurrentSuggestion('');
      }
    }

    // Call original onKeyDown if provided
    restProps.onKeyDown?.(e);
  };

  // Calculate ghost text (the remaining part of the suggestion)
  const ghostText = useMemo(() => {
    if (!currentSuggestion || !value) return '';
    
    const valueToCompare = caseSensitive ? value : value.toLowerCase();
    const suggestionToCompare = caseSensitive ? currentSuggestion : currentSuggestion.toLowerCase();
    
    if (suggestionToCompare.startsWith(valueToCompare)) {
      return currentSuggestion.slice(value.length);
    }
    
    return '';
  }, [currentSuggestion, value, caseSensitive]);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Actual Input with Smart Direction */}
      <input
        {...restProps}
        ref={inputRef}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        className={`
          w-full px-3 py-2.5 rounded-xl
          bg-white dark:bg-gray-900
          border border-gray-200 dark:border-gray-800
          hover:border-gray-300 dark:hover:border-gray-700
          focus:outline-none focus:ring-0
          focus:border-${color}-500 dark:focus:border-${color}-400
          focus:hover:border-${color}-500 dark:focus:hover:border-${color}-400
          text-gray-900 dark:text-gray-100 placeholder-gray-400
          shadow-sm ${className}
        `}
      />
      
      {/* Ghost Text Overlay - Badge Style */}
      {ghostText && (
        <div
          className={`absolute inset-0 pointer-events-none flex items-center ${ghostTextClassName}`}
          style={{
            paddingLeft: inputRef.current?.style.paddingLeft || '0.75rem',
            paddingRight: inputRef.current?.style.paddingRight || '0.75rem',
            direction: dir, // Match input direction
          }}
        >
          {/* Invisible spacer matching the actual input value */}
          <span className="invisible whitespace-pre">{value}</span>
          
          {/* Visible ghost text as a Badge */}
          <span className={`
            inline-flex items-center px-0.5 py-0.5 ms-1
            rounded-lg border border-gray-200 dark:border-gray-800 
            bg-gray-50/50 dark:bg-gray-800/50 
            text-sm font-bold tracking-tight
            text-gray-400 dark:text-gray-500 
            transition-all animate-in fade-in zoom-in duration-200
          `}>
            {ghostText}
          </span>
        </div>
      )}
    </div>
  );
};

// --- Drug Search Input ---

export interface DrugSearchInputProps extends Omit<SmartAutocompleteProps, 'onKeyDown'> {
  onEnter?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * **DrugSearchInput Component**
 * 
 * A specialized search input for drug/product searches.
 * - Wraps SmartAutocomplete with Enter-to-add callback
 * - Autocomplete suggestions (optional)
 * - RTL/LTR auto-detection
 * 
 * @usage
 * Use for all drug search fields in POS and Purchases.
 * 
 * @example
 * <DrugSearchInput
 *   value={search}
 *   onChange={setSearch}
 *   suggestions={drugNames}
 *   onEnter={() => addFirstItem()}
 *   placeholder="Search..."
 * />
 */
export const DrugSearchInput: React.FC<DrugSearchInputProps> = ({
  onEnter,
  onKeyDown,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Call custom handler first
    onKeyDown?.(e);
    
    // Then handle Enter
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <SmartAutocomplete
      {...props}
      onKeyDown={handleKeyDown}
    />
  );
};
