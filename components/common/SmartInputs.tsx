import React, { InputHTMLAttributes, useState, useEffect, useRef, useMemo } from 'react';

// --- Hooks ---

/**
 * Returns 'rtl' if the text contains Arabic characters, otherwise 'ltr'.
 * @param text The input text to analyze
 * @returns 'rtl' | 'ltr'
 */
export const useSmartDirection = (text: string | undefined | null, placeholder?: string | undefined | null): 'rtl' | 'ltr' => {
  return useMemo(() => {
    if (text) return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
    if (placeholder) return /[\u0600-\u06FF]/.test(placeholder) ? 'rtl' : 'ltr';
    return 'ltr';
  }, [text, placeholder]);
};

// --- Utils ---

export const isValidEmail = (email: string): boolean => {
  // RFC 5322 official standard regex for email validation
  // Allows alphanumeric, dots, underscores, hyphens, and standard domains
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Allows numbers, spaces, +, -, (, )
  // Must contain at least 5 digits
  const phoneRegex = /^[\d\s+\-()]{5,20}$/;
  return phoneRegex.test(phone);
};

export const cleanPhone = (phone: string): string => {
  // Removes all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

// --- Components ---

interface SmartInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value?: string | number | readonly string[] | undefined;
}

/**
 * A wrapper around the native input element that automatically adjusts
 * the text direction (LTR/RTL) based on the content.
 * 
 * Use this for all free-text input fields (names, addresses, comments, etc.).
 * Do NOT use this for emails, phone numbers, codes, or other strictly LTR fields.
 */
export const SmartInput: React.FC<SmartInputProps> = ({ value, className, ...props }) => {
  // We cast value to string to keep useSmartDirection happy, 
  // though it handles non-string types gracefully if they are falsy.
  // If value is undefined, it defaults to LTR.
  const dir = useSmartDirection(typeof value === 'string' ? value : String(value || ''));

  return (
    <input
      {...props}
      value={value}
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
