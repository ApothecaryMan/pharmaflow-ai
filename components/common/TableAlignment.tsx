import type React from 'react';

export type Alignment = 'start' | 'center' | 'end';

interface AlignButtonProps {
  align: Alignment;
  isActive: boolean;
  onClick: () => void;
  isRtl?: boolean;
}

export const AlignButton: React.FC<AlignButtonProps> = ({ align, isActive, onClick, isRtl }) => {
  const activeClass =
    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md ring-1 ring-emerald-400/50 dark:ring-emerald-500/50';
  const inactiveClass =
    'text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-700/50';

  let iconName = '';
  if (align === 'center') {
    iconName = 'align_horizontal_center';
  } else if (align === 'start') {
    iconName = isRtl ? 'align_horizontal_right' : 'align_horizontal_left';
  } else {
    // end
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
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <span className='material-symbols-rounded text-[20px]'>{iconName}</span>
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
  return align === 'center' ? 'text-center' : align === 'end' ? 'text-end' : 'text-start';
};

export const getItemsAlignClass = (align: Alignment) => {
  return align === 'center' ? 'items-center' : align === 'end' ? 'items-end' : 'items-start';
};
