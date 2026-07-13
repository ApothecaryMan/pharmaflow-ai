import React from 'react';

export interface PillSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  thumbClass?: string;
  backgroundStyle?: React.CSSProperties;
  formatValue?: (value: number) => React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const PillSlider = React.memo<PillSliderProps>(({ 
  min, 
  max, 
  step = 1, 
  value, 
  onChange, 
  thumbClass = '[&::-webkit-slider-thumb]:bg-(--primary-500)', 
  backgroundStyle, 
  formatValue, 
  disabled,
  className = 'w-32'
}) => {
  const fraction = (value - min) / (max - min) || 0;
  const percent = fraction * 100;

  return (
    <div className={`relative flex items-center ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <input
        dir='ltr'
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 bg-(--border-divider) appearance-none outline-none relative z-10
          [&::-webkit-slider-thumb]:appearance-none 
          [&::-webkit-slider-thumb]:w-8 
          [&::-webkit-slider-thumb]:h-4.5 
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          dark:[&::-webkit-slider-thumb]:border-(--bg-menu)
          ${thumbClass}`}
        style={backgroundStyle}
      />
      <div
        className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center justify-center text-[9px] font-bold text-white tabular-nums drop-shadow-sm'
        style={{
          left: `calc(${percent}% - ${fraction * 32}px + 16px)`,
          width: '32px',
          height: '18px',
        }}
      >
        {formatValue ? formatValue(value) : value}
      </div>
    </div>
  );
});
