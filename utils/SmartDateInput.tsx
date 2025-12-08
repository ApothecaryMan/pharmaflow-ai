import React, { useState, useEffect, useRef } from 'react';

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
