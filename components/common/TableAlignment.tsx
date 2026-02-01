import React from 'react';

export type Alignment = 'start' | 'center' | 'end';

interface AlignButtonProps {
  align: Alignment;
  isActive: boolean;
  onClick: () => void;
  isRtl?: boolean;
}

export const AlignButton: React.FC<AlignButtonProps> = ({ align, isActive, onClick, isRtl }) => {
  const activeClass = 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 dark:ring-emerald-500';
  const inactiveClass = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50';

  let iconName = '';
  if (align === 'center') {
    iconName = 'align_horizontal_center';
  } else if (align === 'start') {
    iconName = isRtl ? 'align_horizontal_right' : 'align_horizontal_left';
  } else { // end
    iconName = isRtl ? 'align_horizontal_left' : 'align_horizontal_right';
  }

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
      >
        {iconName}
      </span>
    </button>
  );
};

export const getHeaderJustifyClass = (align: Alignment) => {
  if (align === 'center') {
    return 'justify-center';
  } else if (align === 'end') {
    // End -> aligns to the end of the container (Right in LTR, Left in RTL)
    return 'justify-end';
  } else {
    // Start -> aligns to the start of the container (Left in LTR, Right in RTL)
    return 'justify-start';
  }
};

export const getTextAlignClass = (align: Alignment) => {
  return align === 'center' 
    ? 'text-center' 
    : align === 'end' ? 'text-end' : 'text-start';
};

export const getItemsAlignClass = (align: Alignment) => {
  return align === 'center' 
    ? 'items-center' 
    : align === 'end' ? 'items-end' : 'items-start';
};

