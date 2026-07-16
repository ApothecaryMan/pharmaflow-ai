import React from 'react';

interface FeralSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  labelPosition?: 'inside' | 'outside';
  unit?: string;
}

export const FeralSlider = React.memo<FeralSliderProps>(({
  label,
  value,
  onChange,
  labelPosition = 'outside',
  unit = '',
}) => {
  return (
    <div dir='ltr' className={`flex items-center ${labelPosition === 'outside' ? 'justify-between gap-4' : 'w-full'}`}>
      {labelPosition === 'outside' && (
        <div className='text-(--text-tertiary) text-xs font-bold tracking-wider w-20 shrink-0'>
          {label}
        </div>
      )}
      <div className='relative flex-1 h-8 bg-(--text-primary)/[0.08] rounded-xl flex items-center overflow-hidden shadow-inner group'>
        {labelPosition === 'inside' && (
          <span className='absolute left-4 text-(--text-primary) text-xs font-bold tracking-widest pointer-events-none z-20 mix-blend-overlay'>
            {label}
          </span>
        )}

        <div className='absolute inset-0 flex justify-evenly items-center pointer-events-none z-10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
          <div className='w-[1px] h-2.5 bg-white opacity-40' />
          <div className='w-[1px] h-2.5 bg-white opacity-40' />
          <div className='w-[1px] h-2.5 bg-white opacity-40' />
          <div className='w-[1px] h-2.5 bg-white opacity-40' />
          <div className='w-[1px] h-2.5 bg-white opacity-40' />
        </div>
        
        <div 
          className='absolute left-0 top-0 h-full bg-(--primary-500)/40 transition-all duration-150'
          style={{ width: `${value}%` }}
        />
        
        {value > 0 && (
          <div 
            className='absolute top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-(--text-primary) rounded-full shadow-[0_0_3px_rgba(0,0,0,0.5)] pointer-events-none transition-all duration-150 z-20'
            style={{ left: `calc(${value}% - 1.5px)` }}
          />
        )}
        
        <span className='absolute right-4 text-(--text-primary) text-sm font-semibold pointer-events-none z-20'>
          {value}{unit}
        </span>
        
        <input
          type='range'
          min='0'
          max='100'
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          dir='ltr'
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30'
        />
      </div>
    </div>
  );
});
