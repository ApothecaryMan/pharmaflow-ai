import React from 'react';

export type Alignment = 'left' | 'center' | 'right';

interface AlignButtonProps {
  align: Alignment;
  isActive: boolean;
  onClick: () => void;
}

export const AlignButton: React.FC<AlignButtonProps> = ({ align, isActive, onClick }) => {
  const activeClass = 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 dark:ring-emerald-500';
  const inactiveClass = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`Align ${align}`}
      aria-pressed={isActive}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <span 
        className="material-symbols-rounded text-[18px]" 
        style={{ direction: 'ltr' }}
      >
        {align === 'left' ? 'format_align_left' : align === 'center' ? 'format_align_center' : 'format_align_right'}
      </span>
    </button>
  );
};

export const getHeaderJustifyClass = (align: Alignment, isRtl: boolean) => {
  if (align === 'center') {
    return 'justify-center';
  } else if (align === 'right') {
    // Right Align: In RTL this is 'justify-start', in LTR 'justify-end'
    return isRtl ? 'justify-start' : 'justify-end';
  } else {
    // Left Align: In RTL this is 'justify-end', in LTR 'justify-start'
    return isRtl ? 'justify-end' : 'justify-start';
  }
};

export const getTextAlignClass = (align: Alignment) => {
  return align === 'center' 
    ? 'text-center' 
    : align === 'right' ? 'text-right' : 'text-left';
};
