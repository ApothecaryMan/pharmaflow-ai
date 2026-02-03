import type React from 'react';

export interface FloatingInputProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  inputClassName?: string;
  labelBgClassName?: string;
  min?: string | number;
  max?: string | number;
  title?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  maxLength?: number;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
  inputClassName = '',
  labelBgClassName = 'bg-gray-50 dark:bg-gray-800',
  min,
  max,
  title,
  onFocus,
  onBlur,
  maxLength,
  placeholder = ' ',
  onKeyDown,
  inputRef,
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type={type}
        onKeyDown={onKeyDown}
        className={`block px-2 pb-1 pt-2 w-full text-xs font-medium text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer ${inputClassName}`}
        placeholder={placeholder}
        value={value === 0 ? '' : value}
        onChange={onChange}
        min={min}
        max={max}
        title={title}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
      />
      <label
        className={`absolute text-[11px] text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-2.5 scale-75 top-1 z-10 origin-[0] ${labelBgClassName} px-1 peer-focus:px-1 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1 peer-focus:scale-75 peer-focus:-translate-y-2.5 left-1 pointer-events-none font-bold tracking-wide`}
      >
        {label}
      </label>
    </div>
  );
};
