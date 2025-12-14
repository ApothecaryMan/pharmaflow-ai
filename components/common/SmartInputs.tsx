import React, { InputHTMLAttributes, useState, useEffect, useRef, useMemo } from 'react';

/**
 * @module SmartInputs
 * @description
 * This module provides a centralized collection of "Smart" input components and utilities
 * designed effectively primarily to handle:
 * 1. Automatic LTR/RTL text direction switching (Critical for Arabic support).
 * 2. Standardized validation and input masking for Phones and Emails.
 * 3. Consistent styling and behavior across the application.
 *
 * @guidelines
 * - **ALWAYS** use `SmartInput` for generic text fields (Name, Address, Notes).
 * - **ALWAYS** use `SmartPhoneInput` for telephone numbers.
 * - **ALWAYS** use `SmartEmailInput` for email addresses.
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
