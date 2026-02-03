import type React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  theme?: string;
  disabled?: boolean;
  activeColor?: string; // Hex color for checked state (bypasses tailwind safelist issues)
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  className = '',
  theme = 'emerald',
  disabled = false,
  activeColor,
}) => {
  return (
    <button
      type='button'
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        WebkitAppearance: 'none',
        appearance: 'none',
        width: '48px',
        minWidth: '48px',
        height: '24px',
        minHeight: '24px',
        backgroundColor: checked && activeColor ? activeColor : undefined,
      }}
      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? (!activeColor ? `bg-${theme}-600` : '') : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <div
        className={`absolute top-1 start-1 w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-200 ease-in-out ${
          checked ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
        }`}
      >
        {checked ? (
          <svg
            className={`w-3 h-3 ${!activeColor ? `text-${theme}-600` : ''}`}
            style={{ color: activeColor }}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='3' d='M5 13l4 4L19 7' />
          </svg>
        ) : (
          <svg
            className='w-3 h-3 text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='3'
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        )}
      </div>
    </button>
  );
};
