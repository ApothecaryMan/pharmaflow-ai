import React, { InputHTMLAttributes } from 'react';
import { useSmartDirection } from '../hooks/useSmartDirection';

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
