import React from 'react';

interface PageButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: string;
  title: string;
}

export const PageButton = ({ onClick, disabled, icon, title }: PageButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:enabled:text-(--text-primary) hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 disabled:opacity-10'
    title={title}
  >
    <span className='material-symbols-rounded leading-none' style={{ fontSize: '18px' }}>
      {icon}
    </span>
  </button>
);
