import type React from 'react';

interface HoverDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  panelWidth?: string;
  panelClassName?: string;
}

export const HoverDropdown: React.FC<HoverDropdownProps> = ({
  trigger,
  children,
  panelWidth,
  panelClassName = '',
}) => {
  return (
    <div className='group relative inline-block'>
      {trigger}
      <div className='absolute right-0 rtl:left-0 rtl:right-auto top-full z-60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200'>
        <div className='h-1.5' />
        <div
          className={`bg-(--bg-card) border border-(--border-divider) rounded-lg shadow-xl p-1 ${panelWidth || 'min-w-[80px]'} ${panelClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
